import "react-native-gesture-handler";
import "react-native-reanimated";
import "../lib/nativewind";
import "../global.css";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { convex } from "../lib/convex";
import { openPolarCheckout } from "../lib/polar";
import { clearSubscriptionIntent, getSubscriptionIntent } from "../lib/subscription-intent";
import { tokenCache } from "../lib/token-cache";

void SplashScreen.preventAutoHideAsync();

function PendingCheckoutResume() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn || !user?.id) return;

      const pending = await getSubscriptionIntent();
      if (!pending) return;

      try {
        await openPolarCheckout(user.id, pending);
      } catch (error) {
        console.error("Failed to open Polar checkout", error);
      } finally {
        await clearSubscriptionIntent();
      }
    };

    void run();
  }, [isLoaded, isSignedIn, user?.id]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <PendingCheckoutResume />
      {children}
    </ConvexProviderWithClerk>
  );
}

function MissingEnv() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#f4f4f5" }}>Missing environment variables</Text>
      <Text style={{ marginTop: 8, textAlign: "center", color: "#a1a1aa" }}>
        Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) and EXPO_PUBLIC_CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) before launching the app.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

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

  if (!clerkKey || !convexUrl) {
    return <MissingEnv />;
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
        <Providers>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#09090b" },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-up" />
          </Stack>
        </Providers>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}


