import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { type Resource } from "i18next";
import { useMemo, useSyncExternalStore } from "react";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getDeviceSupportedLanguage,
  getLocalizedFonts,
  resolveSupportedLanguage,
  type AppLanguage,
} from "./language";

const LANGUAGE_PREFERENCE_STORAGE_KEY = "homedecor.ai.language.preference.v2";
const LEGACY_LANGUAGE_STORAGE_KEY = "homedecor.ai.language";
const LEGACY_DARKOR_LANGUAGE_STORAGE_KEY = "darkor.ai.language";

type StoredLanguagePreference =
  | {
      mode: "auto";
      language?: null;
    }
  | {
      mode: "manual";
      language: AppLanguage;
    };

export type AppLanguagePreferenceSnapshot = {
  mode: StoredLanguagePreference["mode"];
  manualLanguage: AppLanguage | null;
  resolvedLanguage: AppLanguage;
};

const DEFAULT_LANGUAGE_PREFERENCE: StoredLanguagePreference = {
  mode: "auto",
};

const resources: Resource = {
  "en-US": { translation: require("../../locales/en.json") },
  fr: { translation: require("../../locales/fr.json") },
  es: { translation: require("../../locales/es.json") },
  de: { translation: require("../../locales/de.json") },
  pt: { translation: require("../../locales/pt.json") },
  ru: { translation: require("../../locales/ru.json") },
  sv: { translation: require("../../locales/en.json") },
  ja: { translation: require("../../locales/ja.json") },
  ko: { translation: require("../../locales/ko.json") },
  "zh-Hans": { translation: require("../../locales/zh-Hans.json") },
};

let initPromise: Promise<typeof i18n> | null = null;
let currentPreference: StoredLanguagePreference = DEFAULT_LANGUAGE_PREFERENCE;
let cachedSnapshot: AppLanguagePreferenceSnapshot | null = null;
const listeners = new Set<() => void>();

function emitPreferenceChange() {
  listeners.forEach((listener) => listener());
}

function arePreferencesEqual(
  left: StoredLanguagePreference,
  right: StoredLanguagePreference,
) {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "manual" && right.mode === "manual") {
    return left.language === right.language;
  }

  return true;
}

function getResolvedI18nLanguage() {
  return resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
}

function resolveLanguageFromPreference(preference: StoredLanguagePreference) {
  if (preference.mode === "manual") {
    return resolveSupportedLanguage(preference.language);
  }

  return getDeviceSupportedLanguage();
}

function parseStoredPreference(rawValue?: string | null): StoredLanguagePreference | null {
  const trimmedValue = String(rawValue ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedValue) as {
      mode?: string;
      language?: string | null;
    };

    if (parsed?.mode === "auto") {
      return { mode: "auto" };
    }

    if (parsed?.mode === "manual" && parsed.language) {
      return {
        mode: "manual",
        language: resolveSupportedLanguage(parsed.language),
      };
    }
  } catch {
    return {
      mode: "manual",
      language: resolveSupportedLanguage(trimmedValue),
    };
  }

  return null;
}

async function readStoredLanguagePreference(): Promise<StoredLanguagePreference> {
  try {
    const storedPreference =
      parseStoredPreference(await AsyncStorage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY))
      ?? parseStoredPreference(await AsyncStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY))
      ?? parseStoredPreference(await AsyncStorage.getItem(LEGACY_DARKOR_LANGUAGE_STORAGE_KEY));

    return storedPreference ?? DEFAULT_LANGUAGE_PREFERENCE;
  } catch {
    return DEFAULT_LANGUAGE_PREFERENCE;
  }
}

async function persistLanguagePreference(preference: StoredLanguagePreference) {
  try {
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Ignore persistence errors so app boot is never blocked.
  }
}

function setCurrentPreference(preference: StoredLanguagePreference) {
  if (arePreferencesEqual(currentPreference, preference)) {
    return false;
  }

  currentPreference = preference;
  emitPreferenceChange();
  return true;
}

function getSnapshot(): AppLanguagePreferenceSnapshot {
  const resolvedLanguage =
    i18n.isInitialized
      ? resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language)
      : resolveLanguageFromPreference(currentPreference);

  const nextSnapshot: AppLanguagePreferenceSnapshot = {
    mode: currentPreference.mode,
    manualLanguage: currentPreference.mode === "manual" ? currentPreference.language : null,
    resolvedLanguage,
  };

  if (
    cachedSnapshot
    && cachedSnapshot.mode === nextSnapshot.mode
    && cachedSnapshot.manualLanguage === nextSnapshot.manualLanguage
    && cachedSnapshot.resolvedLanguage === nextSnapshot.resolvedLanguage
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = nextSnapshot;
  return nextSnapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function initializeI18n() {
  if (i18n.isInitialized) {
    return i18n;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const storedPreference = await readStoredLanguagePreference();
      currentPreference = storedPreference;
      const language = resolveLanguageFromPreference(storedPreference);

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

      emitPreferenceChange();
      return i18n;
    })();
  }

  return initPromise;
}

async function applyLanguagePreference(preference: StoredLanguagePreference) {
  if (!i18n.isInitialized) {
    await initializeI18n();
  }

  const resolvedLanguage = resolveLanguageFromPreference(preference);

  if (getResolvedI18nLanguage() !== resolvedLanguage) {
    await i18n.changeLanguage(resolvedLanguage);
  }

  setCurrentPreference(preference);
  await persistLanguagePreference(preference);

  return resolvedLanguage;
}

export async function setAppLanguage(language: string) {
  return applyLanguagePreference({
    mode: "manual",
    language: resolveSupportedLanguage(language),
  });
}

export async function setAppLanguageToSystemDefault() {
  return applyLanguagePreference({
    mode: "auto",
  });
}

export async function syncAppLanguageWithSystem() {
  if (!i18n.isInitialized || currentPreference.mode !== "auto") {
    return getSnapshot().resolvedLanguage;
  }

  const resolvedLanguage = resolveLanguageFromPreference(currentPreference);

  if (getResolvedI18nLanguage() === resolvedLanguage) {
    return resolvedLanguage;
  }

  await i18n.changeLanguage(resolvedLanguage);
  emitPreferenceChange();
  return resolvedLanguage;
}

export function getAppLanguagePreferenceSnapshot() {
  return getSnapshot();
}

export function useAppLanguagePreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useLocalizedAppFonts() {
  const preference = useAppLanguagePreference();
  return useMemo(
    () => getLocalizedFonts(preference.resolvedLanguage),
    [preference.resolvedLanguage],
  );
}

export { LANGUAGE_PREFERENCE_STORAGE_KEY };
export default i18n;
