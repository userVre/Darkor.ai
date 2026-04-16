import { getLocales, type Locale } from "expo-localization";
import { Platform } from "react-native";

export const SUPPORTED_LANGUAGES = [
  "en-US",
  "fr",
  "es",
  "de",
  "pt",
  "ru",
  "sv",
  "ja",
  "ko",
  "zh-Hans",
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
    code: "fr",
    englishLabel: "French",
    nativeLabel: "Français",
    localeBase: "fr",
    defaultRegion: "FR",
  },
  {
    code: "es",
    englishLabel: "Spanish",
    nativeLabel: "Español",
    localeBase: "es",
    defaultRegion: "ES",
  },
  {
    code: "de",
    englishLabel: "German",
    nativeLabel: "Deutsch",
    localeBase: "de",
    defaultRegion: "DE",
  },
  {
    code: "sv",
    englishLabel: "Swedish",
    nativeLabel: "Svenska",
    localeBase: "sv",
    defaultRegion: "SE",
  },
  {
    code: "zh-Hans",
    englishLabel: "Chinese (Simplified)",
    nativeLabel: "简体中文",
    localeBase: "zh-Hans",
    defaultRegion: "CN",
  },
  {
    code: "ru",
    englishLabel: "Russian",
    nativeLabel: "Русский",
    localeBase: "ru",
    defaultRegion: "RU",
  },
  {
    code: "pt",
    englishLabel: "Portuguese",
    nativeLabel: "Português",
    localeBase: "pt",
    defaultRegion: "PT",
  },
  {
    code: "ja",
    englishLabel: "Japanese",
    nativeLabel: "日本語",
    localeBase: "ja",
    defaultRegion: "JP",
  },
  {
    code: "ko",
    englishLabel: "Korean",
    nativeLabel: "한국어",
    localeBase: "ko",
    defaultRegion: "KR",
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

  if (normalized === "fr" || normalized.startsWith("fr-")) {
    return "fr";
  }

  if (normalized === "es" || normalized === "es-mx" || normalized.startsWith("es-")) {
    return "es";
  }

  if (normalized === "de" || normalized.startsWith("de-")) {
    return "de";
  }

  if (normalized === "pt" || normalized === "pt-br" || normalized.startsWith("pt-")) {
    return "pt";
  }

  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }

  if (normalized === "sv" || normalized.startsWith("sv-")) {
    return "sv";
  }

  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja";
  }

  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }

  if (
    normalized === "zh-hans"
    || normalized.includes("hans")
    || normalized === "zh-hant"
    || normalized.includes("hant")
    || normalized.startsWith("zh-")
  ) {
    return "zh-Hans";
  }

  return DEFAULT_LANGUAGE;
}

export function resolveSupportedLanguageFromLocales(locales?: readonly Locale[]) {
  for (const locale of locales ?? []) {
    const regionCode = normalizeCountryCode(locale.regionCode);

    if (regionCode === "US") {
      return "en-US";
    }

    if (regionCode === "FR") {
      return "fr";
    }

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
  return ["ja", "ko", "zh-Hans"].includes(resolveSupportedLanguage(language));
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
