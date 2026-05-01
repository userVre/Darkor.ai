import {NativeModules, Platform} from "react-native";

import type {DiamondPackId, PricingTierId} from "./dynamic-pricing";

export const REVENUECAT_ENTITLEMENT = "pro";
export const REVENUECAT_WEEKLY_PRO_ENTITLEMENT = "weekly_pro";
export const REVENUECAT_ANNUAL_PRO_ENTITLEMENT = "annual_pro";
export const REVENUECAT_ENTITLEMENTS = [
  REVENUECAT_ANNUAL_PRO_ENTITLEMENT,
  REVENUECAT_WEEKLY_PRO_ENTITLEMENT,
] as const;
export const REVENUECAT_PAYWALL_PLACEMENT = "paywall";

export type RevenueCatCustomerInfo = import("react-native-purchases").CustomerInfo;
export type RevenueCatPackage = import("react-native-purchases").PurchasesPackage;
export type RevenueCatPurchases = (typeof import("react-native-purchases"))["default"];
export type RevenueCatPurchaseResult = Awaited<ReturnType<RevenueCatPurchases["purchasePackage"]>>;
export type BillingPlan = "pro" | "trial";
export type BillingDuration = "weekly" | "yearly";
export type RevenueCatEntitlement = (typeof REVENUECAT_ENTITLEMENTS)[number] | "free";
export type RevenueCatTierContext = {
  tierId: PricingTierId;
  countryCode: string;
  currencyCode: string;
  offeringHint?: string | null;
  priceMetadata?: Record<string, string>;
  attributePayload?: Record<string, string>;
  productIdentifiers?: {
    subscriptions?: Partial<Record<BillingDuration, string>>;
    diamondPacks?: Partial<Record<DiamondPackId, string>>;
  };
};

type CachedTieredOfferings = {
  offering: Awaited<ReturnType<RevenueCatPurchases["getCurrentOfferingForPlacement"]>> | null;
  packages: RevenueCatPackage[];
};

const DIAMOND_PACK_MATCHERS: Record<DiamondPackId, string[]> = {
  starter: ["starter", "10", "10diamond", "10_diamond", "diamond10", "credit10"],
  designer: ["designer", "30", "30diamond", "30_diamond", "diamond30", "credit30"],
  architect: ["architect", "100", "100diamond", "100_diamond", "diamond100", "credit100"],
  estate: ["estate", "300", "300diamond", "300_diamond", "diamond300", "credit300", "bestvalue", "best_value"],
};

let purchasesClient: RevenueCatPurchases | null = null;
let purchasesModulePromise: Promise<typeof import("react-native-purchases")> | null = null;
const tieredOfferingsCache = new Map<string, CachedTieredOfferings>();
const REVENUECAT_ATTRIBUTE_KEY_MAX_LENGTH = 40;
const REVENUECAT_ATTRIBUTE_VALUE_MAX_LENGTH = 500;
const REVENUECAT_ATTRIBUTE_KEY_PATTERN = /^[A-Za-z0-9_]+$/;
const REVENUECAT_ATTRIBUTE_KEY_ALIASES: Record<string, string> = {
  homedecor_subscription_generation_quality: "homedecor_subscription_quality",
};

function hasRevenueCatNativeModule() {
  return Boolean((NativeModules as { RNPurchases?: unknown }).RNPurchases);
}

async function loadPurchasesModule() {
  if (!hasRevenueCatNativeModule()) {
    console.warn("[RevenueCat] Native module not found. Skipping configuration.");
    return null;
  }
  if (!purchasesModulePromise) {
    purchasesModulePromise = import("react-native-purchases");
  }
  try {
    return await purchasesModulePromise;
  } catch (error) {
    console.warn("[RevenueCat] Failed to load module.", error);
    purchasesModulePromise = null;
    return null;
  }
}

