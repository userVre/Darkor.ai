import AsyncStorage from "@react-native-async-storage/async-storage";
import {getLocales, useLocales, type Locale} from "expo-localization";
import {useEffect, useMemo, useState} from "react";

import {getGeoIntelligenceSnapshot, useGeoIntelligence, type GeoIntelligenceSnapshot} from "./geo-intelligence";
import {useAppLanguagePreference} from "./i18n";
import {getLanguageLocaleTag, type AppLanguage} from "./i18n/language";

export type PricingDuration = "weekly" | "yearly";
export type PricingTierId = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5";
export type DiamondPackId = "starter" | "designer" | "architect" | "estate";
export type GenerationQualitySource = "subscription_standard_hd" | "diamond_premium";

type PriceBook = Record<PricingDuration, number>;
type DiamondPackPriceBook = Record<DiamondPackId, number | null>;

type PricingTierDefinition = {
  id: PricingTierId;
  label: "vip" | "core" | "rich" | "middle" | "mass";
  countries: readonly string[];
  usdPrices: PriceBook;
  diamondPackUsdPrices: DiamondPackPriceBook;
};

type FxSnapshot = {
  rate: number;
  source: string;
};

type LiveRateOverride = {
  rate: number;
  source: string;
  fetchedAt?: number;
};

type StoredPricingSnapshot = {
  countryCode: string;
  currencyCode: string;
  exchangeRate: number;
  exchangeRateSource: string;
  fetchedAt: number;
  tierId: PricingTierId;
};

export type LocalizedPrice = {
  amount: number;
  currencyCode: string;
  formatted: string;
  fractionDigits: number;
  source: "fx_snapshot" | "store" | "tier_override";
};

export type DiamondPackPricing = {
  id: DiamondPackId;
  diamonds: number;
  title: string;
  price: LocalizedPrice;
  usdReference: number;
  visible: boolean;
  revenueCatProductId: string;
  generationQuality: {
    source: Extract<GenerationQualitySource, "diamond_premium">;
    label: "Premium 4K/2K";
    outputResolution: "1536x1024";
  };
};

export type PricingContext = {
  locale: string;
  countryCode: string;
  regionCode: string;
  detectedLanguage: AppLanguage;
  currencyCode: string;
  tier: PricingTierDefinition;
  tierId: PricingTierId;
  tierLabel: PricingTierDefinition["label"];
  usdReference: Record<PricingDuration, number>;
  diamondPacks: Partial<Record<DiamondPackId, DiamondPackPricing>>;
  visibleDiamondPacks: DiamondPackPricing[];
  usedFallbackTier: boolean;
  prices: Record<PricingDuration, LocalizedPrice>;
  derived: {
    yearlyPerWeek: LocalizedPrice;
  };
  generationQuality: {
    subscriptions: {
      source: Extract<GenerationQualitySource, "subscription_standard_hd">;
      label: "Standard HD";
      outputResolution: "1024x1024";
    };
    diamondPacks: {
      source: Extract<GenerationQualitySource, "diamond_premium">;
      label: "Premium 4K/2K";
      outputResolution: "1536x1024";
    };
  };
  exchangeRate: number;
  exchangeRateSource: string;
  exchangeRateFetchedAt?: number;
  revenueCat: {
    tierId: PricingTierId;
    countryCode: string;
    currencyCode: string;
    offeringHint: string;
    priceMetadata: Record<string, string>;
    attributePayload: Record<string, string>;
    productIdentifiers: {
      subscriptions: Record<PricingDuration, string>;
      diamondPacks: Partial<Record<DiamondPackId, string>>;
    };
  };
};

export const DEFAULT_PRICING_TIER_ID: PricingTierId = "tier_2";
export const DEFAULT_PRICING_COUNTRY_CODE = "US";
export const DEFAULT_PRICING_CURRENCY_CODE = "USD";

const PRICING_ENGINE_STORAGE_KEY = "homedecor:pricing-engine";
const PRICING_TIER_STORAGE_KEY = "homedecor:user_tier";
const PRICING_RATE_TTL_MS = 12 * 60 * 60 * 1000;
const ECB_DAILY_XML_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

