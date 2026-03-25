import "react-native-gesture-handler";
import "react-native-reanimated";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "../components/app-error-boundary";
import { ProSuccessProvider, useProSuccess } from "../components/pro-success-context";
import { ViewerSessionProvider, useViewerSession } from "../components/viewer-session-context";
import { WorkspaceDraftProvider } from "../components/workspace-context";
import { convex } from "../lib/convex";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import { getEnvReport, logEnvDiagnostics } from "../lib/env";
import { consumeReferralCode, setReferralCode } from "../lib/referral";
import {
  configureRevenueCat,
  hasActiveSubscription,
  inferBillingDurationFromCustomerInfo,
  inferPlanFromCustomerInfo,
  inferPurchaseDateFromCustomerInfo,
  inferSubscriptionEndFromCustomerInfo,
  type RevenueCatCustomerInfo,
  type RevenueCatPurchases,
} from "../lib/revenuecat";
import { tokenCache } from "../lib/token-cache";
import { hasDismissedLaunchPaywall } from "../lib/launch-paywall";

function RevenueCatGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const { showSuccess, showToast } = useProSuccess();

  const configuredRef = useRef(false);
  const listenerAddedRef = useRef(false);
  const hasSubscriptionRef = useRef<boolean | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const syncRef = useRef<(info?: RevenueCatCustomerInfo) => void>(() => undefined);

  useEffect(() => {
    if (!isLoaded || configuredRef.current) return;
    const run = async () => {
      try {
        const purchases = await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
        if (!purchases) {
          console.warn("[Boot] RevenueCat unavailable - skipping");
          return;
        }
        purchasesRef.current = purchases;
        configuredRef.current = true;
        setRevenueCatReady(true);
      } catch (error) {
        console.warn("RevenueCat not configured", error);
      }
    };
    void run();
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    const purchases = purchasesRef.current;
    if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;

    const run = async () => {
      try {
        if (isSignedIn && user?.id) {
          const currentUserId = await purchases.getAppUserID().catch(() => null);
          if (currentUserId !== user.id) {
            await purchases.logIn(user.id);
          }
          return;
        }

        const isAnonymous = await purchases.isAnonymous().catch(() => true);
        if (!isAnonymous) {
          await purchases.logOut();
        }
      } catch (error) {
        console.warn("[Boot] RevenueCat auth sync failed", error);
      }
    };

    void run();
  }, [isLoaded, isSignedIn, revenueCatReady, user?.id]);

  useEffect(() => {
    syncRef.current = async (info?: RevenueCatCustomerInfo) => {
      const purchases = purchasesRef.current;
      if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
      try {
        const customerInfo = info ?? (await purchases.getCustomerInfo());
        const hasSubscription = hasActiveSubscription(customerInfo);
        const inferredPlan = hasSubscription ? inferPlanFromCustomerInfo(customerInfo) : null;
        const inferredDuration = hasSubscription ? inferBillingDurationFromCustomerInfo(customerInfo) : undefined;
        const purchasedAt = hasSubscription ? inferPurchaseDateFromCustomerInfo(customerInfo) : undefined;
        const subscriptionEnd = hasSubscription ? inferSubscriptionEndFromCustomerInfo(customerInfo) : undefined;

        if (inferredPlan && isSignedIn && inferredDuration) {
          await setPlan({
            plan: inferredPlan,
            subscriptionType: inferredDuration,
            purchasedAt: purchasedAt ?? undefined,
            subscriptionEnd: subscriptionEnd ?? undefined,
          });
        }

        if (hasSubscriptionRef.current === null) {
          hasSubscriptionRef.current = hasSubscription;
        } else if (hasSubscription && !hasSubscriptionRef.current) {
          if (inferredPlan === "trial") {
            showToast("Your 3-day Pro Studio trial is active.");
          } else {
            showSuccess();
          }
          hasSubscriptionRef.current = true;
        } else {
          hasSubscriptionRef.current = hasSubscription;
        }
      } catch (error) {
        console.warn("RevenueCat sync failed", error);
      }
    };
  }, [isSignedIn, revenueCatReady, setPlan, showSuccess, showToast]);

  useEffect(() => {
    const purchases = purchasesRef.current;
    if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
    void syncRef.current();
    if (listenerAddedRef.current) return;

    listenerAddedRef.current = true;
    const listener = (info: RevenueCatCustomerInfo) => {
      void syncRef.current(info);
    };
    purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isLoaded, revenueCatReady]);

  return null;
}

function ReferralGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const applyReferral = useMutation("users:applyReferral" as any);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
      if (code) {
        void setReferralCode(code);
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const run = async () => {
      const code = await consumeReferralCode();
      if (code) {
        await applyReferral({ referralCode: code });
      }
    };
    void run();
  }, [applyReferral, isLoaded, isSignedIn]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ProSuccessProvider>
        {DIAGNOSTIC_BYPASS ? null : <RevenueCatGate />}
        {DIAGNOSTIC_BYPASS ? null : <ReferralGate />}
        {children}
      </ProSuccessProvider>
    </ConvexProviderWithClerk>
  );
}

function BootScreen({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <ActivityIndicator color="#ffffff" />
      <Text style={{ marginTop: 12, fontSize: 14, color: "#f4f4f5" }}>{message}</Text>
    </View>
  );
}

function MissingEnv({ missing }: { missing: string[] }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#f4f4f5" }}>Missing environment variables</Text>
      <Text style={{ marginTop: 8, textAlign: "center", color: "#a1a1aa" }}>
        The following variables are required before the app can start:
      </Text>
      <View style={{ marginTop: 12 }}>
        {missing.map((item) => (
          <Text key={item} style={{ color: "#e2e8f0", fontSize: 12, textAlign: "center" }}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function OfflineScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#f4f4f5" }}>Connecting to Darkor.ai</Text>
      <Text style={{ marginTop: 8, textAlign: "center", color: "#a1a1aa" }}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={{
          marginTop: 16,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.2)",
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: "#e2e8f0", fontSize: 13, fontWeight: "600" }}>Retry</Text>
      </Pressable>
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();
  const [allowGuestShell, setAllowGuestShell] = useState(DIAGNOSTIC_BYPASS);

  useEffect(() => {
    if (isLoaded) {
      setAllowGuestShell(true);
      return;
    }

    const timer = setTimeout(() => {
      console.warn("[Boot] AuthGate timeout - rendering the guest-safe shell before Clerk finished loading");
      setAllowGuestShell(true);
    }, 900);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded && !allowGuestShell) {
    return <BootScreen message="Loading your account..." />;
  }

  return <>{children}</>;
}

type MeResponse = {
  plan: "free" | "trial" | "pro";
  hasPaidAccess?: boolean;
};

const LAUNCH_GATE_EXEMPT_PATHS = new Set([
  "/paywall",
  "/sign-in",
  "/sign-up",
  "/privacy-policy",
  "/terms-of-service",
  "/faq",
]);

function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);

  const me = useQuery(
    "users:me" as any,
    DIAGNOSTIC_BYPASS ? "skip" : viewerReady ? viewerArgs : "skip",
  ) as MeResponse | null | undefined;

  const launchPaywallDismissed = hasDismissedLaunchPaywall();
  const isExemptRoute = pathname ? LAUNCH_GATE_EXEMPT_PATHS.has(pathname) : false;
  const isGateResolved = DIAGNOSTIC_BYPASS || (viewerReady && me !== undefined);
  const shouldShowLaunchPaywall =
    !DIAGNOSTIC_BYPASS &&
    isGateResolved &&
    (me?.plan ?? "free") === "free" &&
    !launchPaywallDismissed;

  useEffect(() => {
    if (!shouldShowLaunchPaywall || isExemptRoute || pathname === "/paywall") {
      return;
    }

    router.replace("/paywall");
  }, [isExemptRoute, pathname, router, shouldShowLaunchPaywall]);

  if (!isGateResolved && !isExemptRoute) {
    return <BootScreen message="Loading your plan..." />;
  }

  if (shouldShowLaunchPaywall && !isExemptRoute) {
    return <BootScreen message="Preparing your offer..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
        animation: "slide_from_right",
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
      <Stack.Screen name="sign-up" options={{ presentation: "modal" }} />
      <Stack.Screen name="privacy-policy" options={{ presentation: "modal" }} />
      <Stack.Screen name="terms-of-service" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const envReport = useMemo(() => getEnvReport(), []);
  const clerkKey = envReport.values.clerkPublishableKey;

  useEffect(() => {
    logEnvDiagnostics(envReport);
  }, [envReport]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    });
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    }, 4000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (!DIAGNOSTIC_BYPASS && !clerkKey) {
    return <MissingEnv missing={["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"]} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <ClerkProvider publishableKey={clerkKey ?? ""} tokenCache={tokenCache}>
            <AuthGate>
              <Providers>
                <ViewerSessionProvider>
                  <WorkspaceDraftProvider>
                    <BottomSheetModalProvider>
                      <AppShell />
                    </BottomSheetModalProvider>
                  </WorkspaceDraftProvider>
                </ViewerSessionProvider>
              </Providers>
            </AuthGate>
          </ClerkProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
