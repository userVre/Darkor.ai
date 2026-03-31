import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { AnimatePresence, MotiView } from "moti";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  AppState,
  Easing as RNEasing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Shield, X } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import { useProSuccess } from "../components/pro-success-context";
import { useViewerCredits } from "../components/viewer-credits-context";
import { useViewerSession } from "../components/viewer-session-context";
import { getGenerationLimit } from "../convex/subscriptions";
import { triggerHaptic } from "../lib/haptics";
import { dismissLaunchPaywall } from "../lib/launch-paywall";
import {
  configureRevenueCat,
  findRevenueCatPackage,
  getRevenueCatClient,
  hasActiveSubscription,
  resolveRevenueCatSubscription,
  type BillingDuration,
  type BillingPlan,
  type RevenueCatEntitlement,
  type RevenueCatPackage,
  type RevenueCatPurchases,
} from "../lib/revenuecat";
import { fonts } from "../styles/typography";

const SCREEN_BG = "#0D0D0D";
const SHEET_OVERLAY = "rgba(0,0,0,0.52)";
const PANEL_BG = "#1C1C1C";
const PANEL_BORDER = "#2A2A2A";
const BRAND_RED = "#E53935";
const TOGGLE_OFF = "#3A3A3A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#A0A0A0";
const TEXT_RESTORE = "#B3B3B3";
const TRANSITION_DURATION_MS = 200;
const CAROUSEL_INTERVAL_MS = 3000;
const CLOSE_DELAY_MS = 5000;
const CLOSE_SIZE = 32;
const CLOSE_STROKE_WIDTH = 2.5;
const CLOSE_RADIUS = (CLOSE_SIZE - CLOSE_STROKE_WIDTH) / 2;
const CLOSE_CIRCUMFERENCE = 2 * Math.PI * CLOSE_RADIUS;
const SIDE_IMAGE_WIDTH = 130;
const SIDE_IMAGE_HEIGHT = 160;
const CENTER_IMAGE_SIZE = 188;
const HERO_IMAGE_GAP = 12;
const HERO_ROW_WIDTH = SIDE_IMAGE_WIDTH * 2 + CENTER_IMAGE_SIZE + HERO_IMAGE_GAP * 2;
const HERO_ROW_HEIGHT = 252;
const HERO_IMAGES = [
  require("../assets/media/paywall/paywall-soft-lounge.png"),
  require("../assets/media/paywall/paywall-luxury-lounge.png"),
  require("../assets/media/paywall/paywall-marble-kitchen.png"),
] as const;
const FEATURE_ITEMS = [
  "Faster Rendering",
  "Ad-free Experience",
  "Unlimited Design Renders",
] as const;
const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

function FadeSwap({
  children,
  swapKey,
  style,
}: {
  children: ReactNode;
  swapKey: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <AnimatePresence exitBeforeEnter>
      <MotiView
        key={swapKey}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        from={{ opacity: 0 }}
        style={style}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      >
        {children}
      </MotiView>
    </AnimatePresence>
  );
}

function FeatureRow({ label, isLast }: { label: string; isLast: boolean }) {
  return (
    <View style={[styles.featureRow, !isLast ? styles.featureRowGap : null]}>
      <View style={styles.featureIcon}>
        <Check color={SCREEN_BG} size={12} strokeWidth={3} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function ToggleSwitch({ value }: { value: boolean }) {
  return (
    <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}>
      <MotiView
        animate={{ translateX: value ? 18 : 0 }}
        style={styles.toggleThumb}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      />
    </View>
  );
}

function HeroCarousel({ index, width }: { index: number; width: number }) {
  const leftImage = HERO_IMAGES[(index + HERO_IMAGES.length - 1) % HERO_IMAGES.length];
  const centerImage = HERO_IMAGES[index % HERO_IMAGES.length];
  const rightImage = HERO_IMAGES[(index + 1) % HERO_IMAGES.length];

  return (
    <View style={styles.heroClip}>
      <FadeSwap swapKey={`hero-${index}`} style={[styles.heroRow, { marginLeft: (width - HERO_ROW_WIDTH) / 2 }]}>
        <Image contentFit="cover" source={leftImage} style={styles.heroSideImage} transition={0} />
        <Image contentFit="cover" source={centerImage} style={styles.heroCenterImage} transition={0} />
        <Image contentFit="cover" source={rightImage} style={styles.heroSideImage} transition={0} />
      </FadeSwap>
    </View>
  );
}

function YearlyPlanCard({
  selected,
  onPress,
}: {
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, selected ? styles.planCardSelected : styles.planCardIdle, styles.yearlyCard]}>
      <View style={styles.bestOfferBadge}>
        <Text style={styles.bestOfferText}>BEST OFFER</Text>
      </View>

      <View style={styles.planRow}>
        <View style={styles.planCopy}>
          <Text style={styles.planLabel}>YEARLY ACCESS</Text>
          <Text style={styles.planSubtext}>Just MAD 484.99 per year</Text>
        </View>

        <View style={styles.planPriceColumn}>
          <Text style={styles.yearlyPrice}>MAD9.33</Text>
          <Text style={styles.planSubtext}>per week</Text>
        </View>
      </View>
    </Pressable>
  );
}

