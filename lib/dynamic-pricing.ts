import { getLocales, useLocales, type Locale } from "expo-localization";
import { useMemo } from "react";

export type PricingDuration = "weekly" | "yearly";
export type PricingTierId = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5";

type PriceBook = Record<PricingDuration, number>;

type PricingTierDefinition = {
  id: PricingTierId;
  label: "vip" | "core" | "rich" | "middle" | "mass";
  countries: readonly string[];
  usdPrices: PriceBook;
};

type FxSnapshot = {
  rate: number;
  source: string;
};

export type LocalizedPrice = {
  amount: number;
  currencyCode: string;
  formatted: string;
  fractionDigits: number;
  source: "fx_snapshot" | "store";
};

export type PricingContext = {
  locale: string;
  countryCode: string;
  regionCode: string;
  currencyCode: string;
  tier: PricingTierDefinition;
  tierId: PricingTierId;
  usedFallbackTier: boolean;
  prices: Record<PricingDuration, LocalizedPrice>;
  derived: {
    yearlyPerWeek: LocalizedPrice;
  };
  exchangeRate: number;
  exchangeRateSource: string;
  revenueCat: {
    tierId: PricingTierId;
    countryCode: string;
    currencyCode: string;
    offeringHint: PricingTierId;
    attributePayload: Record<string, string>;
  };
};

const TIER_DEFINITIONS: readonly PricingTierDefinition[] = [
  {
    id: "tier_1",
    label: "vip",
    countries: ["CH", "NO"],
    usdPrices: { weekly: 9.99, yearly: 59.99 },
  },
  {
    id: "tier_2",
    label: "core",
    countries: ["US", "GB", "DE", "CA"],
    usdPrices: { weekly: 6.99, yearly: 39.99 },
  },
  {
    id: "tier_3",
    label: "rich",
    countries: ["AE", "SA", "QA"],
    usdPrices: { weekly: 5.99, yearly: 34.99 },
  },
  {
    id: "tier_4",
    label: "middle",
    countries: ["MA", "BR", "MX", "VN"],
    usdPrices: { weekly: 2.99, yearly: 19.99 },
  },
  {
    id: "tier_5",
    label: "mass",
    countries: ["TR", "IN", "EG"],
    usdPrices: { weekly: 0.99, yearly: 9.99 },
  },
] as const;

export const DEFAULT_PRICING_TIER_ID: PricingTierId = "tier_2";
export const DEFAULT_PRICING_COUNTRY_CODE = "US";
export const DEFAULT_PRICING_CURRENCY_CODE = "USD";

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  AE: "AED",
  AT: "EUR",
  BE: "EUR",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  EG: "EGP",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GB: "GBP",
  GR: "EUR",
  HK: "HKD",
  HR: "EUR",
  IE: "EUR",
  IN: "INR",
  IT: "EUR",
  KR: "KRW",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MA: "MAD",
  MO: "MOP",
  MT: "EUR",
  MX: "MXN",
  NL: "EUR",
  NO: "NOK",
  PT: "EUR",
  QA: "QAR",
  RU: "RUB",
  SA: "SAR",
  SG: "SGD",
  SI: "EUR",
  SK: "EUR",
  TR: "TRY",
  TW: "TWD",
  US: "USD",
  VN: "VND",
};

const FX_SNAPSHOT_USD_TO_LOCAL: Record<string, FxSnapshot> = {
  AED: { rate: 3.6725, source: "USD peg" },
  BRL: { rate: 5.181779, source: "ECB 2026-04-02 cross rate" },
  CAD: { rate: 1.390889, source: "ECB 2026-04-02 cross rate" },
  CHF: { rate: 0.799393, source: "ECB 2026-04-02 cross rate" },
  CNY: { rate: 7.24, source: "April 2026 seeded fallback" },
  EGP: { rate: 50.65, source: "April 2026 seeded fallback" },
  EUR: { rate: 0.867679, source: "ECB 2026-04-02 cross rate" },
  GBP: { rate: 0.757076, source: "ECB 2026-04-02 cross rate" },
  HKD: { rate: 7.8, source: "Linked exchange rate" },
  INR: { rate: 93.101952, source: "ECB 2026-04-02 cross rate" },
  KRW: { rate: 1460, source: "April 2026 seeded fallback" },
  MAD: { rate: 9.084, source: "Bank Al-Maghrib 2026-01-30" },
  MOP: { rate: 8.04, source: "April 2026 seeded fallback" },
  MXN: { rate: 17.939176, source: "ECB 2026-04-02 cross rate" },
  NOK: { rate: 9.742733, source: "ECB 2026-04-02 cross rate" },
  QAR: { rate: 3.64, source: "USD peg" },
  RUB: { rate: 84.75, source: "April 2026 seeded fallback" },
  SAR: { rate: 3.75, source: "USD peg" },
  SGD: { rate: 1.34, source: "April 2026 seeded fallback" },
  TRY: { rate: 44.494143, source: "ECB 2026-04-02 cross rate" },
  TWD: { rate: 32.4, source: "April 2026 seeded fallback" },
  USD: { rate: 1, source: "Tier base currency" },
  VND: { rate: 25500, source: "April 2026 seeded fallback" },
};

