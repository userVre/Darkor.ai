import type {ConfigContext, ExpoConfig} from "expo/config";

const PUBLIC_ENV_KEYS = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CONVEX_URL",
  "EXPO_PUBLIC_CONVEX_SITE_URL",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_API_KEY",
  "EXPO_PUBLIC_APP_URL",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_POSTHOG_API_KEY",
  "EXPO_PUBLIC_POSTHOG_HOST",
  "EXPO_PUBLIC_DISABLE_VIDEO",
  "EXPO_PUBLIC_REVIEW_FORCE",
] as const;

const REQUIRED_PUBLIC_ENV_KEYS = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CONVEX_URL",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
] as const;

function readEnv(key: (typeof PUBLIC_ENV_KEYS)[number]) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function shouldRequireEnvForBuild() {
  return process.env.EAS_BUILD === "true";
}

function assertRequiredEnv(values: Record<string, string | undefined>) {
  if (!shouldRequireEnvForBuild()) {
    return;
  }

  const missing = REQUIRED_PUBLIC_ENV_KEYS.filter((key) => !values[key]?.trim());
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    [
      "Missing required Expo public environment variables for this EAS build:",
      ...missing.map((key) => `- ${key}`),
      "",
      "Add them to the matching EAS environment before building, for example:",
      "eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value <your-clerk-publishable-key>",
      "eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_CONVEX_URL --value <your-convex-url>",
      "eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value <your-revenuecat-android-key>",
    ].join("\n"),
  );
}

export default ({config}: ConfigContext): ExpoConfig => {
  const existingPublicEnv = (config.extra?.publicEnv ?? {}) as Record<string, string | undefined>;
  const publicEnv = PUBLIC_ENV_KEYS.reduce<Record<string, string | undefined>>((values, key) => {
    values[key] = readEnv(key) ?? existingPublicEnv[key];
    return values;
  }, {...existingPublicEnv});

  assertRequiredEnv(publicEnv);

  return {
    ...config,
    extra: {
      ...config.extra,
      publicEnv,
    },
  };
};
