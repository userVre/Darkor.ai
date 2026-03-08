"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { useRouter } from "next/navigation";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type BillingCycle = "monthly" | "yearly";
export type PricingTierName = "Pro" | "Premium" | "Ultra";

export const PLAN_PRICE_IDS: Record<PricingTierName, Record<BillingCycle, string>> = {
  Pro: {
    monthly: "e63d860f-e646-4964-a52b-6d19ef5d0551",
    yearly: "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e",
  },
  Premium: {
    monthly: "b286c1c2-73c8-449f-99aa-1c6a276f5cc2",
    yearly: "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba",
  },
  Ultra: {
    monthly: "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e",
    yearly: "f2652c80-3808-452f-9024-141ac7bc2309",
  },
};

type SubscriptionIntent = {
  planName: PricingTierName;
  billing: BillingCycle;
  priceId: string;
  createdAt: number;
};

const INTENT_STORAGE_KEY = "darkor_subscription_intent_v1";
const INTENT_TTL_MS = 30 * 60 * 1000;

type SubscriptionCheckoutContextValue = {
  checkoutLoadingTier: PricingTierName | null;
  pendingIntent: SubscriptionIntent | null;
  error: string | null;
  authGateMessage: string | null;
  startSubscription: (planName: PricingTierName, billing: BillingCycle) => Promise<void>;
};

const SubscriptionCheckoutContext = createContext<SubscriptionCheckoutContextValue | null>(null);

function readSubscriptionIntent(): SubscriptionIntent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(INTENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SubscriptionIntent;
    if (!parsed?.planName || !parsed?.priceId || !parsed?.billing || !parsed?.createdAt) {
      window.localStorage.removeItem(INTENT_STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.createdAt > INTENT_TTL_MS) {
      window.localStorage.removeItem(INTENT_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(INTENT_STORAGE_KEY);
    return null;
  }
}

function writeSubscriptionIntent(planName: PricingTierName, billing: BillingCycle): SubscriptionIntent {
  const intent: SubscriptionIntent = {
    planName,
    billing,
    priceId: PLAN_PRICE_IDS[planName][billing],
    createdAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(intent));
  }

  return intent;
}

function clearSubscriptionIntent() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(INTENT_STORAGE_KEY);
}