function normalizeHaystack(values: Array<string | null | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeToken(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function sanitizeRevenueCatAttributes(attributes: Record<string, string | number | boolean | null | undefined>) {
  const sanitized: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(attributes)) {
    const key = REVENUECAT_ATTRIBUTE_KEY_ALIASES[rawKey] ?? rawKey;
    if (
      key.length === 0
      || key.length > REVENUECAT_ATTRIBUTE_KEY_MAX_LENGTH
      || !REVENUECAT_ATTRIBUTE_KEY_PATTERN.test(key)
    ) {
      console.warn("[RevenueCat] Dropping invalid subscriber attribute key", rawKey);
      continue;
    }

    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    const value = String(rawValue).slice(0, REVENUECAT_ATTRIBUTE_VALUE_MAX_LENGTH);
    sanitized[key] = value;
  }

  return sanitized;
}

function getPackageHaystack(pkg?: RevenueCatPackage | null) {
  if (!pkg) return "";
  return normalizeHaystack([
    pkg.identifier,
    pkg.packageType,
    pkg.product.identifier,
    pkg.product.title,
    pkg.product.description,
  ]);
}

function matchesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => needle.length > 0 && haystack.includes(needle));
}

function getExpectedSubscriptionProductIds(
  tierContext: RevenueCatTierContext | null | undefined,
  duration: BillingDuration,
) {
  return [
    tierContext?.productIdentifiers?.subscriptions?.[duration],
    tierContext?.priceMetadata?.[`homedecor_${duration}_product_id`],
    tierContext?.attributePayload?.[`homedecor_${duration}_product_id`],
  ]
    .map(normalizeToken)
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function getExpectedDiamondProductIds(
  tierContext: RevenueCatTierContext | null | undefined,
  packId: DiamondPackId,
) {
  const diamondCount = packId === "starter" ? 10 : packId === "designer" ? 30 : packId === "architect" ? 100 : 300;
  const metadataKey = `homedecor_diamond_${diamondCount}_product_id`;
  return [
    tierContext?.productIdentifiers?.diamondPacks?.[packId],
    tierContext?.priceMetadata?.[metadataKey],
    tierContext?.attributePayload?.[metadataKey],
  ]
    .map(normalizeToken)
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function packageMatchesExpectedProductId(pkg: RevenueCatPackage, expectedProductIds: string[]) {
  if (expectedProductIds.length === 0) {
    return false;
  }

  const normalizedProductIdentifier = normalizeToken(pkg.product.identifier);
  const normalizedPackageIdentifier = normalizeToken(pkg.identifier);
  return expectedProductIds.some(
    (productId) => normalizedProductIdentifier === productId || normalizedPackageIdentifier === productId,
  );
}

function inferDiamondPackIdFromHaystack(haystack: string): DiamondPackId | null {
  const ranked = (Object.entries(DIAMOND_PACK_MATCHERS) as Array<[DiamondPackId, string[]]>)
    .map(([packId, needles]) => ({
      packId,
      score: needles.reduce((total, needle) => total + (haystack.includes(needle) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.packId ?? null;
}

function getAllPackagesFromOfferings(
  offerings: Awaited<ReturnType<RevenueCatPurchases["getOfferings"]>>,
) {
  const allPackages = Object.values(offerings.all ?? {}).flatMap((offering) => offering?.availablePackages ?? []);
  const currentPackages = offerings.current?.availablePackages ?? [];
  const uniquePackages = new Map<string, RevenueCatPackage>();

  for (const pkg of [...allPackages, ...currentPackages]) {
    uniquePackages.set(pkg.identifier, pkg);
  }

  return Array.from(uniquePackages.values());
}

function getOfferingAliases(tierContext?: RevenueCatTierContext | null) {
  const normalizedTierId = normalizeToken(tierContext?.tierId);
  const normalizedHint = normalizeToken(tierContext?.offeringHint);
  const normalizedCountryCode = normalizeToken(tierContext?.countryCode);
  const normalizedCurrencyCode = normalizeToken(tierContext?.currencyCode);

  return [
    normalizedHint,
    normalizedCountryCode,
    normalizedCountryCode ? `paywall_${normalizedCountryCode}` : "",
    normalizedCountryCode ? `${normalizedCountryCode}_paywall` : "",
    normalizedCountryCode ? `country_${normalizedCountryCode}` : "",
    normalizedCountryCode ? `region_${normalizedCountryCode}` : "",
    normalizedTierId,
    normalizedTierId ? `paywall_${normalizedTierId}` : "",
    normalizedTierId ? `${normalizedTierId}_paywall` : "",
    normalizedTierId ? `${normalizedTierId}_offering` : "",
    normalizedCountryCode && normalizedTierId ? `${normalizedCountryCode}_${normalizedTierId}` : "",
    normalizedCountryCode && normalizedTierId ? `${normalizedTierId}_${normalizedCountryCode}` : "",
    normalizedCurrencyCode && normalizedTierId ? `${normalizedCurrencyCode}_${normalizedTierId}` : "",
    normalizedCurrencyCode && normalizedTierId ? `${normalizedTierId}_${normalizedCurrencyCode}` : "",
  ].filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function getTierContextCacheKey(tierContext?: RevenueCatTierContext | null) {
  return [
    normalizeToken(tierContext?.tierId),
    normalizeToken(tierContext?.countryCode),
    normalizeToken(tierContext?.currencyCode),
    normalizeToken(tierContext?.offeringHint),
  ].join(":");
}

function resolveOfferingFromHints(
  offerings: Awaited<ReturnType<RevenueCatPurchases["getOfferings"]>>,
  tierContext?: RevenueCatTierContext | null,
) {
  const aliases = getOfferingAliases(tierContext);
  for (const alias of aliases) {
    for (const [key, offering] of Object.entries(offerings.all ?? {})) {
      if (normalizeToken(key) === alias) {
        return offering;
      }
    }
  }

  return offerings.current ?? null;
}

function inferDurationFromHaystack(haystack: string): BillingDuration {
  if (matchesAny(haystack, ["annual", "year", "yearly", "best offer"])) {
    return "yearly";
  }
  return "weekly";
}

function getHomeDecorEntitlementRecord(info?: RevenueCatCustomerInfo | null) {
  const active = (info?.entitlements?.active ?? {}) as Record<string, any>;
  const activeEntries = Object.entries(active);
  if (activeEntries.length === 0) {
    return null;
  }

  for (const entitlement of REVENUECAT_ENTITLEMENTS) {
    const exact = active[entitlement];
    if (exact) {
      return {
        entitlement,
        record: exact,
      } as const;
    }
  }

  for (const [key, value] of activeEntries) {
    const normalizedKey = normalizeToken(key);
    if (normalizedKey === REVENUECAT_ANNUAL_PRO_ENTITLEMENT || normalizedKey === REVENUECAT_WEEKLY_PRO_ENTITLEMENT) {
      return {
        entitlement: normalizedKey as Exclude<RevenueCatEntitlement, "free">,
        record: value,
      } as const;
    }
  }

  return null;
}

function parseRevenueCatDate(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function inferRevenueCatEntitlementFromCustomerInfo(info?: RevenueCatCustomerInfo | null): RevenueCatEntitlement {
  return getHomeDecorEntitlementRecord(info)?.entitlement ?? "free";
}

export function resolveRevenueCatSubscription(info?: RevenueCatCustomerInfo | null): {
  hasSubscription: boolean;
  entitlement: RevenueCatEntitlement;
  plan: "pro" | "trial" | "free";
  subscriptionType: BillingDuration | "free";
  purchasedAt: number | null;
  subscriptionEnd: number | null;
} {
  const active = getHomeDecorEntitlementRecord(info);
  const entitlement: RevenueCatEntitlement = active?.entitlement ?? "free";
  const hasSubscription = Boolean(active);
  const normalizedPeriodType = normalizeToken(active?.record?.periodType);
  const purchasedAt = active
    ? parseRevenueCatDate(
        active.record?.latestPurchaseDateMillis
        ?? active.record?.originalPurchaseDateMillis
        ?? active.record?.latestPurchaseDate
        ?? active.record?.originalPurchaseDate,
      )
    : null;
  const subscriptionEnd = active
    ? parseRevenueCatDate(active.record?.expirationDateMillis ?? active.record?.expirationDate)
    : null;

  return {
    hasSubscription,
    entitlement,
    plan:
      !hasSubscription
        ? ("free" as const)
        : normalizedPeriodType === "trial" || normalizedPeriodType === "intro"
          ? ("trial" as const)
          : ("pro" as const),
    subscriptionType:
      entitlement === REVENUECAT_ANNUAL_PRO_ENTITLEMENT
        ? ("yearly" as const)
        : entitlement === REVENUECAT_WEEKLY_PRO_ENTITLEMENT
          ? ("weekly" as const)
          : ("free" as const),
    purchasedAt,
    subscriptionEnd,
  };
}

export function getRevenueCatApiKey() {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  }
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
}

export async function configureRevenueCat(appUserId?: string | null) {
  if (purchasesClient) return purchasesClient;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error("Missing RevenueCat API key");
  }

  const module = await loadPurchasesModule();
  if (!module) return null;

  const Purchases = (module.default ?? module) as RevenueCatPurchases;
  Purchases.setLogLevel(module.LOG_LEVEL.INFO);
  Purchases.configure({
    apiKey,
    appUserID: appUserId ?? undefined,
  });

  purchasesClient = Purchases;
  return Purchases;
}

export async function syncRevenueCatPricingAttributes(
  purchases: RevenueCatPurchases,
  tierContext: RevenueCatTierContext,
) {
  const attributes = sanitizeRevenueCatAttributes({
    homedecor_pricing_tier: tierContext.tierId,
    homedecor_country_code: tierContext.countryCode,
    homedecor_currency_code: tierContext.currencyCode,
    ...(tierContext.priceMetadata ?? {}),
    ...(tierContext.attributePayload ?? {}),
  });

  if (Object.keys(attributes).length === 0) {
    return;
  }

  await purchases.setAttributes(attributes);
}

export async function fetchTieredPackage(
  purchases: RevenueCatPurchases,
  tierContext: RevenueCatTierContext,
) {
  await syncRevenueCatPricingAttributes(purchases, tierContext).catch((error) => {
    console.warn("[RevenueCat] Failed to sync pricing attributes", error);
  });

  const offerings = await purchases
    .syncAttributesAndOfferingsIfNeeded()
    .catch(() => purchases.getOfferings());

  const placementOffering = await purchases
    .getCurrentOfferingForPlacement(REVENUECAT_PAYWALL_PLACEMENT)
    .catch(() => null);

  const hintedOffering = resolveOfferingFromHints(offerings, tierContext);
  const offering = hintedOffering ?? placementOffering ?? offerings.current ?? null;

  const result = {
    offering,
    packages: offering?.availablePackages ?? offerings.current?.availablePackages ?? [],
  };

  tieredOfferingsCache.set(getTierContextCacheKey(tierContext), result);
  return result;
}

export async function fetchRevenueCatPackages(
  purchases: RevenueCatPurchases,
  tierContext: RevenueCatTierContext,
) {
  await syncRevenueCatPricingAttributes(purchases, tierContext).catch((error) => {
    console.warn("[RevenueCat] Failed to sync pricing attributes", error);
  });

  const offerings = await purchases
    .syncAttributesAndOfferingsIfNeeded()
    .catch(() => purchases.getOfferings());

  return getAllPackagesFromOfferings(offerings);
}

export function getCachedTieredPackage(tierContext: RevenueCatTierContext) {
  return tieredOfferingsCache.get(getTierContextCacheKey(tierContext)) ?? null;
}

export function getRevenueCatClient() {
  return purchasesClient;
}

export function hasActiveSubscription(info?: RevenueCatCustomerInfo | null) {
  return resolveRevenueCatSubscription(info).hasSubscription;
}

export function inferPlanFromRevenueCat(input?: {
  packageIdentifier?: string | null;
  productIdentifier?: string | null;
  activeSubscriptions?: string[] | null;
  entitlementPeriodType?: string | null;
}) {
  const periodType = String(input?.entitlementPeriodType ?? "").toLowerCase();
  if (periodType === "trial" || periodType === "intro") {
    return "trial" as const;
  }

  const haystack = normalizeHaystack([
    input?.packageIdentifier,
    input?.productIdentifier,
    ...(input?.activeSubscriptions ?? []),
  ]);

  if (matchesAny(haystack, ["trial", "intro"])) {
    return "trial" as const;
  }

  return "pro" as const;
}

export function inferPlanFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  return resolveRevenueCatSubscription(info).plan;
}

export function inferBillingDurationFromPackage(pkg?: RevenueCatPackage | null) {
  return inferDurationFromHaystack(getPackageHaystack(pkg));
}

export function inferBillingDurationFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  return resolveRevenueCatSubscription(info).subscriptionType;
}

export function inferSubscriptionEndFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  return resolveRevenueCatSubscription(info).subscriptionEnd;
}

export function inferPurchaseDateFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  return resolveRevenueCatSubscription(info).purchasedAt;
}

export function findRevenueCatPackage(
  packages: RevenueCatPackage[],
  duration: BillingDuration,
  tierContext?: RevenueCatTierContext | null,
) {
  const expectedProductIds = getExpectedSubscriptionProductIds(tierContext, duration);
  const ranked = packages
    .map((pkg) => {
      const haystack = getPackageHaystack(pkg);
      let score = 0;

      if (packageMatchesExpectedProductId(pkg, expectedProductIds)) score += 20;
      if (inferBillingDurationFromPackage(pkg) === duration) score += 6;
      if (duration === "yearly" && matchesAny(haystack, ["annual", "year", "yearly", "best offer"])) score += 3;
      if (duration === "weekly" && matchesAny(haystack, ["week", "weekly", "trial"])) score += 3;
      if (matchesAny(haystack, [normalizeToken(tierContext?.tierId), normalizeToken(tierContext?.countryCode)])) score += 2;
      if (matchesAny(haystack, ["pro", "studio", "premium", "homedecor"])) score += 1;

      return { pkg, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length > 0) {
    return ranked[0]?.pkg ?? null;
  }

  if (packages.length === 1) {
    return packages[0];
  }

  return null;
}

export function findRevenueCatDiamondPackage(
  packages: RevenueCatPackage[],
  packId: DiamondPackId,
  tierContext?: RevenueCatTierContext | null,
) {
  const expectedProductIds = getExpectedDiamondProductIds(tierContext, packId);
  const ranked = packages
    .map((pkg) => {
      const haystack = getPackageHaystack(pkg);
      let score = 0;

      if (packageMatchesExpectedProductId(pkg, expectedProductIds)) score += 20;
      if (matchesAny(haystack, DIAMOND_PACK_MATCHERS[packId])) score += 8;
      if (matchesAny(haystack, ["diamond", "diamonds", "credit", "credits", "pack"])) score += 4;
      if (matchesAny(haystack, [normalizeToken(tierContext?.tierId), normalizeToken(tierContext?.countryCode)])) score += 2;
      if (matchesAny(haystack, ["weekly", "yearly", "annual", "trial", "subscription"])) score -= 6;

      return { pkg, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length > 0) {
    return ranked[0]?.pkg ?? null;
  }

  return null;
}

export function inferRevenueCatDiamondPackId(input?: {
  packageIdentifier?: string | null;
  productIdentifier?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const haystack = normalizeHaystack([
    input?.packageIdentifier,
    input?.productIdentifier,
    input?.title,
    input?.description,
  ]);

  if (!matchesAny(haystack, ["diamond", "diamonds", "credit", "credits", "pack", "starter_pack", "designer_pack", "architect_pack", "estate_pack"])) {
    return null;
  }

  return inferDiamondPackIdFromHaystack(haystack);
}

export function getLatestRevenueCatTransaction(
  customerInfo: RevenueCatCustomerInfo | null | undefined,
  productIdentifier: string,
) {
  const matchingTransactions = (customerInfo?.nonSubscriptionTransactions ?? [])
    .filter((transaction) => transaction.productIdentifier === productIdentifier)
    .sort((left, right) => Date.parse(right.purchaseDate) - Date.parse(left.purchaseDate));

  return matchingTransactions[0] ?? null;
}
