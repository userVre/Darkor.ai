import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BillingCycle, PlanKey } from "./pricing";

export const SUBSCRIPTION_INTENT_KEY = "darkor.pending.subscription";

export type SubscriptionIntent = {
  priceId: string;
  planName: PlanKey;
  billingCycle: BillingCycle;
};

export async function saveSubscriptionIntent(intent: SubscriptionIntent) {
  await AsyncStorage.setItem(SUBSCRIPTION_INTENT_KEY, JSON.stringify(intent));
}

export async function getSubscriptionIntent() {
  const raw = await AsyncStorage.getItem(SUBSCRIPTION_INTENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubscriptionIntent;
  } catch {
    return null;
  }
}

export async function clearSubscriptionIntent() {
  await AsyncStorage.removeItem(SUBSCRIPTION_INTENT_KEY);
}