const TIER_DEFINITIONS: readonly PricingTierDefinition[] = [
  {
    id: "tier_1",
    label: "vip",
    countries: [
      "AD", "AT", "AU", "BE", "CH", "DK", "FI", "HK", "IE", "IS", "LI", "LU", "MC", "NL", "NO", "NZ", "SE", "SG",
    ],
    usdPrices: { yearly: 79.99, weekly: 12.99 },
    diamondPackUsdPrices: { starter: 5.99, designer: 14.99, architect: 39.99, estate: 109.99 },
  },
  {
    id: "tier_2",
    label: "core",
    countries: [
      "CA", "CY", "DE", "EE", "ES", "FR", "GB", "IL", "IT", "JP", "KR", "MT", "PT", "SI", "SK", "TW", "US",
    ],
    usdPrices: { yearly: 59.99, weekly: 9.99 },
    diamondPackUsdPrices: { starter: 4.99, designer: 11.99, architect: 32.99, estate: 94.99 },
  },
  {
    id: "tier_3",
    label: "rich",
    countries: [
      "AE", "BH", "BN", "CZ", "GR", "HR", "HU", "KW", "LT", "LV", "OM", "PL", "QA", "RO", "SA", "SC", "TT", "UY",
    ],
    usdPrices: { yearly: 44.99, weekly: 7.99 },
    diamondPackUsdPrices: { starter: 3.49, designer: 8.49, architect: 21.99, estate: 64.99 },
  },
  {
    id: "tier_4",
    label: "middle",
    countries: [
      "AL", "AM", "AR", "AZ", "BA", "BG", "BR", "BY", "CL", "CN", "CO", "CR", "DO", "DZ", "EC", "GA", "GE", "GT",
      "JO", "KZ", "LB", "LY", "MA", "MD", "ME", "MK", "MN", "MS", "MX", "MY", "NA", "PA", "PE", "RS", "RU", "TH",
      "TM", "TN", "UA", "UY", "UZ", "VN", "ZA",
    ],
    usdPrices: { yearly: 24.99, weekly: 4.49 },
    diamondPackUsdPrices: { starter: 1.99, designer: 4.99, architect: 12.99, estate: null },
  },
  {
    id: "tier_5",
    label: "mass",
    countries: [
      "AF", "AO", "BD", "BF", "BJ", "BI", "BO", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "EG", "ER", "ET", "GH",
      "GM", "GN", "GQ", "GW", "HN", "ID", "IN", "IQ", "KE", "KG", "KH", "KM", "LA", "LK", "LR", "LS", "MG", "ML",
      "MM", "MO", "MR", "MU", "MW", "MZ", "NE", "NG", "NI", "NP", "PH", "PK", "PR", "PY", "RW", "SD", "SL", "SN",
      "SO", "SS", "SV", "SZ", "TD", "TG", "TR", "TZ", "UG", "YE", "ZM", "ZW",
    ],
    usdPrices: { yearly: 11.99, weekly: 2.29 },
    diamondPackUsdPrices: { starter: 1.49, designer: 3.49, architect: 9.99, estate: null },
  },
] as const;

const DIAMOND_PACK_METADATA: Record<DiamondPackId, { diamonds: number; title: string }> = {
  starter: { diamonds: 10, title: "Starter Pack" },
  designer: { diamonds: 30, title: "Designer Pack" },
  architect: { diamonds: 100, title: "Architect Pack" },
  estate: { diamonds: 300, title: "Estate Pack" },
};

const SUBSCRIPTION_QUALITY = {
  source: "subscription_standard_hd",
  label: "Standard HD",
  outputResolution: "1024x1024",
} as const;

