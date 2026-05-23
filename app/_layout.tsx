import "react-native-gesture-handler";
import "react-native-reanimated";

import {ClerkProvider, useAuth, useUser} from "@clerk/expo";
import {BottomSheetModalProvider} from "@gorhom/bottom-sheet";
import {ConvexReactClient, useConvexAuth, useMutation} from "convex/react";
import {ConvexProviderWithClerk} from "convex/react-clerk";
import {useFonts} from "expo-font";
import * as Linking from "expo-linking";
import {useCalendars, useLocales} from "expo-localization";
import {Stack, usePathname, useRouter} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import {useEffect, useMemo, useRef, useState} from "react";
import {ActivityIndicator, AppState, InteractionManager, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps} from "react-native";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {SafeAreaProvider, SafeAreaView} from "react-native-safe-area-context";
import {PostHogProvider} from "posthog-react-native";

import {AppErrorBoundary} from "../components/app-error-boundary";
import {readAuthSkipped, subscribeAuthSkipped} from "../components/auth/auth-skip";
import {DiamondStoreProvider} from "../components/diamond-store-context";
import {FlowUIProvider} from "../components/flow-ui-context";
import {GenerationAccessCacheGate} from "../components/generation-access-cache-gate";
import {OfflineOverlay} from "../components/offline-overlay";
import {ProSuccessProvider, useProSuccess} from "../components/pro-success-context";
import {ViewerCreditsProvider, useViewerCredits} from "../components/viewer-credits-context";
import {useViewerSession} from "../components/viewer-session-context";
import {ViewerSessionProvider} from "../components/viewer-session-context";
import {WorkspaceDraftProvider} from "../components/workspace-context";
import {getConvexClient} from "../lib/convex";
import {DS, SCREEN_SIDE_PADDING, glowShadow, surfaceCard} from "../lib/design-system";
import {DIAGNOSTIC_BYPASS} from "../lib/diagnostics";
import {usePricingContext} from "../lib/dynamic-pricing";
import {getEnvReport, logEnvDiagnostics} from "../lib/env";
import i18n, {
initializeI18n,
syncAppLanguageWithSystem,
useAppLanguagePreference,
useLocalizedAppFonts,
} from "../lib/i18n";
import {safeNotifications, scheduleOrUpdateProTip, syncTieredNotifications} from "../lib/notifications";
import {getDirectionalTextAlign, reloadAppForLayoutDirection} from "../lib/i18n/rtl";
import {consumeReferralCode, setReferralCode} from "../lib/referral";
import {
  configureRevenueCat,
  fetchTieredPackage,
  hasActiveSubscription,
  inferRevenueCatDiamondPackId,
  resolveRevenueCatSubscription,
  syncRevenueCatPricingAttributes,
  type RevenueCatCustomerInfo,
type RevenueCatPurchases,
} from "../lib/revenuecat";
import {tokenCache} from "../lib/token-cache";
import {AppThemeProvider, useTheme} from "../styles/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() || undefined;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || undefined;
const POSTHOG_DISABLED_API_KEY = "phc_disabled";
const SERVICE_CONFIG_RETRY_INTERVAL_MS = 250;
const SERVICE_CONFIG_WARNING_ATTEMPTS = 20;
const BOOT_SCREEN_TIMEOUT_MS = 15000;
const SERVICE_CONFIG_BYPASS_TIMEOUT_MS = BOOT_SCREEN_TIMEOUT_MS;
const STARTUP_OPERATION_TIMEOUT_MS = 10000;
const FALLBACK_CLERK_PUBLISHABLE_KEY = "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA";
const FALLBACK_CONVEX_URL = "https://homedecor-ai-missing-config.invalid";
const TextWithDefaults = Text as typeof Text & { defaultProps?: TextProps };
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: TextInputProps };

let lastAppliedTypographyKey = "";

