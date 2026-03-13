import Purchases, { CustomerInfo, LOG_LEVEL } from "react-native-purchases";

export const REVENUECAT_ENTITLEMENT = "pro";

export function getRevenueCatApiKey() {
  if (process.env.EXPO_OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  }
  if (process.env.EXPO_OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  }
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
}

export function configureRevenueCat(appUserId?: string | null) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error("Missing RevenueCat API key");
  }
  Purchases.setLogLevel(LOG_LEVEL.INFO);
  Purchases.configure({
    apiKey,
    appUserID: appUserId ?? undefined,
  });
}

export function hasProEntitlement(info?: CustomerInfo | null) {
  if (!info) return false;
  if (info.entitlements?.active?.[REVENUECAT_ENTITLEMENT]) return true;
  return Boolean(info.entitlements?.all?.[REVENUECAT_ENTITLEMENT]?.isActive);
}
