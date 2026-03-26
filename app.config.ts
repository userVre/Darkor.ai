const appJson = require("./app.json");

const expoConfig = appJson.expo;

module.exports = () => ({
  ...expoConfig,
  extra: {
    ...expoConfig.extra,
    publicEnv: {
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
      revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      revenueCatKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  },
});
