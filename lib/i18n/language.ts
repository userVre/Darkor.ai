import {getLocales, type Locale} from "expo-localization";
import {Platform} from "react-native";

export const SUPPORTED_LANGUAGES = [
  "en-US",
  "ar",
  "sv",
  "de",
  "it",
  "ja",
  "ko",
  "fr",
  "pt",
  "pt-BR",
  "es",
  "es-MX",
  "ru",
  "zh-Hans",
  "zh-Hant",
  "vi",
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type SupportedLanguageOption = {
  code: AppLanguage;
  englishLabel: string;
  nativeLabel: string;
  localeBase: string;
  defaultRegion: string;
};

export const SUPPORTED_LANGUAGE_OPTIONS: readonly SupportedLanguageOption[] = [
  {
    code: "en-US",
    englishLabel: "English (US)",
    nativeLabel: "English (US)",
    localeBase: "en",
    defaultRegion: "US",
  },
  {
    code: "ar",
    englishLabel: "Arabic",
    nativeLabel: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    localeBase: "ar",
    defaultRegion: "SA",
  },
  {
    code: "sv",
    englishLabel: "Swedish",
    nativeLabel: "Svenska",
    localeBase: "sv",
    defaultRegion: "SE",
  },
  {
    code: "de",
    englishLabel: "German",
    nativeLabel: "Deutsch",
    localeBase: "de",
    defaultRegion: "DE",
  },
  {
    code: "it",
    englishLabel: "Italian",
    nativeLabel: "Italiano",
    localeBase: "it",
    defaultRegion: "IT",
  },
  {
    code: "ja",
    englishLabel: "Japanese",
    nativeLabel: "\u65e5\u672c\u8a9e",
    localeBase: "ja",
    defaultRegion: "JP",
  },
  {
    code: "ko",
    englishLabel: "Korean",
    nativeLabel: "\ud55c\uad6d\uc5b4",
    localeBase: "ko",
    defaultRegion: "KR",
  },
  {
    code: "fr",
    englishLabel: "French",
    nativeLabel: "Fran\u00e7ais",
    localeBase: "fr",
    defaultRegion: "FR",
  },
  {
    code: "pt",
    englishLabel: "Portuguese",
    nativeLabel: "Portugu\u00eas",
    localeBase: "pt",
    defaultRegion: "PT",
  },
  {
    code: "pt-BR",
    englishLabel: "Portuguese (Brazil)",
    nativeLabel: "Portugu\u00eas (Brasil)",
    localeBase: "pt",
    defaultRegion: "BR",
  },
  {
    code: "es",
    englishLabel: "Spanish",
    nativeLabel: "Espa\u00f1ol",
    localeBase: "es",
    defaultRegion: "ES",
  },
  {
    code: "es-MX",
    englishLabel: "Spanish (Mexico)",
    nativeLabel: "Espa\u00f1ol (M\u00e9xico)",
    localeBase: "es",
    defaultRegion: "MX",
  },
  {
    code: "ru",
    englishLabel: "Russian",
    nativeLabel: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
    localeBase: "ru",
    defaultRegion: "RU",
  },
  {
    code: "zh-Hans",
    englishLabel: "Chinese (Simplified)",
    nativeLabel: "\u7b80\u4f53\u4e2d\u6587",
    localeBase: "zh-Hans",
    defaultRegion: "CN",
  },
  {
    code: "zh-Hant",
    englishLabel: "Chinese (Traditional)",
    nativeLabel: "\u7e41\u9ad4\u4e2d\u6587",
    localeBase: "zh-Hant",
    defaultRegion: "TW",
  },
  {
    code: "vi",
    englishLabel: "Vietnamese",
    nativeLabel: "Ti\u1ebfng Vi\u1ec7t",
    localeBase: "vi",
    defaultRegion: "VN",
  },
] as const;

export const DEFAULT_LANGUAGE: AppLanguage = "en-US";

function normalizeLanguageInput(input?: string | null) {
  return String(input ?? "").trim().replace(/_/g, "-").toLowerCase();
}

function normalizeCountryCode(input?: string | null) {
  return String(input ?? "").trim().toUpperCase();
}

export function resolveSupportedLanguage(input?: string | null): AppLanguage {
  const normalized = normalizeLanguageInput(input);

  if (!normalized) {
    return DEFAULT_LANGUAGE;
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en-US";
  }

  if (normalized === "ar" || normalized.startsWith("ar-")) {
    return "ar";
  }

  if (normalized === "sv" || normalized.startsWith("sv-")) {
    return "sv";
  }

  if (normalized === "de" || normalized.startsWith("de-")) {
    return "de";
  }

  if (normalized === "it" || normalized.startsWith("it-")) {
    return "it";
  }

  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja";
  }

  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }

  if (normalized === "fr" || normalized.startsWith("fr-")) {
    return "fr";
  }

  if (normalized === "pt" || normalized === "pt-pt" || normalized.startsWith("pt-pt")) {
    return "pt";
  }

  if (normalized === "pt-br" || normalized.startsWith("pt-br")) {
    return "pt-BR";
  }

  if (normalized.startsWith("pt-")) {
    return "pt";
  }

  if (normalized === "es-mx" || normalized.startsWith("es-mx")) {
    return "es-MX";
  }

  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es";
  }

  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }

  if (
    normalized === "zh-hans"
    || normalized.includes("hans")
    || normalized.startsWith("zh-cn")
    || normalized.startsWith("zh-sg")
  ) {
    return "zh-Hans";
  }

  if (
    normalized === "zh-hant"
    || normalized.includes("hant")
    || normalized.startsWith("zh-tw")
    || normalized.startsWith("zh-hk")
    || normalized.startsWith("zh-mo")
  ) {
    return "zh-Hant";
  }

  if (normalized === "vi" || normalized.startsWith("vi-")) {
    return "vi";
  }

  if (normalized.startsWith("zh-")) {
    return "zh-Hans";
  }

  return DEFAULT_LANGUAGE;
}

