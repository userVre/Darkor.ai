import "react-native-gesture-handler";
import "react-native-reanimated";
import "../lib/nativewind";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/error-boundary";
import { ProSuccessProvider, useProSuccess } from "../components/pro-success-context";
import { WorkspaceDraftProvider } from "../components/workspace-context";
import { convex } from "../lib/convex";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import { getEnvReport, logEnvDiagnostics } from "../lib/env";
import { useBackendHealth } from "../lib/network";
import { consumeReferralCode, setReferralCode } from "../lib/referral";
import { tokenCache } from "../lib/token-cache";
import {
  configureRevenueCat,
  getRevenueCatApiKey,
  hasProEntitlement,
  type RevenueCatCustomerInfo,
  type RevenueCatPurchases,
} from "../lib/revenuecat";

console.log("LOG_STAGE_2: Root loaded");

void SplashScreen.preventAutoHideAsync();

function BootScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <ActivityIndicator color="#ffffff" />
      <Text style={{ marginTop: 16, fontSize: 16, fontWeight: "600", color: "#f8fafc" }}>{title}</Text>
      <Text style={{ marginTop: 6, fontSize: 13, textAlign: "center", color: "#a1a1aa" }}>{message}</Text>
    </View>
  );
}

function MissingEnv({ missing }: { missing: string[] }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#f4f4f5" }}>Missing environment variables</Text>
      <Text style={{ marginTop: 10, textAlign: "center", color: "#a1a1aa" }}>
        The app cannot boot without required configuration. Add the missing keys and restart the dev server.
      </Text>
      <View
        style={{
          marginTop: 16,
          width: "100%",
          maxWidth: 380,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.2)",
          backgroundColor: "rgba(255,255,255,0.06)",
          padding: 16,
        }}
      >
        {missing.map((key) => (
          <Text key={key} style={{ fontSize: 12, color: "#f4f4f5", marginBottom: 6 }}>
            • {key}
          </Text>
        ))}
      </View>
    </View>
  );
}