const DIAMOND_PACK_QUALITY = {
  source: "diamond_premium",
  label: "Premium 4K/2K",
  outputResolution: "1536x1024",
} as const;

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  AD: "EUR", AE: "AED", AF: "AFN", AG: "XCD", AI: "XCD", AL: "ALL", AM: "AMD", AO: "AOA", AR: "ARS", AS: "USD",
  AT: "EUR", AU: "AUD", AW: "AWG", AX: "EUR", AZ: "AZN", BA: "BAM", BB: "BBD", BD: "BDT", BE: "EUR", BF: "XOF",
  BG: "BGN", BH: "BHD", BI: "BIF", BJ: "XOF", BL: "EUR", BM: "BMD", BN: "BND", BO: "BOB", BQ: "USD", BR: "BRL",
  BS: "BSD", BT: "BTN", BV: "NOK", BW: "BWP", BY: "BYN", BZ: "BZD", CA: "CAD", CC: "AUD", CD: "CDF", CF: "XAF",
  CG: "XAF", CH: "CHF", CI: "XOF", CK: "NZD", CL: "CLP", CM: "XAF", CN: "CNY", CO: "COP", CR: "CRC", CU: "CUP",
  CV: "CVE", CW: "ANG", CX: "AUD", CY: "EUR", CZ: "CZK", DE: "EUR", DJ: "DJF", DK: "DKK", DM: "XCD", DO: "DOP",
  DZ: "DZD", EC: "USD", EE: "EUR", EG: "EGP", EH: "MAD", ER: "ERN", ES: "EUR", ET: "ETB", FI: "EUR", FJ: "FJD",
  FK: "FKP", FM: "USD", FO: "DKK", FR: "EUR", GA: "XAF", GB: "GBP", GD: "XCD", GE: "GEL", GF: "EUR", GG: "GBP",
  GH: "GHS", GI: "GIP", GL: "DKK", GM: "GMD", GN: "GNF", GP: "EUR", GQ: "XAF", GR: "EUR", GS: "GBP", GT: "GTQ",
  GU: "USD", GW: "XOF", GY: "GYD", HK: "HKD", HM: "AUD", HN: "HNL", HR: "EUR", HT: "HTG", HU: "HUF", ID: "IDR",
  IE: "EUR", IL: "ILS", IM: "GBP", IN: "INR", IO: "USD", IQ: "IQD", IR: "IRR", IS: "ISK", IT: "EUR", JE: "GBP",
  JM: "JMD", JO: "JOD", JP: "JPY", KE: "KES", KG: "KGS", KH: "KHR", KI: "AUD", KM: "KMF", KN: "XCD", KP: "KPW",
  KR: "KRW", KW: "KWD", KY: "KYD", KZ: "KZT", LA: "LAK", LB: "LBP", LC: "XCD", LI: "CHF", LK: "LKR", LR: "LRD",
  LS: "LSL", LT: "EUR", LU: "EUR", LV: "EUR", LY: "LYD", MA: "MAD", MC: "EUR", MD: "MDL", ME: "EUR", MF: "EUR",
  MG: "MGA", MH: "USD", MK: "MKD", ML: "XOF", MM: "MMK", MN: "MNT", MO: "MOP", MP: "USD", MQ: "EUR", MR: "MRU",
  MS: "XCD", MT: "EUR", MU: "MUR", MV: "MVR", MW: "MWK", MX: "MXN", MY: "MYR", MZ: "MZN", NA: "NAD", NC: "XPF",
  NE: "XOF", NF: "AUD", NG: "NGN", NI: "NIO", NL: "EUR", NO: "NOK", NP: "NPR", NR: "AUD", NU: "NZD", NZ: "NZD",
  OM: "OMR", PA: "PAB", PE: "PEN", PF: "XPF", PG: "PGK", PH: "PHP", PK: "PKR", PL: "PLN", PM: "EUR", PN: "NZD",
  PR: "USD", PS: "ILS", PT: "EUR", PW: "USD", PY: "PYG", QA: "QAR", RE: "EUR", RO: "RON", RS: "RSD", RU: "RUB",
  RW: "RWF", SA: "SAR", SB: "SBD", SC: "SCR", SD: "SDG", SE: "SEK", SG: "SGD", SH: "SHP", SI: "EUR", SJ: "NOK",
  SK: "EUR", SL: "SLL", SM: "EUR", SN: "XOF", SO: "SOS", SR: "SRD", SS: "SSP", ST: "STN", SV: "USD", SX: "ANG",
  SY: "SYP", SZ: "SZL", TC: "USD", TD: "XAF", TF: "EUR", TG: "XOF", TH: "THB", TJ: "TJS", TK: "NZD", TL: "USD",
  TM: "TMT", TN: "TND", TO: "TOP", TR: "TRY", TT: "TTD", TV: "AUD", TW: "TWD", TZ: "TZS", UA: "UAH", UG: "UGX",
  UM: "USD", US: "USD", UY: "UYU", UZ: "UZS", VA: "EUR", VC: "XCD", VE: "VES", VG: "USD", VI: "USD", VN: "VND",
  VU: "VUV", WF: "XPF", WS: "WST", XK: "EUR", YE: "YER", YT: "EUR", ZA: "ZAR", ZM: "ZMW", ZW: "USD",
};

