import AsyncStorage from "@react-native-async-storage/async-storage";

export const PAYWALL_DISMISSED_STORAGE_KEY = "homedecor:paywall-dismissed";

let launchPaywallDismissed = false;
let paywallDismissed = false;

export function hasDismissedLaunchPaywall() {
  return launchPaywallDismissed;
}

export function hasDismissedPaywall() {
  return paywallDismissed || launchPaywallDismissed;
}

export async function readHasDismissedPaywall() {
  const stored = await AsyncStorage.getItem(PAYWALL_DISMISSED_STORAGE_KEY);
  paywallDismissed = paywallDismissed || stored === "true" || launchPaywallDismissed;
  return paywallDismissed;
}

export async function persistHasDismissedPaywall() {
  paywallDismissed = true;
  await AsyncStorage.setItem(PAYWALL_DISMISSED_STORAGE_KEY, "true");
}

export function dismissLaunchPaywall() {
  launchPaywallDismissed = true;
  void persistHasDismissedPaywall();
}

export function resetLaunchPaywall() {
  launchPaywallDismissed = false;
  paywallDismissed = false;
  void AsyncStorage.removeItem(PAYWALL_DISMISSED_STORAGE_KEY);
}