async function withStartupTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = STARTUP_OPERATION_TIMEOUT_MS,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function applyGlobalTypographyDefaults(
  localizedFonts: ReturnType<typeof useLocalizedAppFonts>,
  isRTL: boolean,
) {
  const nextTypographyKey = [
    localizedFonts.regular.fontFamily,
    localizedFonts.medium.fontFamily,
    localizedFonts.bold.fontFamily,
    String(isRTL),
  ].join(":");

  if (lastAppliedTypographyKey === nextTypographyKey) {
    return;
  }

  TextWithDefaults.defaultProps = {
    ...TextWithDefaults.defaultProps,
    style: [localizedFonts.regular, { letterSpacing: 0, textAlign: getDirectionalTextAlign(isRTL) }],
  };

  TextInputWithDefaults.defaultProps = {
    ...TextInputWithDefaults.defaultProps,
    style: [localizedFonts.regular, { letterSpacing: 0, textAlign: getDirectionalTextAlign(isRTL) }],
  };

  lastAppliedTypographyKey = nextTypographyKey;
}

function RevenueCatGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const convexAuth = useConvexAuth();
  const { user } = useUser();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const fulfillDiamondPurchase = useMutation("users:fulfillDiamondPurchase" as any);
  const setProTipNotificationIndex = useMutation("users:setProTipNotificationIndex" as any);
  const { showSuccess } = useProSuccess();
  const { notificationsDeclined, proTipNotificationIndex, setOptimisticAccess, setOptimisticCredits } = useViewerCredits();
  const { anonymousId } = useViewerSession();
  const pricingContext = usePricingContext();

  const configuredRef = useRef(false);
  const mountedRef = useRef(true);
  const hasSubscriptionRef = useRef<boolean | null>(null);
  const processedDiamondTransactionIdsRef = useRef(new Set<string>());
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const syncRef = useRef<(info?: RevenueCatCustomerInfo) => void>(() => undefined);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || configuredRef.current) return;
    let cancelled = false;

    const run = async () => {
      try {
        console.log("[Boot] RevenueCat initialization started");
        const purchases = await withStartupTimeout(
          configureRevenueCat(isSignedIn ? user?.id ?? null : null),
          "RevenueCat initialization",
        );
        if (cancelled || !mountedRef.current) {
          return;
        }
        console.log("[Boot] RevenueCat initialization finished", { configured: Boolean(purchases) });
        if (!purchases) {
          console.warn("[Boot] RevenueCat unavailable - skipping");
          return;
        }
        purchasesRef.current = purchases;
        configuredRef.current = true;
        setRevenueCatReady(true);
      } catch (error) {
        console.warn("[Boot] RevenueCat initialization failed", error);
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
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
    const purchases = purchasesRef.current;
    if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;

    void (async () => {
      try {
        await syncRevenueCatPricingAttributes(purchases, pricingContext.revenueCat);
        await fetchTieredPackage(purchases, pricingContext.revenueCat);
      } catch (error) {
        console.warn("[Boot] RevenueCat pricing sync failed", error);
      }
    })();
  }, [
    isLoaded,
    pricingContext.revenueCat.countryCode,
    pricingContext.revenueCat.currencyCode,
    pricingContext.revenueCat.offeringHint,
    pricingContext.revenueCat.tierId,
    revenueCatReady,
  ]);

  useEffect(() => {
    syncRef.current = async (info?: RevenueCatCustomerInfo) => {
      const purchases = purchasesRef.current;
      if (!mountedRef.current || !revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
      try {
        const customerInfo = info ?? (await purchases.getCustomerInfo());
        if (!mountedRef.current) {
          return;
        }

        const subscriptionState = resolveRevenueCatSubscription(customerInfo);
        const hasSubscription = hasActiveSubscription(customerInfo);
        setOptimisticAccess({
          hasPaidAccess: hasSubscription,
          hasProAccess: hasSubscription,
          subscriptionType:
            subscriptionState.subscriptionType === "weekly" || subscriptionState.subscriptionType === "yearly"
              ? subscriptionState.subscriptionType
              : "free",
        });

        const canSyncAuthenticatedPlan =
          isLoaded &&
          isSignedIn &&
          Boolean(user?.id) &&
          !convexAuth.isLoading &&
          convexAuth.isAuthenticated;

        if (canSyncAuthenticatedPlan) {
          await setPlan({
            plan: subscriptionState.plan,
            subscriptionType: subscriptionState.subscriptionType,
            subscriptionEntitlement: subscriptionState.entitlement,
            purchasedAt: subscriptionState.purchasedAt ?? undefined,
            subscriptionEnd: hasSubscription ? subscriptionState.subscriptionEnd ?? undefined : 0,
          });
        }

        for (const transaction of customerInfo?.nonSubscriptionTransactions ?? []) {
          const productIdentifier = transaction.productIdentifier;
          const packId = inferRevenueCatDiamondPackId({ productIdentifier });
          if (!packId) {
            continue;
          }

          const purchasedAt = Date.parse(transaction.purchaseDate);
          const transactionId =
            transaction.transactionIdentifier
            ?? `${productIdentifier}:${Number.isFinite(purchasedAt) ? purchasedAt : 0}:${packId}`;

          if (processedDiamondTransactionIdsRef.current.has(transactionId)) {
            continue;
          }

          const transactionTimestamp = Number.isFinite(purchasedAt) ? purchasedAt : Date.now();
          const priceSnapshot = pricingContext.diamondPacks[packId]?.price;
          const fulfillment = await fulfillDiamondPurchase({
            anonymousId: anonymousId ?? undefined,
            transactionId,
            productIdentifier,
            packageIdentifier: undefined,
            packId,
            purchasedAt: Number.isFinite(transactionTimestamp) ? transactionTimestamp : Date.now(),
            amount: priceSnapshot?.amount ?? 0,
            currencyCode: priceSnapshot?.currencyCode ?? pricingContext.currencyCode,
            pricingTier: pricingContext.tierId,
            countryCode: pricingContext.countryCode,
          }) as { credits?: number };
          if (!mountedRef.current) {
            return;
          }

          processedDiamondTransactionIdsRef.current.add(transactionId);

          if (typeof fulfillment?.credits === "number") {
            setOptimisticCredits(fulfillment.credits);
          }
        }

        if (hasSubscriptionRef.current === null) {
          hasSubscriptionRef.current = hasSubscription;
        } else if (hasSubscription && !hasSubscriptionRef.current) {
          showSuccess();
          void scheduleOrUpdateProTip({
            notificationsDeclined,
            proTipNotificationIndex,
            persistNextTipIndex: async (nextIndex) => {
              await setProTipNotificationIndex({ anonymousId: anonymousId ?? undefined, nextIndex });
            },
          });
          hasSubscriptionRef.current = true;
        } else {
          hasSubscriptionRef.current = hasSubscription;
        }
      } catch (error) {
        console.warn("RevenueCat sync failed", error);
      }
    };
  }, [
    anonymousId,
    convexAuth.isAuthenticated,
    convexAuth.isLoading,
    fulfillDiamondPurchase,
    isLoaded,
    isSignedIn,
    pricingContext.countryCode,
    pricingContext.currencyCode,
    pricingContext.diamondPacks,
    pricingContext.tierId,
    notificationsDeclined,
    proTipNotificationIndex,
    revenueCatReady,
    setOptimisticAccess,
    setOptimisticCredits,
    setPlan,
    setProTipNotificationIndex,
    showSuccess,
  ]);

  useEffect(() => {
    const purchases = purchasesRef.current;
    if (!revenueCatReady || !configuredRef.current || !isLoaded || !purchases) return;
    void syncRef.current();

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
  const applyReferral = useMutation("users:applyReferral" as any);
  const { anonymousId, isReady: viewerReady } = useViewerSession();

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
      if (code) {
        void setReferralCode(code).catch(() => undefined);
      }
    };

    void Linking.getInitialURL().then(handleUrl).catch(() => undefined);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!viewerReady) return;
    const run = async () => {
      const code = await consumeReferralCode();
      if (code) {
        await applyReferral({ referralCode: code, anonymousId: anonymousId ?? undefined });
      }
    };
    void run().catch(() => undefined);
  }, [anonymousId, applyReferral, viewerReady]);

  return null;
}