const FX_SNAPSHOT_USD_TO_LOCAL: Record<string, FxSnapshot> = {
  AED: { rate: 3.6725, source: "USD peg fallback" },
  CHF: { rate: 0.82, source: "Major-currency fallback" },
  EUR: { rate: 0.92, source: "Major-currency fallback" },
  GBP: { rate: 0.79, source: "Major-currency fallback" },
  MAD: { rate: 9.95, source: "Major-currency fallback" },
  QAR: { rate: 3.64, source: "USD peg fallback" },
  SAR: { rate: 3.75, source: "USD peg fallback" },
  USD: { rate: 1, source: "Tier base currency" },
};

const formatterCache = new Map<string, Intl.NumberFormat>();
const fractionDigitCache = new Map<string, number>();

function normalizeCountryCode(input?: string | null) {
  return String(input ?? "").trim().toUpperCase();
}

function getPrimaryLocale(inputLocales?: readonly Locale[]) {
  return inputLocales?.[0] ?? getLocales()[0];
}

function resolveRegionFromLocale(locale?: Locale | null) {
  const directRegion = normalizeCountryCode(locale?.regionCode);
  if (directRegion.length === 2) {
    return directRegion;
  }

  const languageRegion = normalizeCountryCode(locale?.languageRegionCode);
  if (languageRegion.length === 2) {
    return languageRegion;
  }

  const languageTagParts = String(locale?.languageTag ?? "").split("-");
  const languageTagRegion = languageTagParts.find((part) => /^[A-Za-z]{2}$/.test(part));
  const normalizedLanguageTagRegion = normalizeCountryCode(languageTagRegion);
  if (normalizedLanguageTagRegion.length === 2) {
    return normalizedLanguageTagRegion;
  }

  return DEFAULT_PRICING_COUNTRY_CODE;
}

function getTierDefinition(tierId: PricingTierId) {
  return TIER_DEFINITIONS.find((tier) => tier.id === tierId) ?? TIER_DEFINITIONS[1];
}

function resolveTierByCountry(countryCode: string) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const tier =
    TIER_DEFINITIONS.find((entry) => entry.countries.includes(normalizedCountryCode))
    ?? getTierDefinition(DEFAULT_PRICING_TIER_ID);

  return {
    tier,
    usedFallbackTier: !tier.countries.includes(normalizedCountryCode),
  };
}

function resolveCurrencyCode(countryCode: string) {
  return COUNTRY_TO_CURRENCY[normalizeCountryCode(countryCode)] ?? DEFAULT_PRICING_CURRENCY_CODE;
}

function getFractionDigits(locale: string, currencyCode: string) {
  const cacheKey = `${locale}:${currencyCode}`;
  const cached = fractionDigitCache.get(cacheKey);
  if (typeof cached === "number") {
    return cached;
  }

  const digits = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits;
  const normalizedDigits = typeof digits === "number" ? digits : 2;
  fractionDigitCache.set(cacheKey, normalizedDigits);
  return normalizedDigits;
}

