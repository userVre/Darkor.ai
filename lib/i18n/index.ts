import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getDeviceSupportedLanguage,
  resolveSupportedLanguage,
  type AppLanguage,
} from "./language";

const LANGUAGE_STORAGE_KEY = "darkor.ai.language";

const resources: Resource = {
  "en-US": { translation: require("../../locales/en.json") },
  fr: { translation: require("../../locales/fr.json") },
  "es-MX": { translation: require("../../locales/es-MX.json") },
  "pt-BR": { translation: require("../../locales/pt-BR.json") },
  ru: { translation: require("../../locales/ru.json") },
  ko: { translation: require("../../locales/ko.json") },
  vi: { translation: require("../../locales/vi.json") },
  "zh-Hans": { translation: require("../../locales/zh-Hans.json") },
  "zh-Hant": { translation: require("../../locales/zh-Hant.json") },
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
        supportedLngs: [...SUPPORTED_LANGUAGES],
        lng: language,
        load: "currentOnly",
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