function Providers({ children, convexClient }: { children: React.ReactNode; convexClient: ConvexReactClient }) {
  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <ConvexBootDiagnostics>
      <ProSuccessProvider>
        {children}
      </ProSuccessProvider>
      </ConvexBootDiagnostics>
    </ConvexProviderWithClerk>
  );
}

function ConvexBootDiagnostics({ children }: { children: React.ReactNode }) {
  const convexAuth = useConvexAuth();
  const didLogReadyRef = useRef(false);

  useEffect(() => {
    console.log("[Boot] Convex provider initialization started");
  }, []);

  useEffect(() => {
    if (!convexAuth.isLoading && !didLogReadyRef.current) {
      didLogReadyRef.current = true;
      console.log("[Boot] Convex provider initialization finished", {
        authenticated: convexAuth.isAuthenticated,
      });
    }
  }, [convexAuth.isAuthenticated, convexAuth.isLoading]);

  return <>{children}</>;
}

function ClerkBootDiagnostics({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();
  const didLogReadyRef = useRef(false);

  useEffect(() => {
    console.log("[Boot] Clerk initialization started");
  }, []);

  useEffect(() => {
    if (isLoaded && !didLogReadyRef.current) {
      didLogReadyRef.current = true;
      console.log("[Boot] Clerk initialization finished");
    }
  }, [isLoaded]);

  return <>{children}</>;
}

function BootScreen({
  message,
  onRetry,
  timeoutMs = BOOT_SCREEN_TIMEOUT_MS,
}: {
  message: string;
  onRetry?: () => void;
  timeoutMs?: number;
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!onRetry) {
      return;
    }

    setTimedOut(false);
    const timeout = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [message, onRetry, timeoutMs]);

  if (timedOut) {
    return (
      <View style={bootStyles.screen}>
        <View style={bootStyles.card}>
          <Text style={bootStyles.title}>
            {i18n.t("boot.connectionProblemTitle", { defaultValue: "Problème de connexion" })}
          </Text>
          <Text style={bootStyles.body}>
            {i18n.t("boot.connectionProblemMessage", {
              defaultValue: "Impossible de se connecter. Vérifiez votre connexion et réessayez.",
            })}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              bootStyles.button,
              pressed ? bootStyles.buttonPressed : null,
            ]}
          >
            <Text style={bootStyles.buttonText}>
              {i18n.t("boot.retry", { defaultValue: "Réessayer" })}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={bootStyles.screen}>
      <View style={bootStyles.card}>
        <ActivityIndicator color={DS.colors.textPrimary} />
        <Text style={bootStyles.title}>{i18n.t("boot.loadingApp")}</Text>
        <Text style={bootStyles.body}>{message}</Text>
      </View>
    </View>
  );
}