function getFormatter(locale: string, currencyCode: string) {
  const cacheKey = `${locale}:${currencyCode}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: getFractionDigits(locale, currencyCode),
    maximumFractionDigits: getFractionDigits(locale, currencyCode),
  });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function roundToTierPrice(amount: number, fractionDigits: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  const rounded = Number(amount.toFixed(fractionDigits));
  if (fractionDigits === 0) {
    return Math.max(1, Math.round(rounded));
  }
  return rounded;
}

export function createLocalizedPrice(args: {
  amount: number;
  currencyCode: string;
  locale: string;
  source: LocalizedPrice["source"];
}): LocalizedPrice {
  const fractionDigits = getFractionDigits(args.locale, args.currencyCode);
  const normalizedAmount = roundToTierPrice(args.amount, fractionDigits);
  return {
    amount: normalizedAmount,
    currencyCode: args.currencyCode,
    formatted: getFormatter(args.locale, args.currencyCode).format(normalizedAmount).replace(/\s+/g, " ").trim(),
    fractionDigits,
    source: args.source,
  };
}

function buildLocalizedTierPrices(args: {
  locale: string;
  currencyCode: string;
  tier: PricingTierDefinition;
  exchangeRate: number;
}) {
  const weekly = createLocalizedPrice({
    amount: args.tier.usdPrices.weekly * args.exchangeRate,
    currencyCode: args.currencyCode,
    locale: args.locale,
    source: "fx_snapshot",
  });
  const yearly = createLocalizedPrice({
    amount: args.tier.usdPrices.yearly * args.exchangeRate,
    currencyCode: args.currencyCode,
    locale: args.locale,
    source: "fx_snapshot",
  });

  return {
    weekly,
    yearly,
    yearlyPerWeek: createLocalizedPrice({
      amount: yearly.amount / 52,
      currencyCode: args.currencyCode,
      locale: args.locale,
      source: yearly.source,
    }),
  };
}

function buildRevenueCatSubscriptionProductId(tierId: PricingTierId, duration: PricingDuration) {
  return `homedecor_${duration}_${tierId}`;
}

function buildRevenueCatDiamondProductId(tierId: PricingTierId, packId: DiamondPackId) {
  const diamonds = DIAMOND_PACK_METADATA[packId].diamonds;
  return `homedecor_diamond_${diamonds}_${tierId}`;
}

function buildLocalizedDiamondPackPrices(args: {
  locale: string;
  countryCode: string;
  currencyCode: string;
  tier: PricingTierDefinition;
  exchangeRate: number;
}) {
  return (Object.keys(DIAMOND_PACK_METADATA) as DiamondPackId[]).reduce<Partial<Record<DiamondPackId, DiamondPackPricing>>>(
    (accumulator, packId) => {
      const metadata = DIAMOND_PACK_METADATA[packId];
      const usdReference = args.tier.diamondPackUsdPrices[packId];

      if (typeof usdReference !== "number") {
        return accumulator;
      }

      accumulator[packId] = {
        id: packId,
        diamonds: metadata.diamonds,
        title: metadata.title,
        usdReference,
        visible: true,
        revenueCatProductId: buildRevenueCatDiamondProductId(args.tier.id, packId),
        generationQuality: DIAMOND_PACK_QUALITY,
        price: createLocalizedPrice({
          amount: usdReference * args.exchangeRate,
          currencyCode: args.currencyCode,
          locale: args.locale,
          source: "fx_snapshot",
        }),
      };

      return accumulator;
    },
    {},
  );
}

function getVisibleDiamondPacks(diamondPacks: Partial<Record<DiamondPackId, DiamondPackPricing>>) {
  return (Object.keys(DIAMOND_PACK_METADATA) as DiamondPackId[])
    .map((packId) => diamondPacks[packId])
    .filter((pack): pack is DiamondPackPricing => Boolean(pack?.visible));
}

function buildRevenueCatProductIdentifiers(tier: PricingTierDefinition) {
  const diamondPacks = (Object.keys(DIAMOND_PACK_METADATA) as DiamondPackId[])
    .reduce<Partial<Record<DiamondPackId, string>>>((accumulator, packId) => {
      if (typeof tier.diamondPackUsdPrices[packId] === "number") {
        accumulator[packId] = buildRevenueCatDiamondProductId(tier.id, packId);
      }
      return accumulator;
    }, {});

  return {
    subscriptions: {
      weekly: buildRevenueCatSubscriptionProductId(tier.id, "weekly"),
      yearly: buildRevenueCatSubscriptionProductId(tier.id, "yearly"),
    },
    diamondPacks,
  };
}

function buildDiamondPackPriceMetadata(prefix: string, tier: PricingTierDefinition) {
  return (Object.keys(DIAMOND_PACK_METADATA) as DiamondPackId[]).reduce<Record<string, string>>(
    (metadata, packId) => {
      const diamonds = DIAMOND_PACK_METADATA[packId].diamonds;
      const usdReference = tier.diamondPackUsdPrices[packId];
      metadata[`${prefix}_diamond_${diamonds}_visible`] = typeof usdReference === "number" ? "true" : "false";
      if (typeof usdReference === "number") {
        metadata[`${prefix}_diamond_${diamonds}_usd`] = usdReference.toFixed(2);
        metadata[`${prefix}_diamond_${diamonds}_product_id`] = buildRevenueCatDiamondProductId(tier.id, packId);
      }
      return metadata;
    },
    {},
  );
}

function parseEcbXmlRateMap(xml: string) {
  const matches = Array.from(xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g));
  return new Map(matches.map(([, currency, rate]) => [currency, Number(rate)]));
}

async function fetchUsdRateFromEcb(currencyCode: string) {
  const response = await fetch(ECB_DAILY_XML_URL);
  if (!response.ok) {
    throw new Error(`ECB FX request failed with ${response.status}`);
  }

  const xml = await response.text();
  const rates = parseEcbXmlRateMap(xml);
  const eurToUsd = rates.get("USD");
  const eurToTarget = rates.get(currencyCode);
  if (!eurToUsd || !eurToTarget) {
    throw new Error(`ECB rate unavailable for ${currencyCode}`);
  }

  return {
    rate: eurToTarget / eurToUsd,
    source: "ECB daily reference rates",
  };
}

async function fetchUsdToLocalRate(currencyCode: string) {
  if (currencyCode === "USD") {
    return FX_SNAPSHOT_USD_TO_LOCAL.USD;
  }

  if (currencyCode === "AED" || currencyCode === "QAR" || currencyCode === "SAR") {
    return FX_SNAPSHOT_USD_TO_LOCAL[currencyCode];
  }

  try {
    return await fetchUsdRateFromEcb(currencyCode);
  } catch {
    return FX_SNAPSHOT_USD_TO_LOCAL[currencyCode] ?? FX_SNAPSHOT_USD_TO_LOCAL.USD;
  }
}

async function readStoredPricingSnapshot() {
  try {
    const raw = await AsyncStorage.getItem(PRICING_ENGINE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPricingSnapshot) : null;
  } catch {
    return null;
  }
}

async function persistPricingSnapshot(snapshot: StoredPricingSnapshot) {
  await AsyncStorage.multiSet([
    [PRICING_ENGINE_STORAGE_KEY, JSON.stringify(snapshot)],
    [PRICING_TIER_STORAGE_KEY, snapshot.tierId],
  ]);
}

export function getPricingContext(
  inputLocales?: readonly Locale[],
  appLanguage: AppLanguage = "en-US",
  liveRateOverride?: LiveRateOverride | null,
  geoSnapshot?: GeoIntelligenceSnapshot | null,
): PricingContext {
  const locale = getPrimaryLocale(inputLocales);
  const activeGeoSnapshot = geoSnapshot ?? getGeoIntelligenceSnapshot();
  const regionCode = activeGeoSnapshot?.regionCode || resolveRegionFromLocale(locale);
  const countryCode = regionCode || DEFAULT_PRICING_COUNTRY_CODE;
  const currencyCode = resolveCurrencyCode(countryCode);
  const localeTag = getLanguageLocaleTag(appLanguage, countryCode);
  const { tier, usedFallbackTier } = resolveTierByCountry(countryCode);
  const fxSnapshot =
    liveRateOverride && Number.isFinite(liveRateOverride.rate) && liveRateOverride.rate > 0
      ? { rate: liveRateOverride.rate, source: liveRateOverride.source }
      : (FX_SNAPSHOT_USD_TO_LOCAL[currencyCode] ?? FX_SNAPSHOT_USD_TO_LOCAL.USD);
  const localizedPrices = buildLocalizedTierPrices({
    locale: localeTag,
    currencyCode,
    tier,
    exchangeRate: fxSnapshot.rate,
  });
  const localizedDiamondPackPrices = buildLocalizedDiamondPackPrices({
    locale: localeTag,
    countryCode,
    currencyCode,
    tier,
    exchangeRate: fxSnapshot.rate,
  });
  const visibleDiamondPacks = getVisibleDiamondPacks(localizedDiamondPackPrices);
  const revenueCatProductIdentifiers = buildRevenueCatProductIdentifiers(tier);
  const diamondPackPriceMetadata = buildDiamondPackPriceMetadata("homedecor", tier);

  return {
    locale: localeTag,
    countryCode,
    regionCode,
    detectedLanguage: activeGeoSnapshot?.resolvedLanguage ?? appLanguage,
    currencyCode,
    tier,
    tierId: tier.id,
    tierLabel: tier.label,
    usdReference: tier.usdPrices,
    diamondPacks: localizedDiamondPackPrices,
    visibleDiamondPacks,
    usedFallbackTier,
    prices: {
      weekly: localizedPrices.weekly,
      yearly: localizedPrices.yearly,
    },
    derived: {
      yearlyPerWeek: localizedPrices.yearlyPerWeek,
    },
    generationQuality: {
      subscriptions: SUBSCRIPTION_QUALITY,
      diamondPacks: DIAMOND_PACK_QUALITY,
    },
    exchangeRate: fxSnapshot.rate,
    exchangeRateSource: fxSnapshot.source,
    exchangeRateFetchedAt: liveRateOverride?.fetchedAt,
    revenueCat: {
      tierId: tier.id,
      countryCode,
      currencyCode,
      offeringHint: `${countryCode.toLowerCase()}_${tier.id}`,
      priceMetadata: {
        homedecor_weekly_price_usd: tier.usdPrices.weekly.toFixed(2),
        homedecor_yearly_price_usd: tier.usdPrices.yearly.toFixed(2),
        homedecor_weekly_product_id: revenueCatProductIdentifiers.subscriptions.weekly,
        homedecor_yearly_product_id: revenueCatProductIdentifiers.subscriptions.yearly,
        ...diamondPackPriceMetadata,
        homedecor_fx_rate: fxSnapshot.rate.toFixed(6),
        homedecor_fx_source: fxSnapshot.source,
      },
      attributePayload: {
        homedecor_country_code: countryCode,
        homedecor_currency_code: currencyCode,
        homedecor_detected_region_code: regionCode,
        homedecor_locale: localeTag,
        homedecor_pricing_tier: tier.id,
        homedecor_pricing_fallback: usedFallbackTier ? "true" : "false",
        homedecor_detected_language: activeGeoSnapshot?.resolvedLanguage ?? appLanguage,
        homedecor_weekly_price_usd: tier.usdPrices.weekly.toFixed(2),
        homedecor_yearly_price_usd: tier.usdPrices.yearly.toFixed(2),
        homedecor_weekly_product_id: revenueCatProductIdentifiers.subscriptions.weekly,
        homedecor_yearly_product_id: revenueCatProductIdentifiers.subscriptions.yearly,
        homedecor_subscription_quality: SUBSCRIPTION_QUALITY.label,
        homedecor_diamond_generation_quality: DIAMOND_PACK_QUALITY.label,
        ...diamondPackPriceMetadata,
        homedecor_fx_rate: fxSnapshot.rate.toFixed(6),
        homedecor_fx_source: fxSnapshot.source,
      },
      productIdentifiers: revenueCatProductIdentifiers,
    },
  };
}

export function usePricingContext() {
  const locales = useLocales();
  const geoSnapshot = useGeoIntelligence();
  const languagePreference = useAppLanguagePreference();
  const localeSignature = locales
    .map((locale) => [
      locale.languageTag ?? locale.languageCode ?? "",
      locale.regionCode ?? locale.languageRegionCode ?? "",
    ].join(":"))
    .join("|");
  const baseContext = useMemo(
    () => getPricingContext(locales, languagePreference.resolvedLanguage, null, geoSnapshot),
    [geoSnapshot, languagePreference.resolvedLanguage, localeSignature, locales],
  );
  const [liveRate, setLiveRate] = useState<LiveRateOverride | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const cached = await readStoredPricingSnapshot();
      const cacheMatchesBase =
        cached
        && cached.countryCode === baseContext.countryCode
        && cached.currencyCode === baseContext.currencyCode
        && cached.tierId === baseContext.tierId;

      if (active && cacheMatchesBase) {
        setLiveRate({
          rate: cached.exchangeRate,
          source: cached.exchangeRateSource,
          fetchedAt: cached.fetchedAt,
        });
      }

      const isCacheFresh = cacheMatchesBase && Date.now() - cached.fetchedAt < PRICING_RATE_TTL_MS;
      if (isCacheFresh) {
        return;
      }

      const nextRate = await fetchUsdToLocalRate(baseContext.currencyCode);
      const snapshot: StoredPricingSnapshot = {
        countryCode: baseContext.countryCode,
        currencyCode: baseContext.currencyCode,
        exchangeRate: nextRate.rate,
        exchangeRateSource: nextRate.source,
        fetchedAt: Date.now(),
        tierId: baseContext.tierId,
      };
      await persistPricingSnapshot(snapshot);

      if (active) {
        setLiveRate({
          rate: snapshot.exchangeRate,
          source: snapshot.exchangeRateSource,
          fetchedAt: snapshot.fetchedAt,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [baseContext.countryCode, baseContext.currencyCode, baseContext.tierId]);

  return useMemo(
    () => getPricingContext(locales, languagePreference.resolvedLanguage, liveRate, geoSnapshot),
    [geoSnapshot, languagePreference.resolvedLanguage, liveRate, localeSignature, locales],
  );
}
