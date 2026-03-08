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

type PendingSubscription = {
  tier: PricingTierName;
  billing: BillingCycle;
  source: "pricing-section";
  createdAt: number;
};

const PENDING_CHECKOUT_KEY = "darkor_pending_checkout";
const PENDING_TTL_MS = 30 * 60 * 1000;

function readPendingCheckout(): PendingSubscription | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_CHECKOUT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingSubscription;
    if (!parsed?.tier || !parsed?.billing || !parsed?.createdAt) {
      window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
      return null;
    }

    if (Date.now() - parsed.createdAt > PENDING_TTL_MS) {
      window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
    return null;
  }
}

function writePendingCheckout(tier: PricingTierName, billing: BillingCycle): PendingSubscription {
  const payload: PendingSubscription = {
    tier,
    billing,
    source: "pricing-section",
    createdAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(payload));
  }

  return payload;
}

function clearPendingCheckout(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
}

type SubscriptionCheckoutContextValue = {
  checkoutLoadingTier: PricingTierName | null;
  pendingSubscription: PendingSubscription | null;
  error: string | null;
  authGateMessage: string | null;
  startSubscription: (tier: PricingTierName, billing: BillingCycle) => Promise<void>;
};

const SubscriptionCheckoutContext = createContext<SubscriptionCheckoutContextValue | null>(null);

export function SubscriptionCheckoutProvider({ children }: PropsWithChildren) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<PricingTierName | null>(null);
  const [pendingSubscription, setPendingSubscription] = useState<PendingSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authGateMessage, setAuthGateMessage] = useState<string | null>(null);
  const checkoutRef = useRef<InstanceType<typeof PolarEmbedCheckout> | null>(null);
  const hasResumedAfterAuthRef = useRef(false);

  useEffect(() => {
    setPendingSubscription(readPendingCheckout());
  }, []);

  useEffect(() => {
    return () => {
      checkoutRef.current?.close();
      checkoutRef.current = null;
    };
  }, []);

  const createCheckout = useCallback(
    async (tier: PricingTierName, billing: BillingCycle, fromPending = false): Promise<void> => {
      setError(null);
      setCheckoutLoadingTier(tier);

      try {
        const response = await fetch("/api/polar/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purchaseType: "subscription",
            tier,
            billing,
            clerkId: userId,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data?.checkoutUrl) {
          throw new Error(data?.error ?? "Could not open checkout");
        }

        checkoutRef.current?.close();
        const checkout = await PolarEmbedCheckout.create(data.checkoutUrl, { theme: "dark" });
        checkoutRef.current = checkout;

        checkout.addEventListener("success", () => {
          checkoutRef.current = null;
          clearPendingCheckout();
          setPendingSubscription(null);
          setAuthGateMessage("Payment completed. Redirecting to your workspace...");
          router.push("/dashboard/workspace");
        });

        checkout.addEventListener("close", () => {
          checkoutRef.current = null;
        });

        if (fromPending) {
          clearPendingCheckout();
          setPendingSubscription(null);
        }

        setAuthGateMessage("Checkout opened. Complete payment to unlock access.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open checkout");
        hasResumedAfterAuthRef.current = false;
      } finally {
        setCheckoutLoadingTier(null);
      }
    },
    [router, userId],
  );

  const startSubscription = async (tier: PricingTierName, billing: BillingCycle) => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      const pending = writePendingCheckout(tier, billing);
      setPendingSubscription(pending);
      setAuthGateMessage("Continue with sign-up/sign-in to launch checkout instantly.");
      hasResumedAfterAuthRef.current = false;

      const returnUrl = `${window.location.origin}/#pricing`;

      try {
        await openSignUp?.({
          forceRedirectUrl: returnUrl,
          fallbackRedirectUrl: returnUrl,
          signInForceRedirectUrl: returnUrl,
          signUpForceRedirectUrl: returnUrl,
        } as never);
      } catch {
        try {
          await openSignIn?.({
            forceRedirectUrl: returnUrl,
            fallbackRedirectUrl: returnUrl,
            signInForceRedirectUrl: returnUrl,
            signUpForceRedirectUrl: returnUrl,
          } as never);
        } catch {
          setError("Could not open authentication modal. Please try again.");
        }
      }

      return;
    }

    await createCheckout(tier, billing, false);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !pendingSubscription || checkoutLoadingTier) {
      return;
    }

    if (hasResumedAfterAuthRef.current) {
      return;
    }

    hasResumedAfterAuthRef.current = true;
    setAuthGateMessage("Authentication successful. Opening Polar checkout...");
    void createCheckout(pendingSubscription.tier, pendingSubscription.billing, true);
  }, [isLoaded, isSignedIn, pendingSubscription, checkoutLoadingTier, createCheckout]);

  const value: SubscriptionCheckoutContextValue = {
    checkoutLoadingTier,
    pendingSubscription,
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
