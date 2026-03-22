import { NativeModules, Platform } from "react-native";

export const REVENUECAT_ENTITLEMENT = "pro";

export type RevenueCatCustomerInfo = import("react-native-purchases").CustomerInfo;
export type RevenueCatPackage = import("react-native-purchases").PurchasesPackage;
export type RevenueCatPurchases = (typeof import("react-native-purchases"))["default"];
export type BillingPlan = "pro" | "trial";
export type BillingDuration = "weekly" | "yearly";

let purchasesClient: RevenueCatPurchases | null = null;
let purchasesModulePromise: Promise<typeof import("react-native-purchases")> | null = null;

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
  return needles.some((needle) => haystack.includes(needle));
}

function inferDurationFromHaystack(haystack: string): BillingDuration {
  if (matchesAny(haystack, ["annual", "year", "yearly", "best offer"])) {
    return "yearly";
  }
  return "weekly";
}

function getActiveEntitlement(info?: RevenueCatCustomerInfo | null) {
  return Object.values((info?.entitlements?.active ?? {}) as Record<string, any>)[0] as any;
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

export function getRevenueCatClient() {
  return purchasesClient;
}

export function hasActiveSubscription(info?: RevenueCatCustomerInfo | null) {
  if (!info) return false;
  if ((info.activeSubscriptions?.length ?? 0) > 0) return true;
  return Object.keys(info.entitlements?.active ?? {}).length > 0;
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
  if (!info) return "pro" as const;

  const activeEntitlement = getActiveEntitlement(info);
  return inferPlanFromRevenueCat({
    activeSubscriptions: Array.isArray(info.activeSubscriptions) ? info.activeSubscriptions : [],
    productIdentifier: activeEntitlement?.productIdentifier,
    entitlementPeriodType: activeEntitlement?.periodType,
  });
}

export function inferBillingDurationFromPackage(pkg?: RevenueCatPackage | null) {
  return inferDurationFromHaystack(getPackageHaystack(pkg));
}

export function inferBillingDurationFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  const activeEntitlement = getActiveEntitlement(info);
  const haystack = normalizeHaystack([
    activeEntitlement?.productIdentifier,
    ...(Array.isArray(info?.activeSubscriptions) ? info?.activeSubscriptions : []),
  ]);
  return inferDurationFromHaystack(haystack);
}

export function inferSubscriptionEndFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  const activeEntitlement = getActiveEntitlement(info);
  const raw = activeEntitlement?.expirationDateMillis ?? activeEntitlement?.expirationDate;
  if (typeof raw === "number") {
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

export function inferPurchaseDateFromCustomerInfo(info?: RevenueCatCustomerInfo | null) {
  const activeEntitlement = getActiveEntitlement(info);
  const raw = activeEntitlement?.latestPurchaseDateMillis
    ?? activeEntitlement?.originalPurchaseDateMillis
    ?? activeEntitlement?.latestPurchaseDate
    ?? activeEntitlement?.originalPurchaseDate;
  if (typeof raw === "number") {
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

export function findRevenueCatPackage(packages: RevenueCatPackage[], duration: BillingDuration) {
  const ranked = packages
    .map((pkg) => {
      const haystack = getPackageHaystack(pkg);
      let score = 0;

      if (inferBillingDurationFromPackage(pkg) === duration) score += 6;
      if (duration === "yearly" && matchesAny(haystack, ["annual", "year", "yearly", "best offer"])) score += 3;
      if (duration === "weekly" && matchesAny(haystack, ["week", "weekly", "trial"])) score += 3;
      if (matchesAny(haystack, ["pro", "studio", "premium", "darkor"])) score += 1;

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
