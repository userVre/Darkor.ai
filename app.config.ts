import type {ConfigContext, ExpoConfig} from "expo/config";

const PUBLIC_ENV_KEYS = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CONVEX_URL",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_API_KEY",
  "EXPO_PUBLIC_APP_URL",
  "EXPO_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

function readEnv(key: (typeof PUBLIC_ENV_KEYS)[number]) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export default ({config}: ConfigContext): ExpoConfig => {
  const existingPublicEnv = (config.extra?.publicEnv ?? {}) as Record<string, string | undefined>;

  return {
    ...config,
    extra: {
      ...config.extra,
      publicEnv: PUBLIC_ENV_KEYS.reduce<Record<string, string | undefined>>((values, key) => {
        values[key] = readEnv(key) ?? existingPublicEnv[key];
        return values;
      }, {...existingPublicEnv}),
    },
  };
};
