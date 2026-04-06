import { getLocales } from "expo-localization";
import { Platform } from "react-native";

export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "de", "pt", "it", "ja", "ko"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";

const CJK_LANGUAGES = new Set<AppLanguage>(["ja", "ko"]);

export function resolveSupportedLanguage(input?: string | null): AppLanguage {
  if (!input) {
    return DEFAULT_LANGUAGE;
  }

  const normalized = input.toLowerCase().replace("_", "-");
  const directMatch = SUPPORTED_LANGUAGES.find((language) => language === normalized);
  if (directMatch) {
    return directMatch;
  }

  const baseLanguage = normalized.split("-")[0] ?? "";
  const baseMatch = SUPPORTED_LANGUAGES.find((language) => language === baseLanguage);
  return baseMatch ?? DEFAULT_LANGUAGE;
}

export function getDeviceSupportedLanguage(): AppLanguage {
  const locales = getLocales();

  for (const locale of locales) {
    const candidate = resolveSupportedLanguage(
      locale.languageTag ?? locale.languageCode ?? locale.regionCode ?? null,
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

function getSystemFontFamily(language: AppLanguage, weight: "regular" | "medium" | "semibold" | "bold") {
  if (language === "ja") {
    if (Platform.OS === "ios") return "Hiragino Sans";
    if (Platform.OS === "android") return "Noto Sans CJK JP";
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

  return {
    regular: {
      fontFamily: getSystemFontFamily(resolvedLanguage, "regular"),
      fontWeight: getFontWeight("regular"),
    },
    medium: {
      fontFamily: getSystemFontFamily(resolvedLanguage, "medium"),
      fontWeight: getFontWeight("medium"),
    },
    semibold: {
      fontFamily: getSystemFontFamily(resolvedLanguage, "semibold"),
      fontWeight: getFontWeight("semibold"),
    },
    bold: {
      fontFamily: getSystemFontFamily(resolvedLanguage, "bold"),
      fontWeight: getFontWeight("bold"),
    },
    italic: {
      fontFamily: useSystemFamily ? getSystemFontFamily(resolvedLanguage, "regular") : "Inter-Italic",
      fontWeight: getFontWeight("regular"),
      fontStyle: useSystemFamily ? ("italic" as const) : ("normal" as const),
    },
  };
}
