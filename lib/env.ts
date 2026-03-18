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

const optionalKeys = [
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_API_KEY",
  "EXPO_PUBLIC_API_BASE_URL",
] as const;

const fallbackKeys: Record<string, string> = {
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  EXPO_PUBLIC_CONVEX_URL: "NEXT_PUBLIC_CONVEX_URL",
  EXPO_PUBLIC_API_BASE_URL: "NEXT_PUBLIC_API_BASE_URL",
};

let didLog = false;

function resolveEnv(primary: string) {
  const fallback = fallbackKeys[primary];
  return process.env[primary] ?? (fallback ? process.env[fallback] : undefined);
}

export function getEnvReport(): EnvReport {
  const values: EnvSnapshot = {
    clerkPublishableKey: resolveEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    convexUrl: resolveEnv("EXPO_PUBLIC_CONVEX_URL"),
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    revenueCatKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    apiBaseUrl: resolveEnv("EXPO_PUBLIC_API_BASE_URL"),
  };

  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (!resolveEnv(key)) missing.push(key);
  }

  const revenueMissing =
    !values.revenueCatKey && !values.revenueCatIosKey && !values.revenueCatAndroidKey;
  if (revenueMissing) {
    missing.push("EXPO_PUBLIC_REVENUECAT_(IOS|ANDROID)_API_KEY");
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

  const present: string[] = [];
  const missing = report.missing;

  for (const key of requiredKeys) {
    if (resolveEnv(key)) present.push(key);
  }
  for (const key of optionalKeys) {
    if (resolveEnv(key) || process.env[key]) present.push(key);
  }

  if (missing.length) {
    console.error("[Env] Missing required environment variables:", missing);
  }
  console.log("[Env] Present variables:", present);
}

export function getEnvValue(key: keyof EnvSnapshot) {
  return getEnvReport().values[key];
}

export function hasRequiredEnv() {
  return getEnvReport().ok;
}
