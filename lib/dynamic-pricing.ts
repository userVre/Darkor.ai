import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales, useLocales, type Locale } from "expo-localization";
import { useEffect, useMemo, useState } from "react";

import { getLanguageLocaleTag, type AppLanguage } from "./i18n/language";
import { useAppLanguagePreference } from "./i18n";

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
  exchangeRateFetchedAt?: number;
  revenueCat: {
    tierId: PricingTierId;
    countryCode: string;
    currencyCode: string;
    offeringHint: string;
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
    countries: ["MA", "BR", "MX"],
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
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  DE: "EUR",
  EG: "EGP",
  GB: "GBP",
  IN: "INR",
  MA: "MAD",
  MX: "MXN",
  NO: "NOK",
  QA: "QAR",
  SA: "SAR",
  TR: "TRY",
  US: "USD",
};

const FX_SNAPSHOT_USD_TO_LOCAL: Record<string, FxSnapshot> = {
  AED: { rate: 3.6725, source: "USD peg fallback" },
  BRL: { rate: 4.9772, source: "Seeded fallback" },
  CAD: { rate: 1.3668, source: "Seeded fallback" },
  CHF: { rate: 0.7825, source: "Seeded fallback" },
  EGP: { rate: 49.18, source: "Seeded fallback" },
  EUR: { rate: 0.8476, source: "Seeded fallback" },
  GBP: { rate: 0.7389, source: "Seeded fallback" },
  INR: { rate: 83.57, source: "Seeded fallback" },
  MAD: { rate: 9.95, source: "Seeded fallback" },
  MXN: { rate: 16.82, source: "Seeded fallback" },
  NOK: { rate: 10.17, source: "Seeded fallback" },
  QAR: { rate: 3.64, source: "USD peg fallback" },
  SAR: { rate: 3.75, source: "USD peg fallback" },
  TRY: { rate: 32.24, source: "Seeded fallback" },
  USD: { rate: 1, source: "Tier base currency" },
};

const PRICING_ENGINE_STORAGE_KEY = "homedecor:pricing-engine";
const PRICING_TIER_STORAGE_KEY = "homedecor:user_tier";
const PRICING_RATE_TTL_MS = 12 * 60 * 60 * 1000;
const ECB_DAILY_XML_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const BKAM_REFERENCE_RATES_URL = "https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference";

const formatterCache = new Map<string, Intl.NumberFormat>();
const fractionDigitCache = new Map<string, number>();
const decimalFormatterCache = new Map<string, Intl.NumberFormat>();

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

function getDecimalFormatter(locale: string, fractionDigits: number) {
  const cacheKey = `${locale}:${fractionDigits}`;
  const cached = decimalFormatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  decimalFormatterCache.set(cacheKey, formatter);
  return formatter;
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
  const formatted =
    currencyCode === "MAD"
      ? `MAD ${getDecimalFormatter(locale, fractionDigits).format(normalizedAmount)}`
      : getFormatter(locale, currencyCode).format(normalizedAmount).replace(/\s+/g, " ").trim();

  return {
    amount: normalizedAmount,
    currencyCode,
    formatted,
    fractionDigits,
    source,
  };
}

function getPrimaryLocale(inputLocales?: readonly Locale[]) {
  return inputLocales?.[0] ?? getLocales()[0];
}

function buildLocalizedTierPrices(args: {
  localeTag: string;
  currencyCode: string;
  tier: PricingTierDefinition;
  exchangeRate: number;
}) {
  const fractionDigits = getFractionDigits(args.localeTag, args.currencyCode);
  const weekly = createLocalizedPrice({
    amount: roundToNaturalEnding(args.tier.usdPrices.weekly * args.exchangeRate, fractionDigits),
    currencyCode: args.currencyCode,
    locale: args.localeTag,
    source: "fx_snapshot",
  });
  const yearly = createLocalizedPrice({
    amount: roundToNaturalEnding(args.tier.usdPrices.yearly * args.exchangeRate, fractionDigits),
    currencyCode: args.currencyCode,
    locale: args.localeTag,
    source: "fx_snapshot",
  });

  return {
    weekly,
    yearly,
    yearlyPerWeek: createLocalizedPrice({
      amount: yearly.amount / 52,
      currencyCode: args.currencyCode,
      locale: args.localeTag,
      source: yearly.source,
    }),
  };
}