export function resolveSupportedLanguageFromLocales(locales?: readonly Locale[]) {
  for (const locale of locales ?? []) {
    const regionCode = normalizeCountryCode(locale.regionCode);

    if (regionCode === "US") return "en-US";
    if (regionCode === "SE") return "sv";
    if (regionCode === "DE") return "de";
    if (regionCode === "IT") return "it";
    if (regionCode === "JP") return "ja";
    if (regionCode === "KR") return "ko";
    if (regionCode === "FR") return "fr";
    if (regionCode === "PT") return "pt";
    if (regionCode === "BR") return "pt-BR";
    if (regionCode === "MX") return "es-MX";
    if (regionCode === "RU") return "ru";
    if (regionCode === "TW" || regionCode === "HK" || regionCode === "MO") return "zh-Hant";
    if (regionCode === "VN") return "vi";

    const candidate = resolveSupportedLanguage(
      locale.languageTag
        ?? locale.languageCode
        ?? null,
    );

    if (SUPPORTED_LANGUAGES.includes(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function getDeviceSupportedLanguage(): AppLanguage {
  return resolveSupportedLanguageFromLocales(getLocales());
}

export function getInitialSupportedLanguage(): AppLanguage {
  return getDeviceSupportedLanguage();
}

export function getSupportedLanguageOption(language?: string | null) {
  const resolvedLanguage = resolveSupportedLanguage(language);
  return (
    SUPPORTED_LANGUAGE_OPTIONS.find((option) => option.code === resolvedLanguage)
    ?? SUPPORTED_LANGUAGE_OPTIONS[0]
  );
}

export function getLanguageNativeLabel(language?: string | null) {
  return getSupportedLanguageOption(language).nativeLabel;
}

export function getLanguageEnglishLabel(language?: string | null) {
  return getSupportedLanguageOption(language).englishLabel;
}

export function getLanguageLocaleTag(language?: string | null, regionCode?: string | null) {
  const option = getSupportedLanguageOption(language);
  const normalizedRegionCode = normalizeCountryCode(regionCode) || option.defaultRegion;
  return `${option.localeBase}-${normalizedRegionCode}`;
}

export function isCjkLanguage(language?: string | null) {
  return ["ja", "ko", "zh-Hans", "zh-Hant"].includes(resolveSupportedLanguage(language));
}

export function isRtlLanguage(language?: string | null) {
  return resolveSupportedLanguage(language) === "ar";
}

function getCjkFallbackFontFamily(language: AppLanguage) {
  if (Platform.OS === "ios") {
    if (language === "ja") return "Hiragino Sans";
    if (language === "ko") return "Apple SD Gothic Neo";
    return "PingFang SC";
  }

  return "sans-serif";
}

function getFontWeight(weight: "regular" | "medium" | "semibold" | "bold") {
  if (weight === "regular") return "400" as const;
  if (weight === "medium") return "500" as const;
  if (weight === "semibold") return "600" as const;
  return "700" as const;
}

export function getLocalizedFonts(language?: string | null) {
  const resolvedLanguage = resolveSupportedLanguage(language);
  const fontFamily = isCjkLanguage(resolvedLanguage)
    ? getCjkFallbackFontFamily(resolvedLanguage)
    : isRtlLanguage(resolvedLanguage)
      ? Platform.select({
          ios: "Geeza Pro",
          android: "sans-serif",
          default: "sans-serif",
        }) ?? "sans-serif"
    : "Inter";
  const italicFontFamily = fontFamily === "Inter" ? "Inter-Italic" : fontFamily;

  return {
    regular: {
      fontFamily,
      fontWeight: getFontWeight("regular"),
    },
    medium: {
      fontFamily,
      fontWeight: getFontWeight("medium"),
    },
    semibold: {
      fontFamily,
      fontWeight: getFontWeight("semibold"),
    },
    bold: {
      fontFamily,
      fontWeight: getFontWeight("bold"),
    },
    italic: {
      fontFamily: italicFontFamily,
      fontWeight: getFontWeight("regular"),
      fontStyle: fontFamily === "Inter" ? ("normal" as const) : ("italic" as const),
    },
  };
}
