import "react-native-gesture-handler";
import "react-native-reanimated";

import {ClerkProvider, useAuth, useUser} from "@clerk/expo";
import {BottomSheetModalProvider} from "@gorhom/bottom-sheet";
import {type ConvexReactClient, useConvexAuth, useMutation} from "convex/react";
import {ConvexProviderWithClerk} from "convex/react-clerk";
import {Asset} from "expo-asset";
import {useFonts} from "expo-font";
import * as Linking from "expo-linking";
import {useCalendars, useLocales} from "expo-localization";
import {Stack, usePathname, useRouter} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {useEffect, useMemo, useRef, useState} from "react";
import {ActivityIndicator, AppState, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps} from "react-native";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {SafeAreaProvider} from "react-native-safe-area-context";
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

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST;
const ROOT_BOOT_ASSETS = [
  require("../assets/logo.png"),
  require("../assets/splash.png"),
  require("../assets/adaptive-icon.png"),
];

const TextWithDefaults = Text as typeof Text & { defaultProps?: TextProps };
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: TextInputProps };

let lastAppliedTypographyKey = "";

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
    style: [localizedFonts.regular, { letterSpacing: 0.3, textAlign: getDirectionalTextAlign(isRTL) }],
  };

  TextInputWithDefaults.defaultProps = {
    ...TextInputWithDefaults.defaultProps,
    style: [localizedFonts.regular, { letterSpacing: 0.3, textAlign: getDirectionalTextAlign(isRTL) }],
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
        const purchases = await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
        if (cancelled || !mountedRef.current) {
          return;
        }
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
      <ProSuccessProvider>
        {children}
      </ProSuccessProvider>
    </ConvexProviderWithClerk>
  );
}

function StartupError({ error }: { error: Error }) {
  throw error;
  return null;
}

function toStartupError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallback);
}

function BootScreen({ message }: { message: string }) {
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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();

  if (!isLoaded && !DIAGNOSTIC_BYPASS) {
    return <BootScreen message={i18n.t("boot.loadingAccount")} />;
  }

  return <>{children}</>;
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

  return (
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
  );
}

export default function RootLayout() {
  const languagePreference = useAppLanguagePreference();
  const localizedFonts = useLocalizedAppFonts();
  const [fontsLoaded, fontError] = useFonts({
    Inter: require("../assets/Fonts/InterVariable.ttf"),
  });
  const [assetsReady, setAssetsReady] = useState(false);
  const [startupError, setStartupError] = useState<Error | null>(null);
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);
  const [envReport, setEnvReport] = useState(() => getEnvReport());
  const clerkKey = envReport.values.clerkPublishableKey;
  const convexClient = useMemo(
    () => (envReport.values.convexUrl ? getConvexClient() : null),
    [envReport.values.convexUrl],
  );
  const bootReady = (fontsLoaded || Boolean(fontError)) && assetsReady && i18nReady;

  if (fontsLoaded && !fontError) {
    applyGlobalTypographyDefaults(localizedFonts, languagePreference.isRTL);
  }

  useEffect(() => {
    logEnvDiagnostics(envReport);
  }, [envReport]);

  useEffect(() => {
    if (!bootReady || envReport.hasCriticalConfig) {
      return;
    }

    setEnvReport(getEnvReport());
    let attempts = 0;
    const retry = setInterval(() => {
      attempts += 1;
      setEnvReport(getEnvReport());
      if (attempts >= 20) {
        clearInterval(retry);
      }
    }, 250);
    return () => clearInterval(retry);
  }, [bootReady, envReport.hasCriticalConfig]);

  useEffect(() => {
    let mounted = true;

    void Asset.loadAsync(ROOT_BOOT_ASSETS).then(() => {
      if (mounted) {
        setAssetsReady(true);
      }
    }).catch((error) => {
      console.warn("[Boot] Startup assets failed to load", error);
      if (mounted) {
        setStartupError(toStartupError(error, "Startup assets failed to load"));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("[Boot] i18n initialization timed out - continuing with fallback language");
        setI18nReady(true);
      }
    }, 4000);

    void initializeI18n().then(() => {
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
    if (!bootReady && !startupError) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch((error) => console.warn("[Boot] Splash hide failed", error));
    });
    return () => cancelAnimationFrame(frame);
  }, [bootReady, startupError]);

  if (startupError) {
    return (
      <AppErrorBoundary>
        <StartupError error={startupError} />
      </AppErrorBoundary>
    );
  }

  if (!bootReady) {
    return (
      <AppErrorBoundary>
        <BootScreen message="Preparing your workspace" />
      </AppErrorBoundary>
    );
  }

  if (!clerkKey || !convexClient) {
    return (
      <AppErrorBoundary>
        <BootScreen
          message={i18n.t("boot.loadingConfiguration", { defaultValue: "Loading service configuration" })}
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
          <SafeAreaProvider>
            <ClerkProvider publishableKey={clerkKey ?? ""} tokenCache={tokenCache}>
            <AuthGate>
              <Providers convexClient={convexClient}>
                <ViewerSessionProvider>
                  {DIAGNOSTIC_BYPASS ? null : <ReferralGate />}
                  <ViewerCreditsProvider>
                    <DiamondStoreProvider>
                      <FlowUIProvider>
                        <WorkspaceDraftProvider>
                          <BottomSheetModalProvider>
{DIAGNOSTIC_BYPASS ? null : <RevenueCatGate />}
                            <LocalizationSyncGate />
                            <GenerationAccessCacheGate />
                            <NotificationScheduleGate />
                            <NotificationResponseGate />
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
            </ClerkProvider>
          </SafeAreaProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );

  const trackedTree = POSTHOG_API_KEY ? (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      autocapture={{
        captureScreens: true,
        captureTouches: false,
      }}
      options={{
        host: POSTHOG_HOST,
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: true,
        },
      }}
    >
      {appTree}
    </PostHogProvider>
  ) : appTree;

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
  buttonText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
};