function OfflineScreen({
  lastError,
  onRetry,
}: {
  lastError: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#f8fafc" }}>Offline</Text>
      <Text style={{ marginTop: 8, textAlign: "center", color: "#a1a1aa" }}>
        We could not reach the backend services. Check your connection and try again.
      </Text>
      {lastError ? (
        <Text style={{ marginTop: 8, fontSize: 12, color: "#71717a" }} numberOfLines={2}>
          {lastError}
        </Text>
      ) : null}
      <Pressable
        onPress={onRetry}
        style={{
          marginTop: 18,
          alignItems: "center",
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.3)",
          paddingVertical: 10,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#e2e8f0" }}>Retry connection</Text>
      </Pressable>
    </View>
  );
}

function RevenueCatGate({ enabled }: { enabled: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const { showSuccess } = useProSuccess();

  const configuredRef = useRef(false);
  const listenerAddedRef = useRef(false);
  const hasProRef = useRef<boolean | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const syncRef = useRef<(info?: RevenueCatCustomerInfo) => void>(() => undefined);

  useEffect(() => {
    if (!enabled || !isLoaded || configuredRef.current) return;
    const run = async () => {
      console.log("[Boot] RevenueCat configure start");
      try {
        const purchases = await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
        if (!purchases) {
          console.warn("[Boot] RevenueCat unavailable - skipping");
          return;
        }
        purchasesRef.current = purchases;
        configuredRef.current = true;
        setRevenueCatReady(true);
        console.log("[Boot] RevenueCat configured");
      } catch (error) {
        console.warn("RevenueCat not configured", error);
      }
    };
    void run();
  }, [enabled, isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    const purchases = purchasesRef.current;
    if (!enabled || !revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
    console.log(`[Boot] RevenueCat ${isSignedIn ? "logIn" : "logOut"} start`);
    if (isSignedIn && user?.id) {
      purchases.logIn(user.id).catch(() => undefined);
    } else {
      purchases.logOut().catch(() => undefined);
    }
  }, [enabled, isLoaded, isSignedIn, revenueCatReady, user?.id]);

  useEffect(() => {
    syncRef.current = async (info?: RevenueCatCustomerInfo) => {
      const purchases = purchasesRef.current;
      if (!enabled || !revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
      try {
        const customerInfo = info ?? (await purchases.getCustomerInfo());
        const hasPro = hasProEntitlement(customerInfo);

        if (hasPro && isSignedIn) {
          await setPlan({ plan: "pro" });
        }

        if (hasProRef.current === null) {
          hasProRef.current = hasPro;
        } else if (hasPro && !hasProRef.current) {
          showSuccess();
          hasProRef.current = true;
        } else {
          hasProRef.current = hasPro;
        }

        const onPaywall = pathname === "/paywall";
        if (hasPro && onPaywall) {
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.warn("RevenueCat sync failed", error);
      }
    };
  }, [enabled, isSignedIn, pathname, revenueCatReady, router, setPlan, showSuccess]);

  useEffect(() => {
    const purchases = purchasesRef.current;
    if (!enabled || !revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
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
  }, [enabled, isLoaded, revenueCatReady]);

  return null;
}

function ReferralGate({ enabled }: { enabled: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const applyReferral = useMutation("users:applyReferral" as any);

  useEffect(() => {
    if (!enabled) return;
    console.log("[Boot] ReferralGate listening for deep links");
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
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn) return;
    const run = async () => {
      const code = await consumeReferralCode();
      if (code) {
        console.log("[Boot] ReferralGate applying code");
        await applyReferral({ referralCode: code });
      }
    };
    void run();
  }, [applyReferral, enabled, isLoaded, isSignedIn]);

  return null;
}

function RewardGate({ enabled }: { enabled: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const claimReward = useMutation("users:claimThreeDayReward" as any);
  const { showToast } = useProSuccess();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn || hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    const run = async () => {
      try {
        console.log("[Boot] RewardGate checking reward");
        const result = (await claimReward({})) as {
          granted?: boolean;
          creditsAdded?: number;
        };
        if (result?.granted) {
          showToast("\u2728 Your 3-day gift is here! 3 credits have been added to your account. Start designing now!");
        }
      } catch {
        // ignore reward errors
      }
    };
    void run();
  }, [claimReward, enabled, isLoaded, isSignedIn, showToast]);

  return null;
}

function Providers({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  useEffect(() => {
    console.log("[Boot] Providers mounted");
  }, []);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ProSuccessProvider>
        {DIAGNOSTIC_BYPASS ? null : <RevenueCatGate enabled={enabled} />}
        {DIAGNOSTIC_BYPASS ? null : <ReferralGate enabled={enabled} />}
        {DIAGNOSTIC_BYPASS ? null : <RewardGate enabled={enabled} />}
        {children}
      </ProSuccessProvider>
    </ConvexProviderWithClerk>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <BootScreen title="Preparing your session" message="Loading authentication services..." />;
  }

  return <>{children}</>;
}

function LaunchDiagnostics() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    console.log("[Boot] Auth state", { isLoaded, isSignedIn, pathname });
  }, [isLoaded, isSignedIn, pathname]);

  return null;
}

export default function RootLayout() {
  console.log("LOG_STAGE_1: Layout mounting");

  const envReport = useMemo(() => getEnvReport(), []);
  const revenueCatKey = getRevenueCatApiKey();
  const fontsReady = true;
  const network = useBackendHealth(envReport.values.convexUrl, {
    enabled: envReport.ok && !DIAGNOSTIC_BYPASS,
  });

  useEffect(() => {
    logEnvDiagnostics(envReport);
  }, [envReport]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.log("[Boot] Splash safety hide");
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (DIAGNOSTIC_BYPASS) return;
    if (network.status !== "online") return;
    console.log("[Boot] Hiding splash");
    SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
  }, [network.status]);

  if (!DIAGNOSTIC_BYPASS && !envReport.ok) {
    return <MissingEnv missing={envReport.missing} />;
  }

  if (!DIAGNOSTIC_BYPASS) {
    if (!fontsReady) {
      return <BootScreen title="Loading assets" message="Preparing fonts and UI assets..." />;
    }
    if (network.status === "checking") {
      return <BootScreen title="Connecting" message="Verifying backend connectivity..." />;
    }
    if (network.status === "offline") {
      return <OfflineScreen lastError={network.lastError} onRetry={network.retry} />;
    }
  }

  const gatesEnabled = Boolean(revenueCatKey);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={envReport.values.clerkPublishableKey ?? ""} tokenCache={tokenCache}>
          <ErrorBoundary>
            <LaunchDiagnostics />
            <Providers enabled={gatesEnabled}>
              <AuthGate>
                <WorkspaceDraftProvider>
                  <BottomSheetModalProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: "#000000" },
                        animation: "fade",
                      }}
                    >
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
                      <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
                      <Stack.Screen name="sign-up" options={{ presentation: "modal" }} />
                      <Stack.Screen name="privacy-policy" options={{ presentation: "modal" }} />
                      <Stack.Screen name="terms-of-service" options={{ presentation: "modal" }} />
                    </Stack>
                  </BottomSheetModalProvider>
                </WorkspaceDraftProvider>
              </AuthGate>
            </Providers>
          </ErrorBoundary>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
