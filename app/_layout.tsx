import "react-native-reanimated";
import "../global.css";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { convex } from "@/lib/convex";
import { openPolarCheckout } from "@/lib/polar";
import { clearSubscriptionIntent, getSubscriptionIntent } from "@/lib/subscription-intent";
import { tokenCache } from "@/lib/token-cache";

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
    <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
      <Text className="text-lg font-semibold text-zinc-100">Missing environment variables</Text>
      <Text className="mt-2 text-center text-zinc-400">
        Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_CONVEX_URL before launching the app.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key) {
    return <MissingEnv />;
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={key} tokenCache={tokenCache}>
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

