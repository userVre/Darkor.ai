import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Calendar, Locale} from "expo-localization";
import i18n, {type Resource} from "i18next";
import {useMemo, useSyncExternalStore} from "react";
import {initReactI18next} from "react-i18next";
import {I18nManager} from "react-native";
import {
getGeoIntelligenceSnapshot,
initializeGeoIntelligence,
syncGeoIntelligenceWithDevice,
} from "../geo-intelligence";

import {
DEFAULT_LANGUAGE,
SUPPORTED_LANGUAGES,
getLocalizedFonts,
isRtlLanguage,
resolveSupportedLanguage,
type AppLanguage,
} from "./language";

const LANGUAGE_PREFERENCE_STORAGE_KEY = "homedecor.ai.language.preference.v2";
const RTL_PREFERENCE_STORAGE_KEY = "homedecor.ai.layout.rtl.v1";
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
  isRTL: boolean;
};

const DEFAULT_LANGUAGE_PREFERENCE: StoredLanguagePreference = {
  mode: "auto",
};

const resources: Resource = {
  "en-US": { translation: require("../../locales/en.json") },
  ar: { translation: require("../../locales/ar.json") },
  sv: { translation: require("../../locales/sv.json") },
  de: { translation: require("../../locales/de.json") },
  it: { translation: require("../../locales/it.json") },
  ja: { translation: require("../../locales/ja.json") },
  ko: { translation: require("../../locales/ko.json") },
  fr: { translation: require("../../locales/fr.json") },
  es: { translation: require("../../locales/es.json") },
  "es-MX": { translation: require("../../locales/es-MX.json") },
  ru: { translation: require("../../locales/ru.json") },
  pt: { translation: require("../../locales/pt.json") },
  "pt-BR": { translation: require("../../locales/pt-BR.json") },
  "zh-Hans": { translation: require("../../locales/zh-Hans.json") },
  "zh-Hant": { translation: require("../../locales/zh-Hant.json") },
  vi: { translation: require("../../locales/vi.json") },
};

let initPromise: Promise<typeof i18n> | null = null;
let currentPreference: StoredLanguagePreference = DEFAULT_LANGUAGE_PREFERENCE;
let currentIsRTL = I18nManager.isRTL;
let cachedSnapshot: AppLanguagePreferenceSnapshot | null = null;
const listeners = new Set<() => void>();
let i18nEventsBound = false;

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

function readBooleanPreference(rawValue?: string | null) {
  const trimmedValue = String(rawValue ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue === "true") return true;
  if (trimmedValue === "false") return false;

  try {
    const parsed = JSON.parse(trimmedValue) as boolean | { isRTL?: boolean };
    if (typeof parsed === "boolean") {
      return parsed;
    }

    if (typeof parsed?.isRTL === "boolean") {
      return parsed.isRTL;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveLanguageFromPreference(preference: StoredLanguagePreference) {
  if (preference.mode === "manual") {
    return resolveSupportedLanguage(preference.language);
  }

  return getGeoIntelligenceSnapshot().resolvedLanguage;
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

async function readStoredRtlPreference() {
  try {
    return readBooleanPreference(await AsyncStorage.getItem(RTL_PREFERENCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

async function persistLanguagePreference(preference: StoredLanguagePreference) {
  try {
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Ignore persistence errors so app boot is never blocked.
  }
}

async function persistRtlPreference(isRTL: boolean) {
  try {
    await AsyncStorage.setItem(RTL_PREFERENCE_STORAGE_KEY, JSON.stringify({ isRTL }));
  } catch {
    // Ignore persistence errors so app boot is never blocked.
  }
}

function applyLayoutDirection(isRTL: boolean) {
  currentIsRTL = isRTL;
  I18nManager.allowRTL(isRTL);
  I18nManager.swapLeftAndRightInRTL(true);

  const directionChanged = I18nManager.isRTL !== isRTL;
  if (directionChanged) {
    I18nManager.forceRTL(isRTL);
  }

  return directionChanged;
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
    isRTL: currentIsRTL,
  };

  if (
    cachedSnapshot
    && cachedSnapshot.mode === nextSnapshot.mode
    && cachedSnapshot.manualLanguage === nextSnapshot.manualLanguage
    && cachedSnapshot.resolvedLanguage === nextSnapshot.resolvedLanguage
    && cachedSnapshot.isRTL === nextSnapshot.isRTL
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

function bindI18nEvents() {
  if (i18nEventsBound) {
    return;
  }

  i18n.on("initialized", () => {
    emitPreferenceChange();
  });

  i18n.on("languageChanged", () => {
    emitPreferenceChange();
  });

  i18nEventsBound = true;
}

export async function initializeI18n() {
  if (i18n.isInitialized) {
    bindI18nEvents();
    return i18n;
  }

  if (!initPromise) {
    initPromise = (async () => {
      await initializeGeoIntelligence();
      const storedPreference = await readStoredLanguagePreference();
      currentPreference = storedPreference;
      const language = resolveLanguageFromPreference(storedPreference);
      const storedRtlPreference = await readStoredRtlPreference();
      applyLayoutDirection(storedRtlPreference ?? isRtlLanguage(language));

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

  bindI18nEvents();
  return initPromise;
}

async function applyLanguagePreference(preference: StoredLanguagePreference) {
  if (!i18n.isInitialized) {
    await initializeI18n();
  }

  const resolvedLanguage = resolveLanguageFromPreference(preference);
  const shouldUseRTL = isRtlLanguage(resolvedLanguage);
  const layoutDirectionChanged = applyLayoutDirection(shouldUseRTL);
  const preferenceChanged = setCurrentPreference(preference);

  if (getResolvedI18nLanguage() !== resolvedLanguage) {
    await i18n.changeLanguage(resolvedLanguage);
  }

  await persistLanguagePreference(preference);
  await persistRtlPreference(shouldUseRTL);
  if (preferenceChanged) {
    emitPreferenceChange();
  }

  return {
    resolvedLanguage,
    isRTL: shouldUseRTL,
    layoutDirectionChanged,
  };
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

export async function syncAppLanguageWithSystem(
  locales?: readonly Locale[],
  calendars?: readonly Calendar[],
) {
  await syncGeoIntelligenceWithDevice(locales, calendars);

  if (!i18n.isInitialized || currentPreference.mode !== "auto") {
    return {
      resolvedLanguage: getSnapshot().resolvedLanguage,
      isRTL: getSnapshot().isRTL,
      layoutDirectionChanged: false,
    };
  }

  return applyLanguagePreference({
    mode: "auto",
  });
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

export {LANGUAGE_PREFERENCE_STORAGE_KEY};
export default i18n;