const formatterCache = new Map<string, Intl.NumberFormat>();
const fractionDigitCache = new Map<string, number>();

function getTierDefinition(tierId: PricingTierId) {
  return TIER_DEFINITIONS.find((tier) => tier.id === tierId) ?? TIER_DEFINITIONS[1];
}

function normalizeCountryCode(input?: string | null) {
  return String(input ?? "").trim().toUpperCase();
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

function resolveLocaleTag(locale?: Locale | null, regionCode?: string) {
  const languageTag = String(locale?.languageTag ?? "").trim();
  if (languageTag.length > 0) {
    return languageTag;
  }

  const languageCode = String(locale?.languageCode ?? "en").trim() || "en";
  return `${languageCode}-${regionCode ?? DEFAULT_PRICING_COUNTRY_CODE}`;
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

function roundToNaturalEnding(amount: number, fractionDigits: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (fractionDigits <= 0) {
    return Math.ceil(amount);
  }

  const increment = 1 / 10 ** fractionDigits;
  if (amount >= 100) {
    return Number(Math.ceil(amount).toFixed(fractionDigits));
  }

  const ceiling = Math.max(Math.ceil(amount), 1);
  return Number(Math.max(increment, ceiling - increment).toFixed(fractionDigits));
}

export function createLocalizedPrice({
  amount,
  currencyCode,
  locale,
  source,
}: {
  amount: number;
  currencyCode: string;
  locale: string;
  source: LocalizedPrice["source"];
}): LocalizedPrice {
  const fractionDigits = getFractionDigits(locale, currencyCode);
  const normalizedAmount = Number(amount.toFixed(fractionDigits));
  return {
    amount: normalizedAmount,
    currencyCode,
    formatted: getFormatter(locale, currencyCode).format(normalizedAmount),
    fractionDigits,
    source,
  };
}

function createFxLocalizedPrice({
  usdAmount,
  currencyCode,
  locale,
}: {
  usdAmount: number;
  currencyCode: string;
  locale: string;
}) {
  const supportedCurrencyCode = FX_SNAPSHOT_USD_TO_LOCAL[currencyCode]
    ? currencyCode
    : DEFAULT_PRICING_CURRENCY_CODE;
  const fractionDigits = getFractionDigits(locale, supportedCurrencyCode);
  const convertedAmount = usdAmount * FX_SNAPSHOT_USD_TO_LOCAL[supportedCurrencyCode].rate;
  const roundedAmount = roundToNaturalEnding(convertedAmount, fractionDigits);

  return createLocalizedPrice({
    amount: roundedAmount,
    currencyCode: supportedCurrencyCode,
    locale,
    source: "fx_snapshot",
  });
}

function getPrimaryLocale(inputLocales?: readonly Locale[]) {
  return inputLocales?.[0] ?? getLocales()[0];
}

export function getPricingContext(inputLocales?: readonly Locale[]): PricingContext {
  const locale = getPrimaryLocale(inputLocales);
  const detectedRegionCode = resolveRegionFromLocale(locale);
  const { tier, usedFallbackTier } = resolveTierByCountry(detectedRegionCode);
  const countryCode = detectedRegionCode || DEFAULT_PRICING_COUNTRY_CODE;
  const currencyCode = resolveCurrencyCode(countryCode);
  const localeTag = resolveLocaleTag(locale, countryCode);

  const weekly = createFxLocalizedPrice({
    usdAmount: tier.usdPrices.weekly,
    currencyCode,
    locale: localeTag,
  });
  const yearly = createFxLocalizedPrice({
    usdAmount: tier.usdPrices.yearly,
    currencyCode,
    locale: localeTag,
  });
  const yearlyPerWeek = createLocalizedPrice({
    amount: yearly.amount / 52,
    currencyCode: yearly.currencyCode,
    locale: localeTag,
    source: yearly.source,
  });

  const fxSnapshot = FX_SNAPSHOT_USD_TO_LOCAL[yearly.currencyCode] ?? FX_SNAPSHOT_USD_TO_LOCAL.USD;

  return {
    locale: localeTag,
    countryCode,
    regionCode: detectedRegionCode,
    currencyCode: yearly.currencyCode,
    tier,
    tierId: tier.id,
    usedFallbackTier,
    prices: {
      weekly,
      yearly,
    },
    derived: {
      yearlyPerWeek,
    },
    exchangeRate: fxSnapshot.rate,
    exchangeRateSource: fxSnapshot.source,
    revenueCat: {
      tierId: tier.id,
      countryCode,
      currencyCode: yearly.currencyCode,
      offeringHint: tier.id,
      attributePayload: {
        darkor_country_code: countryCode,
        darkor_currency_code: yearly.currencyCode,
        darkor_detected_region_code: detectedRegionCode,
        darkor_locale: localeTag,
        darkor_pricing_tier: tier.id,
        darkor_pricing_fallback: usedFallbackTier ? "true" : "false",
      },
    },
  };
}

export function usePricingContext() {
  const locales = useLocales();
  return useMemo(() => getPricingContext(locales), [locales]);
}