function LocalizationSyncGate() {
  const locales = useLocales();
  const calendars = useCalendars();
  const localeSignature = locales
    .map((locale) => locale.languageTag ?? locale.languageCode ?? "")
    .join("|");
  const calendarSignature = calendars
    .map((calendar) => calendar.timeZone ?? "")
    .join("|");

  useEffect(() => {
    void syncAppLanguageWithSystem(locales, calendars).then((result) => {
      if (result.layoutDirectionChanged) {
        void reloadAppForLayoutDirection().catch(() => undefined);
      }
    }).catch(() => undefined);
  }, [calendarSignature, localeSignature]);

  return null;
}

function NotificationScheduleGate() {
  const { anonymousId } = useViewerSession();
  const setProTipNotificationIndex = useMutation("users:setProTipNotificationIndex" as any);
  const [scheduleTick, setScheduleTick] = useState(0);
  const {
    diamondBalance,
    hasPaidAccess,
    hasProAccess,
    isReady,
    lastClaimAt,
    nextDiamondClaimAt,
    notificationsDeclined,
    proTipNotificationIndex,
    subscriptionType,
  } = useViewerCredits();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setScheduleTick((current) => current + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (DIAGNOSTIC_BYPASS || !isReady) {
      return;
    }

    void syncTieredNotifications({
      isReady,
      hasPaidAccess,
      hasProAccess,
      diamondBalance,
      lastDiamondClaimAt: lastClaimAt,
      nextDiamondClaimAt,
      notificationsDeclined,
      proTipNotificationIndex,
      persistNextTipIndex: async (nextIndex) => {
        await setProTipNotificationIndex({ anonymousId: anonymousId ?? undefined, nextIndex });
      },
      subscriptionType,
    });
  }, [
    anonymousId,
    diamondBalance,
    hasPaidAccess,
    hasProAccess,
    isReady,
    lastClaimAt,
    nextDiamondClaimAt,
    notificationsDeclined,
    proTipNotificationIndex,
    scheduleTick,
    setProTipNotificationIndex,
    subscriptionType,
  ]);

  return null;
}

