import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE, getDeviceSupportedLanguage, resolveSupportedLanguage, type AppLanguage } from "./language";

const LANGUAGE_STORAGE_KEY = "darkor.ai.language";

const resources: Resource = {
  en: { translation: require("../../locales/en.json") },
  fr: { translation: require("../../locales/fr.json") },
  es: { translation: require("../../locales/es.json") },
  de: { translation: require("../../locales/de.json") },
  pt: { translation: require("../../locales/pt.json") },
  it: { translation: require("../../locales/it.json") },
  ja: { translation: require("../../locales/ja.json") },
  ko: { translation: require("../../locales/ko.json") },
};

let initPromise: Promise<typeof i18n> | null = null;

async function getStoredLanguagePreference(): Promise<AppLanguage | null> {
  try {
    const storedValue = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedValue ? resolveSupportedLanguage(storedValue) : null;
  } catch {
    return null;
  }
}

async function persistLanguagePreference(language: AppLanguage) {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore persistence errors so app boot is never blocked.
  }
}

async function detectInitialLanguage() {
  const storedLanguage = await getStoredLanguagePreference();
  return storedLanguage ?? getDeviceSupportedLanguage();
}

export async function initializeI18n() {
  if (i18n.isInitialized) {
    return i18n;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const language = await detectInitialLanguage();

      await i18n.use(initReactI18next).init({
        compatibilityJSON: "v4",
        fallbackLng: DEFAULT_LANGUAGE,
        lng: language,
        resources,
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });

      await persistLanguagePreference(language);
      return i18n;
    })();
  }

  return initPromise;
}

export async function setAppLanguage(language: string) {
  const nextLanguage = resolveSupportedLanguage(language);

  if (!i18n.isInitialized) {
    await initializeI18n();
  }

  await i18n.changeLanguage(nextLanguage);
  await persistLanguagePreference(nextLanguage);
  return nextLanguage;
}

export { LANGUAGE_STORAGE_KEY };
export default i18n;
