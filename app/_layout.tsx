import "react-native-gesture-handler";
import "react-native-reanimated";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useMutation } from "convex/react";
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
import { WorkspaceDraftProvider } from "../components/workspace-context";
import { convex } from "../lib/convex";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import { getEnvReport, logEnvDiagnostics } from "../lib/env";
import { hasDismissedLaunchPaywall } from "../lib/launch-paywall";
import { planCreditGrant } from "../lib/pricing";
import { consumeReferralCode, setReferralCode } from "../lib/referral";
import { tokenCache } from "../lib/token-cache";
import {
  configureRevenueCat,
  getRevenueCatApiKey,
  hasActiveSubscription,
  inferBillingDurationFromCustomerInfo,
  inferPlanFromCustomerInfo,
  inferPurchaseDateFromCustomerInfo,
  inferSubscriptionEndFromCustomerInfo,
  type RevenueCatCustomerInfo,
  type RevenueCatPurchases,
} from "../lib/revenuecat";

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
            credits: planCreditGrant(inferredPlan),
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

function RewardGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const claimReward = useMutation("users:claimThreeDayReward" as any);
  const { showToast } = useProSuccess();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    const run = async () => {
      try {
        const result = (await claimReward({})) as {
          granted?: boolean;
          creditsAdded?: number;
        };
        if (result?.granted) {
          showToast("Your 3-day gift is here. 3 credits have been added to your account.");
        }
      } catch {
        // ignore reward errors
      }
    };
    void run();
  }, [claimReward, isLoaded, isSignedIn, showToast]);

  return null;
}

function LaunchPaywallGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (DIAGNOSTIC_BYPASS || hasDismissedLaunchPaywall()) return;

    const allowList = ["/paywall", "/sign-in", "/sign-up", "/privacy-policy", "/terms-of-service"];
    if (allowList.some((route) => pathname.startsWith(route))) {
      return;
    }

    router.replace("/paywall");
  }, [pathname, router]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {}, []);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ProSuccessProvider>
        {DIAGNOSTIC_BYPASS ? null : <RevenueCatGate />}
        {DIAGNOSTIC_BYPASS ? null : <LaunchPaywallGate />}
        {DIAGNOSTIC_BYPASS ? null : <ReferralGate />}
        {DIAGNOSTIC_BYPASS ? null : <RewardGate />}
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
  const [authFallbackReady, setAuthFallbackReady] = useState(DIAGNOSTIC_BYPASS);

  useEffect(() => {
    if (isLoaded) {
      setAuthFallbackReady(true);
      return;
    }

    const timer = setTimeout(() => {
      console.warn("[Boot] AuthGate timeout - rendering app before Clerk finished loading");
      setAuthFallbackReady(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded && !authFallbackReady) {
    return <BootScreen message="Loading your account..." />;
  }

  return <>{children}</>;
}

function LaunchDiagnostics() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();

  useEffect(() => {}, [isLoaded, isSignedIn, pathname]);

  return null;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const envReport = useMemo(() => getEnvReport(), []);
  const clerkKey = envReport.values.clerkPublishableKey;
  const revenueCatKey = getRevenueCatApiKey();

  useEffect(() => {
    logEnvDiagnostics(envReport);
  }, [envReport]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    }, 4000);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
  }, [appReady]);

  if (!appReady) {
    return <BootScreen message="Starting Darkor.ai..." />;
  }

  if (!DIAGNOSTIC_BYPASS && (!envReport.ok || !clerkKey || !revenueCatKey)) {
    const missing = envReport.ok ? [] : envReport.missing;
    if (!revenueCatKey && !missing.includes("EXPO_PUBLIC_REVENUECAT_(IOS|ANDROID)_API_KEY")) {
      missing.push("EXPO_PUBLIC_REVENUECAT_(IOS|ANDROID)_API_KEY");
    }
    return <MissingEnv missing={missing} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={clerkKey ?? ""} tokenCache={tokenCache}>
          <AuthGate>
            <Providers>
              <WorkspaceDraftProvider>
                <BottomSheetModalProvider>
                  <AppErrorBoundary>
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
                  </AppErrorBoundary>
                </BottomSheetModalProvider>
              </WorkspaceDraftProvider>
            </Providers>
          </AuthGate>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
