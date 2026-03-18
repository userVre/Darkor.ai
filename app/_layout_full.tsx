import "react-native-gesture-handler";
import "react-native-reanimated";
import "../lib/nativewind";
import "../global.css";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ProSuccessProvider, useProSuccess } from "../components/pro-success-context";
import { ErrorBoundary } from "../components/error-boundary";
import { WorkspaceDraftProvider } from "../components/workspace-context";
import { convex } from "../lib/convex";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import { consumeReferralCode, setReferralCode } from "../lib/referral";
import { tokenCache } from "../lib/token-cache";
import {
  configureRevenueCat,
  getRevenueCatApiKey,
  hasProEntitlement,
  type RevenueCatCustomerInfo,
  type RevenueCatPurchases,
} from "../lib/revenuecat";

console.log("[Boot] Root layout module loaded");

void SplashScreen.preventAutoHideAsync();

function RevenueCatGate() {
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
    if (!isLoaded || configuredRef.current) return;
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
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    const purchases = purchasesRef.current;
    if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
    console.log(`[Boot] RevenueCat ${isSignedIn ? "logIn" : "logOut"} start`);
    if (isSignedIn && user?.id) {
      purchases.logIn(user.id).catch(() => undefined);
    } else {
      purchases.logOut().catch(() => undefined);
    }
  }, [isLoaded, isSignedIn, revenueCatReady, user?.id]);

  useEffect(() => {
    syncRef.current = async (info?: RevenueCatCustomerInfo) => {
      const purchases = purchasesRef.current;
      if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
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
  }, [isSignedIn, pathname, revenueCatReady, router, setPlan]);

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
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const run = async () => {
      const code = await consumeReferralCode();
      if (code) {
        console.log("[Boot] ReferralGate applying code");
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
  }, [claimReward, isLoaded, isSignedIn, showToast]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log("[Boot] Providers mounted");
  }, []);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ProSuccessProvider>
        {DIAGNOSTIC_BYPASS ? null : <RevenueCatGate />}
        {DIAGNOSTIC_BYPASS ? null : <ReferralGate />}
        {DIAGNOSTIC_BYPASS ? null : <RewardGate />}
        {children}
      </ProSuccessProvider>
    </ConvexProviderWithClerk>
  );
}

function MissingEnv() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#f4f4f5" }}>Missing environment variables</Text>
      <Text style={{ marginTop: 8, textAlign: "center", color: "#a1a1aa" }}>
        Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), EXPO_PUBLIC_CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL), and RevenueCat keys (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY) before launching the app.
      </Text>
    </View>
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

function LaunchDiagnostics() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    console.log("[Boot] Auth state", { isLoaded, isSignedIn, pathname });
  }, [isLoaded, isSignedIn, pathname]);

  return null;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  const revenueCatKey = getRevenueCatApiKey();

  useEffect(() => {
    console.log("[Boot] RootLayout mounted");
    const timer = setTimeout(() => {
      console.log("[Boot] App ready");
      setAppReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.log("[Boot] Splash safety hide");
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    }, 4000);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    console.log("[Boot] Env check", {
      hasClerkKey: Boolean(clerkKey),
      hasConvexUrl: Boolean(convexUrl),
      hasRevenueCatKey: Boolean(revenueCatKey),
    });
  }, [clerkKey, convexUrl, revenueCatKey]);

  useEffect(() => {
    if (!appReady) return;
    console.log("[Boot] Hiding splash");
    SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
  }, [appReady]);

  if (!appReady) {
    return <BootScreen message="Starting Darkor.ai..." />;
  }

  if (!DIAGNOSTIC_BYPASS && (!clerkKey || !convexUrl || !revenueCatKey)) {
    console.warn("[Boot] Missing environment variables", {
      hasClerkKey: Boolean(clerkKey),
      hasConvexUrl: Boolean(convexUrl),
      hasRevenueCatKey: Boolean(revenueCatKey),
    });
    return <MissingEnv />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
          <ErrorBoundary>
            <LaunchDiagnostics />
            <Providers>
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
            </Providers>
          </ErrorBoundary>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}