function WeeklyPlanCard({
  freeTrialEnabled,
  selected,
  onPress,
}: {
  freeTrialEnabled: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  if (freeTrialEnabled) {
    return (
      <FadeSwap swapKey="weekly-trial-on">
        <View>
          <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, styles.planCardSelected, styles.weeklyCard]}>
            <View style={styles.planRow}>
              <View style={styles.planCopy}>
                <Text style={styles.planLabel}>3-DAYS FREE TRIAL</Text>
              </View>

              <View style={styles.planPriceColumn}>
                <Text style={styles.weeklyTrialPrice}>then MAD 119.99</Text>
                <Text style={styles.planSubtext}>per week</Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.noPaymentRow}>
            <Shield color={TEXT_MUTED} size={14} strokeWidth={2.1} />
            <Text style={styles.noticeText}>No Payment Now</Text>
          </View>
        </View>
      </FadeSwap>
    );
  }

  return (
    <FadeSwap swapKey="weekly-trial-off">
      <View>
        <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, selected ? styles.planCardSelected : styles.planCardIdle, styles.weeklyCard]}>
          <View style={styles.planRow}>
            <View style={styles.planCopy}>
              <Text style={styles.planLabel}>WEEKLY ACCESS</Text>
            </View>

            <View style={styles.planPriceColumn}>
              <Text style={styles.weeklyPrice}>MAD 119.99 / per week</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.cancelAnytimeRow}>
          <Shield color={TEXT_MUTED} size={14} strokeWidth={2.1} />
          <Text style={styles.noticeText}>Cancel Anytime</Text>
        </View>
      </View>
    </FadeSwap>
  );
}

