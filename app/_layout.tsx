import "react-native-gesture-handler";
import "react-native-reanimated";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as Linking from "expo-linking";
import { Stack, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "../components/app-error-boundary";
import { ProSuccessProvider, useProSuccess } from "../components/pro-success-context";
import { ViewerSessionProvider } from "../components/viewer-session-context";
import { WorkspaceDraftProvider } from "../components/workspace-context";
import { convex } from "../lib/convex";
import { DS, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import { getEnvReport, logEnvDiagnostics } from "../lib/env";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../lib/guest-testing";
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

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
    <View style={bootStyles.screen}>
      <View style={bootStyles.card}>
        <ActivityIndicator color={DS.colors.textPrimary} />
        <Text style={bootStyles.title}>Loading Darkor.ai</Text>
        <Text style={bootStyles.body}>{message}</Text>
      </View>
    </View>
  );
}

function MissingEnv({ missing }: { missing: string[] }) {
  return (
    <View style={bootStyles.screen}>
      <View style={bootStyles.card}>
        <Text style={bootStyles.title}>Missing Environment Variables</Text>
        <Text style={bootStyles.body}>The following values are required before the app can start:</Text>
        <View style={bootStyles.list}>
        {missing.map((item) => (
            <Text key={item} style={bootStyles.listItem}>
            {item}
          </Text>
        ))}
        </View>
      </View>
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

function buildReturnToPath(pathname: string, params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      searchParams.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry.length > 0) {
          searchParams.append(key, entry);
        }
      }
    }
  }

  const query = searchParams.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

function CreateAccessGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const allowGuestCreateAccess =
    ENABLE_GUEST_WIZARD_TEST_MODE && (pathname === "/workspace" || pathname === "/wizard");

  useEffect(() => {
    if (allowGuestCreateAccess || !isLoaded || isSignedIn) {
      return;
    }

    if (pathname !== "/workspace" && pathname !== "/wizard") {
      return;
    }

    const returnTo = buildReturnToPath(pathname, params);
    router.replace({ pathname: "/sign-in", params: { returnTo } });
  }, [allowGuestCreateAccess, isLoaded, isSignedIn, params, pathname, router]);

  if (!isLoaded || allowGuestCreateAccess) {
    return <>{children}</>;
  }

  if (!isSignedIn && (pathname === "/workspace" || pathname === "/wizard")) {
    return <BootScreen message="Secure your account to start creating..." />;
  }

  return <>{children}</>;
}

function AppShell() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
        animation: "slide_from_right",
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="index" />
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

  if (!DIAGNOSTIC_BYPASS && !envReport.ok) {
    return <MissingEnv missing={envReport.missing} />;
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
                      <CreateAccessGate>
                        <AppShell />
                      </CreateAccessGate>
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

const bootStyles = {
  screen: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: DS.colors.background,
    paddingHorizontal: SCREEN_SIDE_PADDING,
  },
  card: {
    ...surfaceCard(),
    ...glowShadow("rgba(0,0,0,0.34)", 22),
    width: "100%" as const,
    maxWidth: 420,
    alignItems: "center" as const,
    gap: DS.spacing[2],
    paddingHorizontal: DS.spacing[3],
    paddingVertical: DS.spacing[4],
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
    textAlign: "center" as const,
  },
  body: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    textAlign: "center" as const,
  },
  list: {
    width: "100%" as const,
    gap: DS.spacing[1],
  },
  listItem: {
    color: DS.colors.textPrimary,
    ...DS.typography.bodySm,
    textAlign: "center" as const,
  },
  button: {
    ...surfaceCard(DS.colors.surfaceMuted),
    minHeight: 48,
    minWidth: 120,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: DS.spacing[3],
    paddingVertical: DS.spacing[1.5],
  },
  buttonText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
};