function NotificationResponseGate() {
  const router = useRouter();
  const handledResponseRef = useRef<string | null>(null);

  useEffect(() => {
    if (DIAGNOSTIC_BYPASS) {
      return;
    }

    let mounted = true;
    let subscription: { remove: () => void } | null = null;

    const handleRoute = (response: any) => {
      const request = response?.notification?.request;
      const identifier = request?.identifier;
      const route = request?.content?.data?.route;
      if (typeof identifier === "string" && handledResponseRef.current === identifier) {
        return;
      }
      if (typeof route !== "string" || route.length === 0) {
        return;
      }

      handledResponseRef.current = typeof identifier === "string" ? identifier : route;
      router.push(route as any);
    };

    void (async () => {
      const nextSubscription = await safeNotifications.addNotificationResponseReceivedListener(handleRoute);
      if (!mounted) {
        nextSubscription?.remove();
        return;
      }

      subscription = nextSubscription;
      const lastResponse = await safeNotifications.getLastNotificationResponseAsync();
      if (mounted && lastResponse) {
        handleRoute(lastResponse);
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [router]);

  return null;
}

function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

function DeferredStartupGates({ remoteSyncEnabled }: { remoteSyncEnabled: boolean }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fallback = setTimeout(() => {
      if (mounted) {
        setReady(true);
      }
    }, 1200);
    const task = InteractionManager.runAfterInteractions(() => {
      if (mounted) {
        clearTimeout(fallback);
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(fallback);
      task.cancel?.();
    };
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <>
      {DIAGNOSTIC_BYPASS || !remoteSyncEnabled ? null : <ReferralGate />}
      {DIAGNOSTIC_BYPASS || !remoteSyncEnabled ? null : <RevenueCatGate />}
      <LocalizationSyncGate />
      <GenerationAccessCacheGate remoteSyncEnabled={remoteSyncEnabled} />
      {DIAGNOSTIC_BYPASS || !remoteSyncEnabled ? null : <NotificationScheduleGate />}
      {DIAGNOSTIC_BYPASS || !remoteSyncEnabled ? null : <NotificationResponseGate />}
    </>
  );
}

function CreateAccessGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const PUBLIC_AUTH_ROUTES = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/legal-viewer",
  "/privacy-policy",
  "/terms-of-service",
  "/language-settings",
]);

function AuthRedirectGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [authSkipped, setAuthSkipped] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeAuthSkipped((skipped) => {
      if (mounted) {
        setAuthSkipped(skipped);
      }
    });

    void readAuthSkipped().then((skipped) => {
      if (mounted) {
        setAuthSkipped(skipped);
      }
    }).catch(() => undefined);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || DIAGNOSTIC_BYPASS) {
      return;
    }

    const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.has(pathname);
    if (!isSignedIn) {
      if (authSkipped) {
        return;
      }
      if (!isPublicAuthRoute) {
        router.replace({
          pathname: "/(auth)/sign-in",
          params: pathname && pathname !== "/" ? { returnTo: pathname } : undefined,
        } as any);
      }
      return;
    }

    if (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/forgot-password") {
      router.replace("/(tabs)" as any);
    }
  }, [authSkipped, isLoaded, isSignedIn, pathname, router]);

  return <>{children}</>;
}

