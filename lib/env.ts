import Constants from "expo-constants";
import {env as expoEnv} from "expo/virtual/env";

import {resolvePublicEndpoint} from "./public-endpoints";

type EnvSnapshot = {
  clerkPublishableKey?: string;
  convexUrl?: string;
  convexSiteUrl?: string;
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
  revenueCatKey?: string;
  appUrl?: string;
  apiBaseUrl?: string;
  posthogApiKey?: string;
  posthogHost?: string;
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
  | "EXPO_PUBLIC_CONVEX_SITE_URL"
  | "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"
  | "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"
  | "EXPO_PUBLIC_REVENUECAT_API_KEY"
  | "EXPO_PUBLIC_APP_URL"
  | "EXPO_PUBLIC_API_BASE_URL"
  | "EXPO_PUBLIC_POSTHOG_API_KEY"
  | "EXPO_PUBLIC_POSTHOG_HOST"
  | "EXPO_PUBLIC_DISABLE_VIDEO"
  | "EXPO_PUBLIC_REVIEW_FORCE";

type RuntimeEnvKey = PublicEnvKey;
type ExpoExtraEnv = Partial<Record<RuntimeEnvKey, string>> & {
  publicEnv?: Partial<Record<RuntimeEnvKey, string>>;
};

let didLog = false;

function normalizeEnvValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readExtraEnvValues(extra: ExpoExtraEnv | undefined, key: RuntimeEnvKey) {
  return [
    normalizeEnvValue(extra?.publicEnv?.[key]),
    normalizeEnvValue(extra?.[key]),
  ];
}

function uniqueValues(values: Array<string | undefined>) {
  return values.filter((value, index): value is string => Boolean(value) && values.indexOf(value) === index);
}

function readInlineEnvValues(key: RuntimeEnvKey) {
  return [
    normalizeEnvValue(process.env[key]),
    normalizeEnvValue(expoEnv?.[key]),
  ];
}

function resolveRuntimeExtraEnvCandidates(key: RuntimeEnvKey) {
  const constants = Constants as unknown as {
    expoConfig?: { extra?: ExpoExtraEnv };
    manifest2?: { extra?: ExpoExtraEnv & { expoClient?: { extra?: ExpoExtraEnv } } };
    manifest?: { extra?: ExpoExtraEnv & { expoClient?: { extra?: ExpoExtraEnv } } };
    __unsafeNoWarnManifest?: { extra?: ExpoExtraEnv & { expoClient?: { extra?: ExpoExtraEnv } } };
    __unsafeNoWarnManifest2?: { extra?: ExpoExtraEnv & { expoClient?: { extra?: ExpoExtraEnv } } };
  };
  const extras = [
    constants.expoConfig?.extra,
    constants.manifest2?.extra?.expoClient?.extra,
    constants.manifest2?.extra,
    constants.manifest?.extra?.expoClient?.extra,
    constants.manifest?.extra,
    constants.__unsafeNoWarnManifest2?.extra?.expoClient?.extra,
    constants.__unsafeNoWarnManifest2?.extra,
    constants.__unsafeNoWarnManifest?.extra?.expoClient?.extra,
    constants.__unsafeNoWarnManifest?.extra,
  ];

  return uniqueValues(extras.flatMap((extra) => readExtraEnvValues(extra, key)));
}

function resolveEnvCandidates(key: RuntimeEnvKey) {
  return uniqueValues([
    ...readInlineEnvValues(key),
    ...resolveRuntimeExtraEnvCandidates(key),
  ]);
}

function resolveEnv(key: PublicEnvKey) {
  return resolveEnvCandidates(key)[0];
}

function resolvePublicEndpointFromEnv(key: RuntimeEnvKey, label = key) {
  for (const candidate of resolveEnvCandidates(key)) {
    try {
      const endpoint = resolvePublicEndpoint(candidate, label);
      if (endpoint) {
        return endpoint;
      }
    } catch {
      // A stale EAS Update value should not block a valid value from Constants extras.
    }
  }

  return undefined;
}

export function getEnvReport(): EnvReport {
  let appUrl: string | undefined;
  let convexUrl: string | undefined;
  let convexSiteUrl: string | undefined;
  let apiBaseUrl: string | undefined;

  convexUrl = resolvePublicEndpointFromEnv("EXPO_PUBLIC_CONVEX_URL");
  convexSiteUrl = resolvePublicEndpointFromEnv("EXPO_PUBLIC_CONVEX_SITE_URL");

  appUrl = resolvePublicEndpointFromEnv("EXPO_PUBLIC_APP_URL");

  apiBaseUrl = resolvePublicEndpointFromEnv("EXPO_PUBLIC_API_BASE_URL");

  const values: EnvSnapshot = {
    clerkPublishableKey: resolveEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    convexUrl,
    convexSiteUrl,
    revenueCatIosKey: resolveEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"),
    revenueCatAndroidKey: resolveEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"),
    revenueCatKey: resolveEnv("EXPO_PUBLIC_REVENUECAT_API_KEY"),
    appUrl,
    apiBaseUrl,
    posthogApiKey: resolveEnv("EXPO_PUBLIC_POSTHOG_API_KEY"),
    posthogHost: resolveEnv("EXPO_PUBLIC_POSTHOG_HOST"),
  };

  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (key === "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") {
      if (!resolveEnv(key)?.trim()) {
        missing.push(key);
      }
      continue;
    }

    if (!resolvePublicEndpointFromEnv(key)) {
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
      "[Env] Missing required environment variables at startup; boot will keep retrying:",
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