function CountdownCloseButton({
  canClose,
  onPress,
  progress,
  secondsLeft,
}: {
  canClose: boolean;
  onPress: () => void;
  progress: RNAnimated.Value;
  secondsLeft: number;
}) {
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CLOSE_CIRCUMFERENCE, 0],
  });

  return (
    <FadeSwap swapKey={canClose ? "close-ready" : "close-countdown"}>
      {canClose ? (
        <Pressable accessibilityLabel="Close paywall" accessibilityRole="button" onPress={onPress} style={styles.closeButton}>
          <View style={styles.closeButtonInner}>
            <X color={TEXT_PRIMARY} size={16} strokeWidth={2.4} />
          </View>
        </Pressable>
      ) : (
        <View pointerEvents="none" style={styles.closeButton}>
          <View style={styles.countdownWrap}>
            <Svg height={CLOSE_SIZE} style={styles.countdownSvg} width={CLOSE_SIZE}>
              <Circle
                cx={CLOSE_SIZE / 2}
                cy={CLOSE_SIZE / 2}
                fill="transparent"
                r={CLOSE_RADIUS}
                stroke={PANEL_BORDER}
                strokeWidth={CLOSE_STROKE_WIDTH}
              />
              <AnimatedCircle
                cx={CLOSE_SIZE / 2}
                cy={CLOSE_SIZE / 2}
                fill="transparent"
                r={CLOSE_RADIUS}
                stroke="#999999"
                strokeDasharray={`${CLOSE_CIRCUMFERENCE} ${CLOSE_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth={CLOSE_STROKE_WIDTH}
                transform={`rotate(-90 ${CLOSE_SIZE / 2} ${CLOSE_SIZE / 2})`}
              />
            </Svg>
            <Text style={styles.countdownText}>{Math.max(secondsLeft, 1)}</Text>
          </View>
        </View>
      )}
    </FadeSwap>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { source, redirectTo } = useLocalSearchParams<{
    source?: "launch" | "design-flow" | "generate";
    redirectTo?: string;
  }>();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { anonymousId } = useViewerSession();
  const { setOptimisticAccess } = useViewerCredits();
  const setPlan = useMutation("users:setViewerPlanFromRevenueCat" as any);
  const { showSuccess } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const entranceProgress = useSharedValue(0);
  const countdownDeadlineRef = useRef<number>(Date.now() + CLOSE_DELAY_MS);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownAnimationRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const countdownProgress = useRef(new RNAnimated.Value(0)).current;

  const [canClose, setCanClose] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(5);

  const yearlyPackage = useMemo(() => findRevenueCatPackage(packages, "yearly"), [packages]);
  const weeklyPackage = useMemo(() => findRevenueCatPackage(packages, "weekly"), [packages]);
  const selectedPackage = useMemo(() => {
    if (freeTrialEnabled) {
      return weeklyPackage ?? yearlyPackage ?? packages[0] ?? null;
    }

    const nextPackage = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
    return nextPackage ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
  }, [freeTrialEnabled, packages, selectedDuration, weeklyPackage, yearlyPackage]);

  const ctaDisabled = isLoading || !selectedPackage;
  const isYearlySelected = !freeTrialEnabled && selectedDuration === "yearly";
  const isWeeklySelected = freeTrialEnabled || selectedDuration === "weekly";
  const sheetHeight = Math.max(height - 12, 0);

  useEffect(() => {
    entranceProgress.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [entranceProgress]);

  const startCountdownAnimation = useCallback(
    (remainingMs: number) => {
      countdownAnimationRef.current?.stop();
      countdownProgress.setValue(Math.min(Math.max(1 - remainingMs / CLOSE_DELAY_MS, 0), 1));

      if (remainingMs <= 0) {
        countdownProgress.setValue(1);
        countdownAnimationRef.current = null;
        return;
      }

      const animation = RNAnimated.timing(countdownProgress, {
        toValue: 1,
        duration: remainingMs,
        easing: RNEasing.linear,
        useNativeDriver: false,
      });
      countdownAnimationRef.current = animation;
      animation.start(({ finished }) => {
        if (finished) {
          countdownAnimationRef.current = null;
        }
      });
    },
    [countdownProgress],
  );

  const syncCloseCountdown = useCallback(
    (restartAnimation: boolean) => {
      const remainingMs = Math.max(0, countdownDeadlineRef.current - Date.now());
      const nextCanClose = remainingMs <= 0;
      const nextSeconds = nextCanClose ? 0 : Math.ceil(remainingMs / 1000);

      setSecondsLeft((current) => (current === nextSeconds ? current : nextSeconds));
      setCanClose((current) => (current === nextCanClose ? current : nextCanClose));

      if (restartAnimation) {
        startCountdownAnimation(remainingMs);
      }

      if (nextCanClose && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    },
    [startCountdownAnimation],
  );

  useEffect(() => {
    countdownDeadlineRef.current = Date.now() + CLOSE_DELAY_MS;
    setCanClose(false);
    setSecondsLeft(5);
    startCountdownAnimation(CLOSE_DELAY_MS);
    syncCloseCountdown(false);
    countdownIntervalRef.current = setInterval(() => {
      syncCloseCountdown(false);
    }, 250);

    const appStateSubscription = AppState.addEventListener("change", () => {
      syncCloseCountdown(true);
    });

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      countdownAnimationRef.current?.stop();
      countdownAnimationRef.current = null;
      appStateSubscription.remove();
    };
  }, [startCountdownAnimation, syncCloseCountdown]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const loadOfferings = async () => {
      try {
        const cached = getRevenueCatClient();
        purchasesRef.current = cached ?? (await configureRevenueCat(isSignedIn ? user?.id ?? null : null));

        if (!active || !purchasesRef.current) {
          if (active) {
            setErrorMessage("Subscriptions are temporarily unavailable.");
          }
          return;
        }

        const offerings = await purchasesRef.current.getOfferings();
        if (!active) {
          return;
        }

        setPackages(offerings.current?.availablePackages ?? []);
      } catch {
        if (active) {
          setErrorMessage("Subscriptions are temporarily unavailable.");
        }
      }
    };

    void loadOfferings();

    return () => {
      active = false;
    };
  }, [isSignedIn, user?.id]);

  const persistPurchasedPlan = useCallback(
    async (
      plan: BillingPlan,
      subscriptionType: BillingDuration,
      subscriptionEntitlement: RevenueCatEntitlement,
      purchasedAt?: number | null,
      subscriptionEnd?: number | null,
    ) => {
      await setPlan({
        anonymousId: anonymousId ?? undefined,
        plan,
        subscriptionType,
        subscriptionEntitlement,
        purchasedAt: typeof purchasedAt === "number" ? purchasedAt : undefined,
        subscriptionEnd: typeof subscriptionEnd === "number" ? subscriptionEnd : undefined,
      });
    },
    [anonymousId, setPlan],
  );

  const closePaywall = useCallback(() => {
    if (source === "launch") {
      dismissLaunchPaywall();
    }
    router.replace("/(tabs)");
  }, [router, source]);

  const completePaywall = useCallback(() => {
    if (source === "launch") {
      dismissLaunchPaywall();
    }

    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(redirectTo as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [redirectTo, router, source]);

  const handleClose = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    closePaywall();
  }, [closePaywall, isLoading]);

  const handleRestore = useCallback(async () => {
    triggerHaptic();
    setErrorMessage(null);

    try {
      if (!purchasesRef.current) {
        Alert.alert("Restore failed", "Subscriptions are unavailable right now.");
        return;
      }

      setIsLoading(true);
      const info = await purchasesRef.current.restorePurchases();
      if (!hasActiveSubscription(info)) {
        Alert.alert("Restored", "No active subscriptions were found.");
        return;
      }

      const subscriptionState = resolveRevenueCatSubscription(info);

      if (subscriptionState.plan !== "pro" || subscriptionState.subscriptionType === "free") {
        Alert.alert("Restored", "No active subscriptions were found.");
        return;
      }

      await persistPurchasedPlan(
        subscriptionState.plan,
        subscriptionState.subscriptionType,
        subscriptionState.entitlement,
        subscriptionState.purchasedAt,
        subscriptionState.subscriptionEnd,
      );
      setOptimisticAccess({
        credits: getGenerationLimit(subscriptionState.subscriptionType),
        hasPaidAccess: true,
        subscriptionType: subscriptionState.subscriptionType,
      });
      showSuccess();
      completePaywall();
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [completePaywall, persistPurchasedPlan, setOptimisticAccess, showSuccess]);

  const handlePurchase = useCallback(async () => {
    triggerHaptic();
    setErrorMessage(null);

    if (!selectedPackage) {
      const message = "The selected plan is unavailable right now.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
      return;
    }

    try {
      if (!purchasesRef.current) {
        Alert.alert("Purchase Error", "Subscriptions are unavailable right now.");
        return;
      }

      setIsLoading(true);
      const result = await purchasesRef.current.purchasePackage(selectedPackage);
      if (!hasActiveSubscription(result.customerInfo)) {
        throw new Error("We could not confirm your subscription. Please try again.");
      }

      const subscriptionState = resolveRevenueCatSubscription(result.customerInfo);
      if (subscriptionState.plan !== "pro" || subscriptionState.subscriptionType === "free") {
        throw new Error("We could not confirm your subscription. Please try again.");
      }

      await persistPurchasedPlan(
        subscriptionState.plan,
        subscriptionState.subscriptionType,
        subscriptionState.entitlement,
        subscriptionState.purchasedAt,
        subscriptionState.subscriptionEnd,
      );
      setOptimisticAccess({
        credits: getGenerationLimit(subscriptionState.subscriptionType),
        hasPaidAccess: true,
        subscriptionType: subscriptionState.subscriptionType,
      });
      showSuccess();
      completePaywall();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase cancelled.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
    } finally {
      setIsLoading(false);
    }
  }, [completePaywall, persistPurchasedPlan, selectedPackage, setOptimisticAccess, showSuccess]);

  const handleToggleTrial = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setFreeTrialEnabled((current) => {
      const next = !current;
      if (!next) {
        setSelectedDuration("yearly");
      }
      return next;
    });
  }, [isLoading]);

  const handleSelectYearly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("yearly");
  }, [isLoading]);

  const handleSelectWeekly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("weekly");
  }, [isLoading]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: (1 - entranceProgress.value) * 56,
      },
    ],
  }));

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          presentation: "transparentModal",
          animation: "none",
          contentStyle: { backgroundColor: "transparent" },
          gestureEnabled: false,
        }}
      />
      <StatusBar style="light" />
      <Animated.View pointerEvents="none" style={[styles.overlay, overlayAnimatedStyle]} />

      <Animated.View style={[styles.sheet, { minHeight: sheetHeight }, sheetAnimatedStyle]}>
        <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => void handleRestore()} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore</Text>
        </Pressable>

        <CountdownCloseButton canClose={canClose} onPress={handleClose} progress={countdownProgress} secondsLeft={secondsLeft} />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <HeroCarousel index={carouselIndex} width={width} />

          <View style={styles.featuresSection}>
            {FEATURE_ITEMS.map((feature, index) => (
              <FeatureRow
                key={feature}
                isLast={index === FEATURE_ITEMS.length - 1}
                label={feature}
              />
            ))}
          </View>

          <Pressable accessibilityRole="switch" accessibilityState={{ checked: freeTrialEnabled }} onPress={handleToggleTrial} style={styles.trialBar}>
            <Text style={styles.trialLabel}>{freeTrialEnabled ? "Free trial enabled" : "Enable free trial"}</Text>
            <ToggleSwitch value={freeTrialEnabled} />
          </Pressable>

          <View style={styles.yearlyWrapper}>
            <YearlyPlanCard onPress={handleSelectYearly} selected={isYearlySelected} />
          </View>

          <View style={styles.weeklyWrapper}>
            <WeeklyPlanCard freeTrialEnabled={freeTrialEnabled} onPress={handleSelectWeekly} selected={isWeeklySelected} />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable accessibilityRole="button" disabled={ctaDisabled} onPress={() => void handlePurchase()} style={[styles.ctaButton, ctaDisabled ? styles.ctaButtonDisabled : null]}>
            {isLoading ? (
              <View style={styles.ctaLoadingRow}>
                <ActivityIndicator color={TEXT_PRIMARY} />
                <Text style={styles.ctaText}>Processing...</Text>
              </View>
            ) : (
              <FadeSwap swapKey={freeTrialEnabled ? "cta-trial" : "cta-continue"} style={styles.ctaContent}>
                <View style={styles.ctaLabelRow}>
                  <Text style={styles.ctaText}>{freeTrialEnabled ? "Try for Free" : "Continue"}</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </View>
              </FadeSwap>
            )}
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SHEET_OVERLAY,
  },
  sheet: {
    flex: 1,
    marginTop: 12,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: SCREEN_BG,
  },
  restoreButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  restoreText: {
    color: TEXT_RESTORE,
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: PANEL_BORDER,
  },
  countdownWrap: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownSvg: {
    position: "absolute",
  },
  countdownText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 11,
    ...fonts.bold,
  },
  scrollContent: {
    paddingTop: 0,
  },
  heroClip: {
    width: "100%",
    height: HERO_ROW_HEIGHT + 36,
    overflow: "hidden",
    backgroundColor: SCREEN_BG,
  },
  heroRow: {
    width: HERO_ROW_WIDTH,
    height: HERO_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 36,
  },
  heroSideImage: {
    width: SIDE_IMAGE_WIDTH,
    height: SIDE_IMAGE_HEIGHT,
    marginTop: 92,
    borderRadius: 16,
    backgroundColor: PANEL_BG,
  },
  heroCenterImage: {
    width: CENTER_IMAGE_SIZE,
    height: CENTER_IMAGE_SIZE,
    marginTop: 64,
    marginBottom: 36,
    marginHorizontal: HERO_IMAGE_GAP,
    borderRadius: 20,
    backgroundColor: PANEL_BG,
  },
  featuresSection: {
    marginHorizontal: 82,
    marginBottom: 36,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureRowGap: {
    marginBottom: 24,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: TEXT_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    ...fonts.medium,
  },
  trialBar: {
    height: 56,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: PANEL_BG,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trialLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    ...fonts.medium,
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  toggleTrackOn: {
    backgroundColor: BRAND_RED,
  },
  toggleTrackOff: {
    backgroundColor: TOGGLE_OFF,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TEXT_PRIMARY,
  },
  yearlyWrapper: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  weeklyWrapper: {
    marginTop: 12,
    marginHorizontal: 16,
  },
  planCard: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: PANEL_BG,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    justifyContent: "center",
  },
  yearlyCard: {
    height: 72,
  },
  weeklyCard: {
    minHeight: 72,
  },
  planCardIdle: {
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: BRAND_RED,
  },
  bestOfferBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    borderRadius: 20,
    backgroundColor: BRAND_RED,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestOfferText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 13,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planCopy: {
    flex: 1,
    justifyContent: "center",
  },
  planPriceColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 12,
  },
  planLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 14,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  planSubtext: {
    marginTop: 6,
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.regular,
  },
  yearlyPrice: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  weeklyTrialPrice: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  weeklyPrice: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  noPaymentRow: {
    marginTop: 16,
    marginLeft: 136,
    marginRight: 132,
    marginBottom: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cancelAnytimeRow: {
    marginTop: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noticeText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    ...fonts.medium,
  },
  errorText: {
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    textAlign: "center",
    color: "#FFB4B2",
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  ctaButton: {
    height: 58,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: BRAND_RED,
    justifyContent: "center",
    shadowColor: BRAND_RED,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    lineHeight: 22,
    ...fonts.bold,
  },
  ctaArrow: {
    marginLeft: 8,
    color: TEXT_PRIMARY,
    fontSize: 20,
    lineHeight: 22,
    ...fonts.bold,
  },
});