function AppShell() {
  const languagePreference = useAppLanguagePreference();
  const theme = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.bg).catch(() => undefined);
  }, [theme.bg]);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[rootLayoutStyles.screen, { backgroundColor: theme.bg }]}
    >
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: languagePreference.isRTL ? "slide_from_left" : "slide_from_right",
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="(auth)"
          options={{
            presentation: "modal",
            contentStyle: { backgroundColor: theme.bg },
          }}
        />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: "fullScreenModal",
            animation: "fade_from_bottom",
            contentStyle: { backgroundColor: theme.bg },
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="settings" />
        <Stack.Screen name="language-settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
        <Stack.Screen name="sign-up" options={{ presentation: "modal" }} />
        <Stack.Screen name="legal-viewer" options={{ presentation: "modal" }} />
        <Stack.Screen name="privacy-policy" options={{ presentation: "modal" }} />
        <Stack.Screen name="terms-of-service" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const languagePreference = useAppLanguagePreference();
  const localizedFonts = useLocalizedAppFonts();
  const [fontsLoaded, fontError] = useFonts({
    Inter: require("../assets/Fonts/InterVariable.ttf"),
  });
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);
  const [envReport, setEnvReport] = useState(() => getEnvReport());
  const [bootRetryKey, setBootRetryKey] = useState(0);
  const [allowServiceConfigBypass, setAllowServiceConfigBypass] = useState(false);
  const clerkKey = envReport.values.clerkPublishableKey;
  const missingEnvSignature = envReport.missing.join("|");
  const fallbackConvexClient = useMemo(
    () => new ConvexReactClient(FALLBACK_CONVEX_URL, { logger: false }),
    [],
  );
  const convexClient = useMemo(
    () => {
      if (!envReport.values.convexUrl) {
        return null;
      }

      try {
        return getConvexClient();
      } catch (error) {
        console.warn("[Boot] Convex client initialization failed", error);
        return null;
      }
    },
    [envReport.values.convexUrl],
  );
  const serviceConfigReady = Boolean(clerkKey && convexClient);
  const degradedServiceConfig = !serviceConfigReady && allowServiceConfigBypass;
  const effectiveClerkKey = clerkKey ?? (degradedServiceConfig ? FALLBACK_CLERK_PUBLISHABLE_KEY : undefined);
  const effectiveConvexClient = convexClient ?? (degradedServiceConfig ? fallbackConvexClient : null);
  const postHogApiKey = envReport.values.posthogApiKey ?? POSTHOG_API_KEY;
  const postHogHost = envReport.values.posthogHost ?? POSTHOG_HOST;
  const bootReady = (fontsLoaded || Boolean(fontError) || fontsTimedOut) && i18nReady;
  const retryBoot = useMemo(() => () => {
    console.log("[Boot] Retry requested");
    setAllowServiceConfigBypass(false);
    setEnvReport(getEnvReport());
    setBootRetryKey((current) => current + 1);
  }, []);

  if (fontsLoaded && !fontError) {
    applyGlobalTypographyDefaults(localizedFonts, languagePreference.isRTL);
  }

  useEffect(() => {
    logEnvDiagnostics(envReport);
  }, [envReport]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setFontsTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn("[Boot] Font loading timed out - continuing with system fonts");
      setFontsTimedOut(true);
    }, STARTUP_OPERATION_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [fontError, fontsLoaded]);

  useEffect(() => {
    console.log("[Boot] Service configuration status", {
      bootReady,
      hasClerkKey: Boolean(clerkKey),
      hasConvexUrl: Boolean(envReport.values.convexUrl),
      hasConvexClient: Boolean(convexClient),
      degradedServiceConfig,
      missing: envReport.missing,
    });
  }, [bootReady, clerkKey, convexClient, degradedServiceConfig, missingEnvSignature, envReport.values.convexUrl]);

  useEffect(() => {
    console.log("[Boot] PostHog initialization started", { enabled: Boolean(postHogApiKey) });
    console.log("[Boot] PostHog initialization finished", { configured: Boolean(postHogApiKey) });
  }, [postHogApiKey]);

  useEffect(() => {
    if (!bootReady) {
      return;
    }

    if (envReport.hasCriticalConfig) {
      return;
    }

    let mounted = true;
    let attempts = 0;
    const retry = setInterval(() => {
      attempts += 1;
      const nextReport = getEnvReport();
      setEnvReport(nextReport);
      if (nextReport.hasCriticalConfig) {
        setAllowServiceConfigBypass(false);
        clearInterval(retry);
        return;
      }
      if (mounted && attempts === SERVICE_CONFIG_WARNING_ATTEMPTS) {
        console.warn(
          "[Boot] Service configuration is still unavailable after startup.",
          nextReport.missing,
        );
      }
    }, SERVICE_CONFIG_RETRY_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(retry);
    };
  }, [bootReady, bootRetryKey, envReport.hasCriticalConfig]);

  useEffect(() => {
    if (!bootReady || serviceConfigReady) {
      setAllowServiceConfigBypass(false);
      return;
    }

    const timeout = setTimeout(() => {
      const nextReport = getEnvReport();
      setEnvReport(nextReport);
      if (!nextReport.hasCriticalConfig) {
        console.warn(
          "[Boot] Service configuration timed out. Opening the app in offline/degraded mode.",
          nextReport.missing,
        );
        setAllowServiceConfigBypass(true);
      }
    }, SERVICE_CONFIG_BYPASS_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [bootReady, bootRetryKey, serviceConfigReady]);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("[Boot] i18n initialization timed out - continuing with fallback language");
        setI18nReady(true);
      }
    }, 4000);

    console.log("[Boot] i18n initialization started");
    void initializeI18n().then(() => {
      console.log("[Boot] i18n initialization finished");
      if (mounted) {
        clearTimeout(timeout);
        setI18nReady(true);
      }
    }).catch((error) => {
      clearTimeout(timeout);
      console.warn("[Boot] i18n initialization failed - continuing with fallback language", error);
      if (mounted) {
        setI18nReady(true);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!bootReady) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    });
    return () => cancelAnimationFrame(frame);
  }, [bootReady]);

  if (!bootReady) {
    return (
      <AppErrorBoundary>
        <BootScreen message={i18n.t("boot.preparingWorkspace", { defaultValue: "Préparation de votre espace..." })} />
      </AppErrorBoundary>
    );
  }

  if (!effectiveClerkKey || !effectiveConvexClient) {
    return (
      <AppErrorBoundary>
        <BootScreen
          key={`service-config-${bootRetryKey}`}
          message={i18n.t("boot.loadingConfiguration", { defaultValue: "Chargement de la configuration..." })}
          onRetry={retryBoot}
        />
      </AppErrorBoundary>
    );
  }

  const appTree = (
    <GestureHandlerRootView
      key={languagePreference.isRTL ? "rtl" : "ltr"}
      style={{ flex: 1, direction: languagePreference.isRTL ? "rtl" : "ltr" }}
    >
      <AppThemeProvider>
          <SafeAreaProvider style={rootLayoutStyles.screen}>
            <ClerkProvider
              key={`clerk-${bootRetryKey}-${effectiveClerkKey}`}
              publishableKey={effectiveClerkKey}
              tokenCache={tokenCache}
            >
            <ClerkBootDiagnostics>
            <AuthGate>
              <Providers convexClient={effectiveConvexClient}>
                <ViewerSessionProvider remoteSyncEnabled={!degradedServiceConfig}>
                  <ViewerCreditsProvider remoteSyncEnabled={!degradedServiceConfig}>
                    <DiamondStoreProvider>
                      <FlowUIProvider>
                        <WorkspaceDraftProvider>
                          <BottomSheetModalProvider>
                            <DeferredStartupGates remoteSyncEnabled={!degradedServiceConfig} />
                            <CreateAccessGate>
                              <AuthRedirectGate>
                                <AppShell />
                              </AuthRedirectGate>
                            </CreateAccessGate>
                            <OfflineOverlay />
                          </BottomSheetModalProvider>
                        </WorkspaceDraftProvider>
                      </FlowUIProvider>
                    </DiamondStoreProvider>
                  </ViewerCreditsProvider>
                </ViewerSessionProvider>
              </Providers>
            </AuthGate>
            </ClerkBootDiagnostics>
            </ClerkProvider>
          </SafeAreaProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );

  const postHogDisabled = !postHogApiKey;
  const trackedTree = (
    <PostHogProvider
      apiKey={postHogApiKey ?? POSTHOG_DISABLED_API_KEY}
      autocapture={postHogDisabled ? false : {
        captureScreens: true,
        captureTouches: false,
      }}
      options={{
        disabled: postHogDisabled,
        host: postHogHost,
        enableSessionReplay: !postHogDisabled,
        sessionReplayConfig: {
          maskAllTextInputs: true,
        },
      }}
    >
      {appTree}
    </PostHogProvider>
  );

  return (
    <AppErrorBoundary>
      {trackedTree}
    </AppErrorBoundary>
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
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
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
  },
  body: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  list: {
    width: "100%" as const,
    gap: DS.spacing[1],
  },
  listItem: {
    color: DS.colors.textPrimary,
    ...DS.typography.bodySm,
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
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
};

const rootLayoutStyles = {
  screen: {
    flex: 1,
  },
};
