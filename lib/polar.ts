import * as WebBrowser from "expo-web-browser";
import type { SubscriptionIntent } from "./subscription-intent";

WebBrowser.maybeCompleteAuthSession();

export async function openPolarCheckout(clerkId: string, intent: SubscriptionIntent) {
  const baseUrl = process.env.EXPO_PUBLIC_POLAR_CHECKOUT_URL;
  if (!baseUrl) {
    throw new Error("Missing EXPO_PUBLIC_POLAR_CHECKOUT_URL");
  }

  const checkoutUrl = new URL(baseUrl);
  checkoutUrl.searchParams.set("priceId", intent.priceId);
  checkoutUrl.searchParams.set("planName", intent.planName);
  checkoutUrl.searchParams.set("billingCycle", intent.billingCycle);
  checkoutUrl.searchParams.set("clerkId", clerkId);

  const result = await WebBrowser.openBrowserAsync(checkoutUrl.toString(), {
    showTitle: false,
    enableBarCollapsing: true,
  });

  return result;
}
