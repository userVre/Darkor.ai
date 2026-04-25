import AsyncStorage from "@react-native-async-storage/async-storage";
import {getLocales, useLocales, type Locale} from "expo-localization";
import {useSyncExternalStore} from "react";

import {
DEFAULT_LANGUAGE,
resolveSupportedLanguage,
type AppLanguage,
} from "./i18n/language";

export const GEO_INTELLIGENCE_STORAGE_KEY = "homedecor.ai.geo-intelligence.v1";

export type GeoIntelligenceSnapshot = {
  regionCode: string;
  languageCode: string;
  languageTag: string;
  resolvedLanguage: AppLanguage;
  detectedAt: number;
  source: "device" | "stored";
};

type StoredGeoIntelligenceSnapshot = Omit<GeoIntelligenceSnapshot, "source">;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalizeRegionCode(input?: string | null) {
  return String(input ?? "").trim().toUpperCase();
}

function pickPrimaryLocale(locales?: readonly Locale[]) {
  return locales?.[0] ?? getLocales()[0];
}

function resolveRegionCode(locale?: Locale | null) {
  const directRegion = normalizeRegionCode(locale?.regionCode);
  if (directRegion.length === 2) {
    return directRegion;
  }

  const languageRegion = normalizeRegionCode(locale?.languageRegionCode);
  if (languageRegion.length === 2) {
    return languageRegion;
  }

  const fromTag = String(locale?.languageTag ?? "")
    .split("-")
    .find((part) => /^[A-Za-z]{2}$/.test(part));
  const normalizedFromTag = normalizeRegionCode(fromTag);
  if (normalizedFromTag.length === 2) {
    return normalizedFromTag;
  }

  return "US";
}

function resolveGeoLanguage(locale?: Locale | null, regionCode?: string | null) {
  const normalizedRegionCode = normalizeRegionCode(regionCode);

  if (normalizedRegionCode === "FR") {
    return "fr" as const;
  }

  if (normalizedRegionCode === "US" || normalizedRegionCode === "GB") {
    return "en-US" as const;
  }

  if (normalizedRegionCode === "SE") {
    return "sv" as const;
  }

  const candidate = resolveSupportedLanguage(
    locale?.languageTag
      ?? locale?.languageCode
      ?? null,
  );

  return candidate || DEFAULT_LANGUAGE;
}

export function detectGeoIntelligence(locales?: readonly Locale[]): GeoIntelligenceSnapshot {
  const locale = pickPrimaryLocale(locales);
  const regionCode = resolveRegionCode(locale);
  const languageTag = String(locale?.languageTag ?? locale?.languageCode ?? DEFAULT_LANGUAGE);
  const languageCode = String(locale?.languageCode ?? languageTag.split("-")[0] ?? "en").trim().toLowerCase() || "en";

  return {
    regionCode,
    languageCode,
    languageTag,
    resolvedLanguage: resolveGeoLanguage(locale, regionCode),
    detectedAt: Date.now(),
    source: "device",
  };
}

let currentSnapshot: GeoIntelligenceSnapshot = detectGeoIntelligence();

function sanitizeStoredSnapshot(
  snapshot?: Partial<StoredGeoIntelligenceSnapshot> | null,
): GeoIntelligenceSnapshot | null {
  if (!snapshot) {
    return null;
  }

  const regionCode = normalizeRegionCode(snapshot.regionCode);
  const languageTag = String(snapshot.languageTag ?? "").trim();
  if (regionCode.length !== 2 || !languageTag) {
    return null;
  }

  return {
    regionCode,
    languageCode: String(snapshot.languageCode ?? languageTag.split("-")[0] ?? "en").trim().toLowerCase() || "en",
    languageTag,
    resolvedLanguage: resolveSupportedLanguage(snapshot.resolvedLanguage ?? languageTag),
    detectedAt: typeof snapshot.detectedAt === "number" && Number.isFinite(snapshot.detectedAt) ? snapshot.detectedAt : Date.now(),
    source: "stored",
  };
}

function snapshotsEqual(left: GeoIntelligenceSnapshot, right: GeoIntelligenceSnapshot) {
  return (
    left.regionCode === right.regionCode
    && left.languageCode === right.languageCode
    && left.languageTag === right.languageTag
    && left.resolvedLanguage === right.resolvedLanguage
    && left.detectedAt === right.detectedAt
    && left.source === right.source
  );
}

async function persistSnapshot(snapshot: GeoIntelligenceSnapshot) {
  const storedSnapshot: StoredGeoIntelligenceSnapshot = {
    regionCode: snapshot.regionCode,
    languageCode: snapshot.languageCode,
    languageTag: snapshot.languageTag,
    resolvedLanguage: snapshot.resolvedLanguage,
    detectedAt: snapshot.detectedAt,
  };

  await AsyncStorage.setItem(GEO_INTELLIGENCE_STORAGE_KEY, JSON.stringify(storedSnapshot));
}

async function readStoredSnapshot() {
  try {
    const raw = await AsyncStorage.getItem(GEO_INTELLIGENCE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return sanitizeStoredSnapshot(JSON.parse(raw) as StoredGeoIntelligenceSnapshot);
  } catch {
    return null;
  }
}

function setCurrentSnapshot(snapshot: GeoIntelligenceSnapshot) {
  if (snapshotsEqual(currentSnapshot, snapshot)) {
    return;
  }

  currentSnapshot = snapshot;
  emitChange();
}

export async function initializeGeoIntelligence() {
  const storedSnapshot = await readStoredSnapshot();
  if (storedSnapshot) {
    setCurrentSnapshot(storedSnapshot);
    return storedSnapshot;
  }

  const detectedSnapshot = detectGeoIntelligence();
  await persistSnapshot(detectedSnapshot);
  setCurrentSnapshot(detectedSnapshot);
  return detectedSnapshot;
}

export async function syncGeoIntelligenceWithDevice(locales?: readonly Locale[]) {
  const nextSnapshot = detectGeoIntelligence(locales);
  await persistSnapshot(nextSnapshot);
  setCurrentSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function getGeoIntelligenceSnapshot() {
  return currentSnapshot;
}

export function useGeoIntelligence() {
  const locales = useLocales();

  return useSyncExternalStore(
    subscribe,
    () => getGeoIntelligenceSnapshot(),
    () => detectGeoIntelligence(locales),
  );
}
