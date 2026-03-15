import { NativeModules, Platform } from "react-native";

export const REVENUECAT_ENTITLEMENT = "pro";

export type RevenueCatCustomerInfo = import("react-native-purchases").CustomerInfo;
export type RevenueCatPackage = import("react-native-purchases").PurchasesPackage;
export type RevenueCatPurchases = (typeof import("react-native-purchases"))["default"];

let purchasesClient: RevenueCatPurchases | null = null;
let purchasesModulePromise: Promise<typeof import("react-native-purchases")> | null = null;

function hasRevenueCatNativeModule() {
  if (Platform.OS === "web") return false;
  return Boolean((NativeModules as { RNPurchases?: unknown }).RNPurchases);
}

async function loadPurchasesModule() {
  if (!hasRevenueCatNativeModule()) {
    console.warn("[RevenueCat] Native module not found. Skipping configuration.");
    return null;
  }
  if (!purchasesModulePromise) {
    purchasesModulePromise = import("react-native-purchases");
  }
  try {
    return await purchasesModulePromise;
  } catch (error) {
    console.warn("[RevenueCat] Failed to load module.", error);
    purchasesModulePromise = null;
    return null;
  }
}

export function getRevenueCatApiKey() {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  }
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
}

export async function configureRevenueCat(appUserId?: string | null) {
  if (purchasesClient) return purchasesClient;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error("Missing RevenueCat API key");
  }

  const module = await loadPurchasesModule();
  if (!module) return null;

  const Purchases = (module.default ?? module) as RevenueCatPurchases;
  Purchases.setLogLevel(module.LOG_LEVEL.INFO);
  Purchases.configure({
    apiKey,
    appUserID: appUserId ?? undefined,
  });

  purchasesClient = Purchases;
  return Purchases;
}

export function getRevenueCatClient() {
  return purchasesClient;
}

export function hasProEntitlement(info?: RevenueCatCustomerInfo | null) {
  if (!info) return false;
  if (info.entitlements?.active?.[REVENUECAT_ENTITLEMENT]) return true;
  return Boolean(info.entitlements?.all?.[REVENUECAT_ENTITLEMENT]?.isActive);
}
