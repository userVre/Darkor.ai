import { getLocales, useLocales, type Locale } from "expo-localization";
import { useMemo } from "react";

export type PricingDuration = "weekly" | "yearly";
export type PricingTierId = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5";

type SupportedCountryCode =
  | "AE"
  | "BR"
  | "CA"
  | "CH"
  | "DE"
  | "EG"
  | "GB"
  | "IN"
  | "KW"
  | "MA"
  | "MX"
  | "NO"
  | "PK"
  | "QA"
  | "SA"
  | "TR"
  | "US";

type SupportedCurrencyCode =
  | "AED"
  | "BRL"
  | "CAD"
  | "CHF"
  | "EGP"
  | "EUR"
  | "GBP"
  | "INR"
  | "KWD"
  | "MAD"
  | "MXN"
  | "NOK"
  | "PKR"
  | "QAR"
  | "SAR"
  | "TRY"
  | "USD";

type PriceBook = Record<PricingDuration, number>;

type PricingTierDefinition = {
  id: PricingTierId;
  label: "vip" | "core" | "rich" | "middle" | "mass";
  countries: readonly SupportedCountryCode[];
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
    countries: ["AE", "SA", "QA", "KW"],
    usdPrices: { weekly: 5.99, yearly: 34.99 },
  },
  {
    id: "tier_4",
    label: "middle",
    countries: ["MA", "BR", "MX"],
    usdPrices: { weekly: 2.99, yearly: 19.99 },
  },
  {
    id: "tier_5",
    label: "mass",
    countries: ["TR", "IN", "EG", "PK"],
    usdPrices: { weekly: 0.99, yearly: 9.99 },
  },
] as const;

export const DEFAULT_PRICING_TIER_ID: PricingTierId = "tier_2";
export const DEFAULT_PRICING_COUNTRY_CODE = "US";
export const DEFAULT_PRICING_CURRENCY_CODE = "USD";

const COUNTRY_TO_CURRENCY: Record<SupportedCountryCode, SupportedCurrencyCode> = {
  AE: "AED",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  DE: "EUR",
  EG: "EGP",
  GB: "GBP",
  IN: "INR",
  KW: "KWD",
  MA: "MAD",
  MX: "MXN",
  NO: "NOK",
  PK: "PKR",
  QA: "QAR",
  SA: "SAR",
  TR: "TRY",
  US: "USD",
};

// Snapshot FX defaults used before targeted store prices arrive or when offerings fail.
// Where possible these are seeded from official April 2026 central-bank references:
// ECB (2026-04-02), Bank Al-Maghrib (2026-01-30), SBP (2026-02), and official GCC pegs.
const FX_SNAPSHOT_USD_TO_LOCAL: Record<SupportedCurrencyCode, FxSnapshot> = {
  AED: { rate: 3.6725, source: "USD peg" },
  BRL: { rate: 5.181779, source: "ECB 2026-04-02 cross rate" },
  CAD: { rate: 1.390889, source: "ECB 2026-04-02 cross rate" },
  CHF: { rate: 0.799393, source: "ECB 2026-04-02 cross rate" },
  EGP: { rate: 50.65, source: "April 2026 seeded fallback" },
  EUR: { rate: 0.867679, source: "ECB 2026-04-02 cross rate" },
  GBP: { rate: 0.757076, source: "ECB 2026-04-02 cross rate" },
  INR: { rate: 93.101952, source: "ECB 2026-04-02 cross rate" },
  KWD: { rate: 0.3055, source: "CBK March 2026 monthly range" },
  MAD: { rate: 9.084, source: "Bank Al-Maghrib 2026-01-30" },
  MXN: { rate: 17.939176, source: "ECB 2026-04-02 cross rate" },
  NOK: { rate: 9.742733, source: "ECB 2026-04-02 cross rate" },
  PKR: { rate: 279.807007, source: "SBP Feb 2026 average" },
  QAR: { rate: 3.64, source: "USD peg" },
  SAR: { rate: 3.75, source: "USD peg" },
  TRY: { rate: 44.494143, source: "ECB 2026-04-02 cross rate" },
  USD: { rate: 1, source: "Tier base currency" },
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

  const languageTagRegion = String(locale?.languageTag ?? "")
    .split("-")
    .find((part) => /^[A-Za-z]{2}$/.test(part));
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
    TIER_DEFINITIONS.find((entry) => entry.countries.includes(normalizedCountryCode as SupportedCountryCode))
    ?? getTierDefinition(DEFAULT_PRICING_TIER_ID);

  return {
    tier,
    usedFallbackTier: !tier.countries.includes(normalizedCountryCode as SupportedCountryCode),
  };
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
  currencyCode: SupportedCurrencyCode;
  locale: string;
}) {
  const fractionDigits = getFractionDigits(locale, currencyCode);
  const convertedAmount = usdAmount * FX_SNAPSHOT_USD_TO_LOCAL[currencyCode].rate;
  const roundedAmount = roundToNaturalEnding(convertedAmount, fractionDigits);

  return createLocalizedPrice({
    amount: roundedAmount,
    currencyCode,
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
  const countryCode = usedFallbackTier ? DEFAULT_PRICING_COUNTRY_CODE : detectedRegionCode;
  const currencyCode = usedFallbackTier
    ? DEFAULT_PRICING_CURRENCY_CODE
    : COUNTRY_TO_CURRENCY[countryCode as SupportedCountryCode] ?? DEFAULT_PRICING_CURRENCY_CODE;
  const localeTag = usedFallbackTier ? "en-US" : resolveLocaleTag(locale, countryCode);

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
    currencyCode,
    locale: localeTag,
    source: "fx_snapshot",
  });

  const fxSnapshot = FX_SNAPSHOT_USD_TO_LOCAL[currencyCode];

  return {
    locale: localeTag,
    countryCode,
    regionCode: countryCode,
    currencyCode,
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
      currencyCode,
      offeringHint: tier.id,
      attributePayload: {
        darkor_country_code: countryCode,
        darkor_currency_code: currencyCode,
        darkor_detected_region_code: detectedRegionCode,
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