export function SubscriptionCheckoutProvider({ children }: PropsWithChildren) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<PricingTierName | null>(null);
  const [pendingIntent, setPendingIntent] = useState<SubscriptionIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authGateMessage, setAuthGateMessage] = useState<string | null>(null);

  const checkoutRef = useRef<InstanceType<typeof PolarEmbedCheckout> | null>(null);
  const resumeInFlightRef = useRef(false);

  const hydratePendingIntent = useCallback(() => {
    setPendingIntent(readSubscriptionIntent());
  }, []);

  useEffect(() => {
    hydratePendingIntent();
  }, [hydratePendingIntent]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === INTENT_STORAGE_KEY) {
        hydratePendingIntent();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        hydratePendingIntent();
      }
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hydratePendingIntent]);

  useEffect(() => {
    return () => {
      checkoutRef.current?.close();
      checkoutRef.current = null;
    };
  }, []);

  const openPolarCheckout = useCallback(
    async (intent: SubscriptionIntent): Promise<void> => {
      setError(null);
      setCheckoutLoadingTier(intent.planName);

      if (!userId) {
        const message = "User context not ready. Please retry in 1 second.";
        console.error("[Subscription] Missing Clerk userId while opening checkout", {
          intent,
          isLoaded,
          isSignedIn,
          userId,
        });
        setError(message);
        alert(message);
        setCheckoutLoadingTier(null);
        return;
      }

      try {
        console.log("[Subscription] Opening Polar checkout", {
          planName: intent.planName,
          billing: intent.billing,
          priceId: intent.priceId,
          clerkId: userId,
        });

        const response = await fetch("/api/polar/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purchaseType: "subscription",
            clerkId: userId,
            planName: intent.planName,
            billing: intent.billing,
            priceId: intent.priceId,
          }),
        });

        const data = await response.json();
        console.log("[Subscription] /api/polar/checkout response", {
          ok: response.ok,
          status: response.status,
          data,
        });

        if (!response.ok || !data?.checkoutUrl) {
          throw new Error(data?.error ?? `Checkout API failed with status ${response.status}`);
        }

        clearSubscriptionIntent();
        setPendingIntent(null);

        checkoutRef.current?.close();
        const checkout = await PolarEmbedCheckout.create(data.checkoutUrl, { theme: "dark" });
        checkoutRef.current = checkout;

        console.log("[Subscription] PolarEmbedCheckout.create success", {
          checkoutUrl: data.checkoutUrl,
          checkout,
        });

        checkout.addEventListener("success", () => {
          console.log("[Subscription] Polar checkout success event fired", {
            planName: intent.planName,
            billing: intent.billing,
            priceId: intent.priceId,
            clerkId: userId,
          });
          checkoutRef.current = null;
          setAuthGateMessage("Payment completed. Redirecting to your workspace...");
          router.push("/dashboard/workspace");
        });

        checkout.addEventListener("close", () => {
          console.log("[Subscription] Polar checkout close event fired");
          checkoutRef.current = null;
        });

        setAuthGateMessage("Checkout opened. Complete payment to unlock access.");
      } catch (checkoutError) {
        const message = checkoutError instanceof Error ? checkoutError.message : "Could not open checkout";
        console.error("[Subscription] Checkout failed", {
          error: checkoutError,
          message,
          intent,
          clerkId: userId,
        });
        setError(message);
        alert(`Checkout failed: ${message}`);
      } finally {
        setCheckoutLoadingTier(null);
      }
    },
    [isLoaded, isSignedIn, router, userId],
  );

  const startSubscription = useCallback(
    async (planName: PricingTierName, billing: BillingCycle) => {
      if (!isLoaded) {
        const message = "Authentication is still loading. Please try again.";
        console.error("[Subscription] startSubscription blocked: Clerk not loaded", {
          isLoaded,
          isSignedIn,
          userId,
          planName,
          billing,
        });
        setError(message);
        alert(message);
        return;
      }

      const intent = writeSubscriptionIntent(planName, billing);
      setPendingIntent(intent);
      setError(null);

      console.log("[Subscription] Intent saved to localStorage", intent);

      if (!isSignedIn) {
        setAuthGateMessage("Sign in or sign up to continue. We will open checkout automatically.");
        resumeInFlightRef.current = false;

        const returnUrl = `${window.location.origin}/#pricing`;

        try {
          await openSignUp?.({
            forceRedirectUrl: returnUrl,
            fallbackRedirectUrl: returnUrl,
            signInForceRedirectUrl: returnUrl,
            signUpForceRedirectUrl: returnUrl,
          } as never);
        } catch (signUpError) {
          console.error("[Subscription] openSignUp failed, trying openSignIn", signUpError);
          try {
            await openSignIn?.({
              forceRedirectUrl: returnUrl,
              fallbackRedirectUrl: returnUrl,
              signInForceRedirectUrl: returnUrl,
              signUpForceRedirectUrl: returnUrl,
            } as never);
          } catch (signInError) {
            const message = "Could not open authentication modal.";
            console.error("[Subscription] openSignIn failed", signInError);
            setError(message);
            alert(`${message} ${signInError instanceof Error ? signInError.message : "Unknown error"}`);
          }
        }

        return;
      }

      if (!userId) {
        const message = "User session is signed in but userId is missing. Please retry.";
        console.error("[Subscription] Signed in without userId", {
          isLoaded,
          isSignedIn,
          userId,
          intent,
        });
        setError(message);
        alert(message);
        return;
      }

      await openPolarCheckout(intent);
    },
    [isLoaded, isSignedIn, openPolarCheckout, openSignIn, openSignUp, userId],
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !pendingIntent || checkoutLoadingTier) {
      return;
    }

    if (resumeInFlightRef.current) {
      return;
    }

    console.log("[Subscription] Auto-resume triggered from saved intent", pendingIntent);

    resumeInFlightRef.current = true;
    setAuthGateMessage("Authentication complete. Opening checkout...");

    void openPolarCheckout(pendingIntent).finally(() => {
      resumeInFlightRef.current = false;
    });
  }, [isLoaded, isSignedIn, pendingIntent, checkoutLoadingTier, openPolarCheckout]);

  const value: SubscriptionCheckoutContextValue = {
    checkoutLoadingTier,
    pendingIntent,
    error,
    authGateMessage,
    startSubscription,
  };

  return <SubscriptionCheckoutContext.Provider value={value}>{children}</SubscriptionCheckoutContext.Provider>;
}

export function useSubscriptionCheckout() {
  const context = useContext(SubscriptionCheckoutContext);

  if (!context) {
    throw new Error("useSubscriptionCheckout must be used within SubscriptionCheckoutProvider");
  }

  return context;
}
