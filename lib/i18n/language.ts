import { getLocales } from "expo-localization";
import { Platform } from "react-native";

export const SUPPORTED_LANGUAGES = [
  "en-US",
  "fr",
  "es-MX",
  "pt-BR",
  "ru",
  "ko",
  "vi",
  "zh-Hans",
  "zh-Hant",
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en-US";

const CJK_LANGUAGES = new Set<AppLanguage>(["ko", "zh-Hans", "zh-Hant"]);

function normalizeLanguageInput(input?: string | null) {
  return String(input ?? "").trim().replace(/_/g, "-").toLowerCase();
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

  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es-MX";
  }

  if (normalized === "pt" || normalized.startsWith("pt-")) {
    return "pt-BR";
  }

  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }

  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }

  if (normalized === "vi" || normalized.startsWith("vi-")) {
    return "vi";
  }

  if (normalized === "zh-hant" || normalized.includes("hant")) {
    return "zh-Hant";
  }

  if (normalized === "zh-hans" || normalized.includes("hans")) {
    return "zh-Hans";
  }

  if (normalized.startsWith("zh-")) {
    if (
      normalized.includes("-tw")
      || normalized.includes("-hk")
      || normalized.includes("-mo")
    ) {
      return "zh-Hant";
    }

    return "zh-Hans";
  }

  return DEFAULT_LANGUAGE;
}

export function getDeviceSupportedLanguage(): AppLanguage {
  const locales = getLocales();

  for (const locale of locales) {
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

export function getInitialSupportedLanguage(): AppLanguage {
  return getDeviceSupportedLanguage();
}

export function isCjkLanguage(language?: string | null) {
  return CJK_LANGUAGES.has(resolveSupportedLanguage(language));
}

function getSystemFontFamily(language: AppLanguage) {
  if (language === "zh-Hans") {
    if (Platform.OS === "ios") return "PingFang SC";
    if (Platform.OS === "android") return "Noto Sans CJK SC";
    return "sans-serif";
  }

  if (language === "zh-Hant") {
    if (Platform.OS === "ios") return "PingFang TC";
    if (Platform.OS === "android") return "Noto Sans CJK TC";
    return "sans-serif";
  }

  if (language === "ko") {
    if (Platform.OS === "ios") return "Apple SD Gothic Neo";
    if (Platform.OS === "android") return "Noto Sans CJK KR";
    return "sans-serif";
  }

  return "Inter";
}

function getFontWeight(weight: "regular" | "medium" | "semibold" | "bold") {
  if (weight === "regular") return "400" as const;
  if (weight === "medium") return "500" as const;
  if (weight === "semibold") return "600" as const;
  return "700" as const;
}

export function getLocalizedFonts(language?: string | null) {
  const resolvedLanguage = resolveSupportedLanguage(language);
  const useSystemFamily = isCjkLanguage(resolvedLanguage);
  const fontFamily = getSystemFontFamily(resolvedLanguage);

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
      fontFamily: useSystemFamily ? fontFamily : "Inter-Italic",
      fontWeight: getFontWeight("regular"),
      fontStyle: useSystemFamily ? ("italic" as const) : ("normal" as const),
    },
  };
}