export function getPricingContext(
  inputLocales?: readonly Locale[],
  appLanguage: AppLanguage = "en-US",
  liveRateOverride?: { rate: number; source: string; fetchedAt?: number } | null,
): PricingContext {
  const locale = getPrimaryLocale(inputLocales);
  const detectedRegionCode = resolveRegionFromLocale(locale);
  const { tier, usedFallbackTier } = resolveTierByCountry(detectedRegionCode);
  const countryCode = detectedRegionCode || DEFAULT_PRICING_COUNTRY_CODE;
  const currencyCode = resolveCurrencyCode(countryCode);
  const localeTag = getLanguageLocaleTag(appLanguage, countryCode);
  const fxSnapshot =
    liveRateOverride && Number.isFinite(liveRateOverride.rate) && liveRateOverride.rate > 0
      ? { rate: liveRateOverride.rate, source: liveRateOverride.source }
      : (FX_SNAPSHOT_USD_TO_LOCAL[currencyCode] ?? FX_SNAPSHOT_USD_TO_LOCAL.USD);
  const localizedPrices = buildLocalizedTierPrices({
    localeTag,
    currencyCode,
    tier,
    exchangeRate: fxSnapshot.rate,
  });

  return {
    locale: localeTag,
    countryCode,
    regionCode: detectedRegionCode,
    currencyCode,
    tier,
    tierId: tier.id,
    usedFallbackTier,
    prices: {
      weekly: localizedPrices.weekly,
      yearly: localizedPrices.yearly,
    },
    derived: {
      yearlyPerWeek: localizedPrices.yearlyPerWeek,
    },
    exchangeRate: fxSnapshot.rate,
    exchangeRateSource: fxSnapshot.source,
    exchangeRateFetchedAt: liveRateOverride?.fetchedAt,
    revenueCat: {
      tierId: tier.id,
      countryCode,
      currencyCode,
      offeringHint: countryCode.toLowerCase(),
      attributePayload: {
        homedecor_country_code: countryCode,
        homedecor_currency_code: currencyCode,
        homedecor_detected_region_code: detectedRegionCode,
        homedecor_locale: localeTag,
        homedecor_pricing_tier: tier.id,
        homedecor_pricing_fallback: usedFallbackTier ? "true" : "false",
        darkor_country_code: countryCode,
        darkor_currency_code: currencyCode,
        darkor_detected_region_code: detectedRegionCode,
        darkor_locale: localeTag,
        darkor_pricing_tier: tier.id,
        darkor_pricing_fallback: usedFallbackTier ? "true" : "false",
      },
    },
  };
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

async function fetchUsdToMadFromBkam() {
  const response = await fetch(BKAM_REFERENCE_RATES_URL);
  if (!response.ok) {
    throw new Error(`BKAM FX request failed with ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/1 DOLLAR U\.S\.A\.<\/a>\s*([0-9,]+)/i);
  if (!match?.[1]) {
    throw new Error("BKAM USD/MAD rate unavailable");
  }

  return {
    rate: Number(match[1].replace(",", ".")),
    source: "Bank Al-Maghrib reference rates",
  };
}

async function fetchUsdToLocalRate(currencyCode: string) {
  if (currencyCode === "USD") {
    return { rate: 1, source: "Tier base currency" };
  }

  if (currencyCode === "AED" || currencyCode === "QAR" || currencyCode === "SAR") {
    return FX_SNAPSHOT_USD_TO_LOCAL[currencyCode];
  }

  if (currencyCode === "MAD") {
    try {
      return await fetchUsdToMadFromBkam();
    } catch {
      return FX_SNAPSHOT_USD_TO_LOCAL.MAD;
    }
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

export function usePricingContext() {
  const locales = useLocales();
  const languagePreference = useAppLanguagePreference();
  const localeSignature = locales
    .map((locale) => [
      locale.languageTag ?? locale.languageCode ?? "",
      locale.regionCode ?? locale.languageRegionCode ?? "",
    ].join(":"))
    .join("|");
  const baseContext = useMemo(
    () => getPricingContext(locales, languagePreference.resolvedLanguage),
    [languagePreference.resolvedLanguage, localeSignature, locales],
  );
  const [liveRate, setLiveRate] = useState<{ rate: number; source: string; fetchedAt?: number } | null>(null);

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
    () => getPricingContext(locales, languagePreference.resolvedLanguage, liveRate),
    [languagePreference.resolvedLanguage, liveRate, localeSignature, locales],
  );
}
