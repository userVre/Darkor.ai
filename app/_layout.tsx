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
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Purchases, { CustomerInfo } from "react-native-purchases";

import { ProSuccessProvider, useProSuccess } from "../components/pro-success-context";
import { WorkspaceDraftProvider } from "../components/workspace-context";
import { convex } from "../lib/convex";
import { consumeReferralCode, setReferralCode } from "../lib/referral";
import { tokenCache } from "../lib/token-cache";
import { configureRevenueCat, getRevenueCatApiKey, hasProEntitlement } from "../lib/revenuecat";

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
  const syncRef = useRef<(info?: CustomerInfo) => void>(() => undefined);

  useEffect(() => {
    if (!isLoaded || configuredRef.current) return;
    try {
      configureRevenueCat(isSignedIn ? user?.id ?? null : null);
      configuredRef.current = true;
    } catch (error) {
      console.warn("RevenueCat not configured", error);
    }
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    if (!configuredRef.current || !isLoaded) return;
    if (isSignedIn && user?.id) {
      Purchases.logIn(user.id).catch(() => undefined);
    } else {
      Purchases.logOut().catch(() => undefined);
    }
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    syncRef.current = async (info?: CustomerInfo) => {
      if (!configuredRef.current || !isLoaded) return;
      try {
        const customerInfo = info ?? (await Purchases.getCustomerInfo());
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
        if (!hasPro && !onPaywall) {
          router.replace("/paywall");
        }
        if (hasPro && onPaywall) {
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.warn("RevenueCat sync failed", error);
      }
    };
  }, [isSignedIn, pathname, router, setPlan]);

  useEffect(() => {
    if (!configuredRef.current || !isLoaded) return;
    void syncRef.current();
    if (listenerAddedRef.current) return;

    listenerAddedRef.current = true;
    const listener = (info: CustomerInfo) => {
      void syncRef.current(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isLoaded]);

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
        <RevenueCatGate />
        <ReferralGate />
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

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  const revenueCatKey = getRevenueCatApiKey();

  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  if (!clerkKey || !convexUrl || !revenueCatKey) {
    return <MissingEnv />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
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
                  <Stack.Screen name="paywall" />
                  <Stack.Screen name="sign-in" />
                  <Stack.Screen name="sign-up" />
                </Stack>
              </BottomSheetModalProvider>
            </WorkspaceDraftProvider>
          </Providers>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}








