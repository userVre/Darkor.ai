import Constants from "expo-constants";
import {env as expoEnv} from "expo/virtual/env";

import {resolvePublicEndpoint} from "./public-endpoints";

type EnvSnapshot = {
  clerkPublishableKey?: string;
  convexUrl?: string;
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
  revenueCatKey?: string;
  appUrl?: string;
  apiBaseUrl?: string;
};

type EnvReport = {
  ok: boolean;
  missing: string[];
  hasCriticalConfig: boolean;
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
  | "EXPO_PUBLIC_APP_URL"
  | "EXPO_PUBLIC_API_BASE_URL";

type RuntimeOnlyEnvKey = "NEXT_PUBLIC_APP_URL";
type RuntimeEnvKey = PublicEnvKey | RuntimeOnlyEnvKey;
type ExpoExtraEnv = Partial<Record<RuntimeEnvKey, string>> & {
  publicEnv?: Partial<Record<RuntimeEnvKey, string>>;
};

let didLog = false;

function normalizeEnvValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readExtraEnvValue(extra: ExpoExtraEnv | undefined, key: RuntimeEnvKey) {
  return normalizeEnvValue(extra?.publicEnv?.[key]) ?? normalizeEnvValue(extra?.[key]);
}

function resolveRuntimeExtraEnv(key: RuntimeEnvKey) {
  const constants = Constants as unknown as {
    expoConfig?: { extra?: ExpoExtraEnv };
    manifest2?: { extra?: ExpoExtraEnv & { expoClient?: { extra?: ExpoExtraEnv } } };
    manifest?: { extra?: ExpoExtraEnv };
  };
  const extras = [
    constants.expoConfig?.extra,
    constants.manifest2?.extra?.expoClient?.extra,
    constants.manifest2?.extra,
    constants.manifest?.extra,
  ];

  for (const extra of extras) {
    const value = readExtraEnvValue(extra, key);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function resolveEnv(key: PublicEnvKey) {
  return (
    normalizeEnvValue(process.env[key]) ??
    normalizeEnvValue(expoEnv[key]) ??
    resolveRuntimeExtraEnv(key)
  );
}

function resolveRuntimeOnlyEnv(key: RuntimeOnlyEnvKey) {
  return normalizeEnvValue(process.env[key]) ?? resolveRuntimeExtraEnv(key);
}

export function getEnvReport(): EnvReport {
  let appUrl: string | undefined;
  let convexUrl: string | undefined;
  let apiBaseUrl: string | undefined;

  try {
    convexUrl = resolvePublicEndpoint(resolveEnv("EXPO_PUBLIC_CONVEX_URL"), "EXPO_PUBLIC_CONVEX_URL");
  } catch {
    convexUrl = undefined;
  }

  try {
    appUrl = resolvePublicEndpoint(
      resolveEnv("EXPO_PUBLIC_APP_URL") ?? resolveRuntimeOnlyEnv("NEXT_PUBLIC_APP_URL"),
      "EXPO_PUBLIC_APP_URL",
    );
  } catch {
    appUrl = undefined;
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
    appUrl,
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
    hasCriticalConfig: Boolean(values.clerkPublishableKey && values.convexUrl),
    values,
  };
}

export function logEnvDiagnostics(report: EnvReport) {
  if (didLog) return;
  didLog = true;
  const missing = report.missing;

  if (missing.length) {
    console.warn(
      "[Env] Missing required environment variables at startup; boot will continue and retry env fallbacks:",
      missing,
    );
  }
}

export function getEnvValue(key: keyof EnvSnapshot) {
  return getEnvReport().values[key];
}

export function hasRequiredEnv() {
  return getEnvReport().ok;
}
