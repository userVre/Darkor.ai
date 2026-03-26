import { env as expoEnv } from "expo/virtual/env";
import Constants from "expo-constants";

import { resolvePublicEndpoint } from "./public-endpoints";

type EnvSnapshot = {
  clerkPublishableKey?: string;
  convexUrl?: string;
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
  revenueCatKey?: string;
  apiBaseUrl?: string;
};

type EnvReport = {
  ok: boolean;
  missing: string[];
  values: EnvSnapshot;
};

const requiredKeys = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CONVEX_URL",
] as const;

type PublicEnvKey =
  | "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
  | "EXPO_PUBLIC_CONVEX_URL"
  | "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"
  | "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"
  | "EXPO_PUBLIC_REVENUECAT_API_KEY"
  | "EXPO_PUBLIC_API_BASE_URL";

let didLog = false;

const runtimePublicEnv = (
  (Constants.expoConfig?.extra as { publicEnv?: Partial<Record<PublicEnvKey, string>> } | undefined)?.publicEnv ??
  ((Constants as unknown as {
    manifest2?: { extra?: { expoClient?: { extra?: { publicEnv?: Partial<Record<PublicEnvKey, string>> } } } };
    manifest?: { extra?: { publicEnv?: Partial<Record<PublicEnvKey, string>> } };
  }).manifest2?.extra?.expoClient?.extra?.publicEnv) ??
  ((Constants as unknown as {
    manifest?: { extra?: { publicEnv?: Partial<Record<PublicEnvKey, string>> } };
  }).manifest?.extra?.publicEnv) ??
  {}
) as Partial<Record<PublicEnvKey, string>>;

function resolveEnv(key: PublicEnvKey) {
  return runtimePublicEnv[key] ?? expoEnv[key] ?? process.env[key];
}

export function getEnvReport(): EnvReport {
  let convexUrl: string | undefined;
  let apiBaseUrl: string | undefined;

  try {
    convexUrl = resolvePublicEndpoint(resolveEnv("EXPO_PUBLIC_CONVEX_URL"), "EXPO_PUBLIC_CONVEX_URL");
  } catch {
    convexUrl = undefined;
  }

  try {
    apiBaseUrl = resolvePublicEndpoint(resolveEnv("EXPO_PUBLIC_API_BASE_URL"), "EXPO_PUBLIC_API_BASE_URL");
  } catch {
    apiBaseUrl = undefined;
  }

  const values: EnvSnapshot = {
    clerkPublishableKey: resolveEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    convexUrl,
    revenueCatIosKey: resolveEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"),
    revenueCatAndroidKey: resolveEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"),
    revenueCatKey: resolveEnv("EXPO_PUBLIC_REVENUECAT_API_KEY"),
    apiBaseUrl,
  };

  const missing: string[] = [];
  for (const key of requiredKeys) {
    try {
      const value = resolveEnv(key);
      if (key === "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") {
        if (!value?.trim()) {
          missing.push(key);
        }
        continue;
      }

      if (!resolvePublicEndpoint(value, key)) {
        missing.push(key);
      }
    } catch {
      missing.push(key);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    values,
  };
}

export function logEnvDiagnostics(report: EnvReport) {
  if (didLog) return;
  didLog = true;
  const missing = report.missing;

  if (missing.length) {
    console.warn("[Env] Missing required environment variables:", missing);
  }
}

export function getEnvValue(key: keyof EnvSnapshot) {
  return getEnvReport().values[key];
}

export function hasRequiredEnv() {
  return getEnvReport().ok;
}
