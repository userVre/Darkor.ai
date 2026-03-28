import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { ArrowRight, BadgeCheck, Check, X } from "lucide-react-native";

import { LuxPressable } from "../components/lux-pressable";
import { useProSuccess } from "../components/pro-success-context";
import { triggerHaptic } from "../lib/haptics";
import { dismissLaunchPaywall } from "../lib/launch-paywall";
import { LUX_SPRING } from "../lib/motion";
import {
  configureRevenueCat,
  findRevenueCatPackage,
  getRevenueCatClient,
  hasActiveSubscription,
  inferBillingDurationFromCustomerInfo,
  inferPlanFromCustomerInfo,
  inferPurchaseDateFromCustomerInfo,
  inferSubscriptionEndFromCustomerInfo,
  type BillingDuration,
  type BillingPlan,
  type RevenueCatPackage,
  type RevenueCatPurchases,
} from "../lib/revenuecat";

const pointerClassName = "cursor-pointer";
const PREMIUM_FONT_FAMILY = process.env.EXPO_OS === "ios" ? "Avenir Next" : "sans-serif";
const DISPLAY_FONT_FAMILY = process.env.EXPO_OS === "ios" ? "Avenir Next" : "sans-serif-condensed";
const HERO_GAP = 12;
const AUTO_SCROLL_MS = 2600;

const FEATURE_ITEMS = [
  "Completely Watermark-free",
  "Redesign a room in 10 seconds",
  "Impress clients with 4K renders",
  "Unlock 50+ Premium AI Styles",
] as const;

const PLAN_COPY = {
  yearly: {
    savingsBadge: "SAVE 92%",
    valueBadge: "BEST VALUE",
    price: "$0.90",
    priceSuffix: "/week",
    subtitle: "Billed annually at $47.52",
    trial: "7-day free trial included",
    noTrial: "Instant access after checkout",
  },
  weekly: {
    title: "Weekly Access",
    price: "$11.90",
    subtitle: "Billed weekly - no commitment",
  },
} as const;

const HERO_SLIDES = [
  { id: "hero-luxury-lounge", image: require("../assets/media/paywall/paywall-luxury-lounge.png") },
  { id: "hero-marble-kitchen", image: require("../assets/media/paywall/paywall-marble-kitchen.png") },
  { id: "hero-boho-bedroom", image: require("../assets/media/paywall/paywall-boho-bedroom.png") },
  { id: "hero-gaming-room", image: require("../assets/media/paywall/paywall-gaming-room.png") },
  { id: "hero-garden-pool", image: require("../assets/media/paywall/paywall-garden-pool.png") },
  { id: "hero-dining-room", image: require("../assets/media/paywall/paywall-dining-room.png") },
  { id: "hero-soft-lounge", image: require("../assets/media/paywall/paywall-soft-lounge.png") },
] as const;

const LOOPED_HERO_SLIDES = [...HERO_SLIDES, ...HERO_SLIDES, ...HERO_SLIDES].map((slide, index) => ({
  ...slide,
  key: `${slide.id}-${index}`,
}));

const LOOP_OFFSET = HERO_SLIDES.length;
const HERO_DOT_COUNT = 3;
const COUNTDOWN_MS = 5000;
const TIMER_SIZE = 38;
const TIMER_STROKE = 3;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function TrialSwitch({ value, onPress }: { value: boolean; onPress: () => void }) {
  const translateX = useSharedValue(value ? 28 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 28 : 0, {
      damping: 16,
      stiffness: 180,
    });
  }, [translateX, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <LuxPressable
      onPress={onPress}
      className={pointerClassName}
      style={[styles.toggleTrack, value ? styles.toggleTrackActive : null]}
      glowColor={value ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)"}
      scale={0.985}
    >
      <Animated.View style={[styles.toggleThumb, value ? styles.toggleThumbActive : null, thumbStyle]} />
    </LuxPressable>
  );
}

const FeaturePill = memo(function FeaturePill({ label }: { label: string }) {
  return (
    <View style={styles.featurePill}>
      <BadgeCheck color="#e4e4e7" size={15} strokeWidth={2.1} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
});

const HeroSlide = memo(function HeroSlide({
  image,
  index,
  width,
  height,
  snapInterval,
  scrollX,
}: {
  image: number;
  index: number;
  width: number;
  height: number;
  snapInterval: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const center = index * snapInterval;
    const inputRange = [center - snapInterval, center, center + snapInterval];
    const scale = interpolate(scrollX.value, inputRange, [0.74, 1.18, 0.74], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.38, 1, 0.38], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [18, -12, 18], Extrapolation.CLAMP);
    const translateX = interpolate(scrollX.value, inputRange, [14, 0, -14], Extrapolation.CLAMP);
    const rotateY = interpolate(scrollX.value, inputRange, [22, 0, -22], Extrapolation.CLAMP);
    const zIndex = interpolate(scrollX.value, inputRange, [1, 30, 1], Extrapolation.CLAMP);

    return {
      opacity,
      zIndex,
      transform: [{ perspective: 900 }, { translateX }, { scale }, { rotateY: `${rotateY}deg` }, { translateY }],
    };
  });

  return (
    <Animated.View style={[styles.heroSlideWrap, { width, height }, animatedStyle]}>
      <View style={styles.heroSlideCard}>
        <Image
          source={image}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={140}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.04)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.48)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  );
});

function PlanCard({
  duration,
  active,
  freeTrialEnabled,
  onPress,
}: {
  duration: BillingDuration;
  active: boolean;
  freeTrialEnabled: boolean;
  onPress: () => void;
}) {
  const isYearly = duration === "yearly";

  return (
    <MotiView
      animate={{ opacity: active || isYearly ? 1 : 0.85, scale: active ? 1 : isYearly ? 0.992 : 0.985 }}
      transition={LUX_SPRING}
      style={styles.planCardMotion}
    >
      <LuxPressable
        onPress={onPress}
        className={pointerClassName}
        style={[
          styles.planCard,
          isYearly ? styles.planCardYearly : styles.planCardWeekly,
          active ? styles.planCardSelected : null,
        ]}
        glowColor={active ? "rgba(124,58,237,0.24)" : isYearly ? "rgba(124,58,237,0.16)" : "rgba(255,255,255,0.04)"}
        scale={0.992}
      >
        {isYearly ? (
          <LinearGradient
            colors={["#4C1D95", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planCardGlow}
            pointerEvents="none"
          />
        ) : null}

        {active ? (
          <View style={styles.planSelectedCheck}>
            <Check color="#ffffff" size={15} strokeWidth={3} />
          </View>
        ) : null}

        {isYearly ? (
          <View style={styles.planContent}>
            <View style={styles.yearlyBadgeStack}>
              <View style={styles.yearlySavingsBadge}>
                <Text style={styles.yearlySavingsBadgeText}>{PLAN_COPY.yearly.savingsBadge}</Text>
              </View>
              <View style={styles.yearlyValueBadge}>
                <Text style={styles.yearlyValueBadgeText}>{PLAN_COPY.yearly.valueBadge}</Text>
              </View>
            </View>

            <View style={styles.yearlyPriceRow}>
              <Text style={styles.yearlyPrice}>{PLAN_COPY.yearly.price}</Text>
              <Text style={styles.yearlyPriceSuffix}>{PLAN_COPY.yearly.priceSuffix}</Text>
            </View>

            <Text style={styles.yearlyBillingText}>{PLAN_COPY.yearly.subtitle}</Text>

            <View style={[styles.yearlyTrialRow, !freeTrialEnabled ? styles.yearlyTrialRowMuted : null]}>
              <View style={[styles.yearlyTrialCheck, !freeTrialEnabled ? styles.yearlyTrialCheckMuted : null]}>
                <Check color="#052e16" size={14} strokeWidth={3} />
              </View>
              <Text style={[styles.yearlyTrialText, !freeTrialEnabled ? styles.yearlyTrialTextMuted : null]}>
                {freeTrialEnabled ? PLAN_COPY.yearly.trial : PLAN_COPY.yearly.noTrial}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.planContent}>
            <Text style={styles.weeklyLabel}>{PLAN_COPY.weekly.title}</Text>
            <Text style={styles.weeklyPrice}>{PLAN_COPY.weekly.price}</Text>
            <Text style={styles.weeklySubtitle}>{PLAN_COPY.weekly.subtitle}</Text>
          </View>
        )}
      </LuxPressable>
    </MotiView>
  );
}

function DwaraTimer({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [canDismiss, setCanDismiss] = useState(false);
  const countdownProgress = useSharedValue(0);
  const revealProgress = useSharedValue(0);

  useEffect(() => {
    setCanDismiss(false);
    countdownProgress.value = 0;
    revealProgress.value = 0;
    countdownProgress.value = withTiming(
      1,
      { duration: COUNTDOWN_MS, easing: Easing.linear },
      (finished) => {
        if (!finished) {
          return;
        }
        runOnJS(setCanDismiss)(true);
        revealProgress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      },
    );
  }, [countdownProgress, revealProgress]);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: TIMER_CIRCUMFERENCE * countdownProgress.value,
  }));

  const timerStyle = useAnimatedStyle(() => ({
    opacity: 1 - revealProgress.value,
    transform: [{ scale: 1 - revealProgress.value * 0.08 }],
  }));

  const closeStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [{ scale: 0.92 + revealProgress.value * 0.08 }],
  }));

  return (
    <View style={styles.timerShell}>
      <Animated.View pointerEvents="none" style={[styles.timerLayer, timerStyle]}>
        <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={TIMER_RADIUS}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={TIMER_STROKE}
            fill="none"
          />
          <AnimatedCircle
            animatedProps={ringAnimatedProps}
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={TIMER_RADIUS}
            stroke="#d946ef"
            strokeWidth={TIMER_STROKE}
            strokeLinecap="round"
            strokeDasharray={TIMER_CIRCUMFERENCE}
            fill="none"
          />
        </Svg>
        <View style={styles.timerCore} />
      </Animated.View>

      <Animated.View style={[styles.timerLayer, closeStyle]}>
        <LuxPressable
          onPress={onDismiss}
          disabled={!canDismiss}
          className={pointerClassName}
          style={styles.closeButton}
          glowColor="rgba(217,70,239,0.14)"
          scale={0.96}
        >
          <X color="#f4f4f5" size={18} strokeWidth={2.2} />
        </LuxPressable>
      </Animated.View>
    </View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const { showSuccess, showToast } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const carouselRef = useRef<FlatList<(typeof LOOPED_HERO_SLIDES)[number]> | null>(null);
  const currentIndexRef = useRef<number>(LOOP_OFFSET);

  const scrollX = useSharedValue(0);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bottomDockHeight, setBottomDockHeight] = useState(204);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  const compactLevel = height < 720 ? 2 : height < 840 ? 1 : 0;
  const contentWidth = Math.min(width - 28, 428);
  const heroWidth = compactLevel === 2 ? 96 : compactLevel === 1 ? 108 : 118;
  const heroHeight = compactLevel === 2 ? 132 : compactLevel === 1 ? 148 : 164;
  const heroSnapInterval = heroWidth + HERO_GAP;
  const heroInset = Math.max((contentWidth - heroWidth) / 2, 0);

  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );
  const isCtaDisabled = isLoading || !selectedPackage;
  const toggleLabel = freeTrialEnabled
    ? "Free Trial: 7 days free, then billed"
    : "No trial - subscribe immediately";

  const onHeroScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const normalizeHeroSlideIndex = useCallback((index: number) => {
    const slideCount = HERO_SLIDES.length;
    return ((index % slideCount) + slideCount) % slideCount;
  }, []);

  const syncCarouselToIndex = useCallback(
    (index: number, animated: boolean) => {
      const nextOffset = index * heroSnapInterval;
      currentIndexRef.current = index;
      scrollX.value = nextOffset;
      setActiveHeroSlide(normalizeHeroSlideIndex(index));
      carouselRef.current?.scrollToOffset({ offset: nextOffset, animated });
    },
    [heroSnapInterval, normalizeHeroSlideIndex, scrollX],
  );

  const normalizeLoopIndex = useCallback(
    (index: number) => {
      const slideCount = HERO_SLIDES.length;
      if (index < slideCount || index >= slideCount * 2) {
        const normalized = LOOP_OFFSET + (((index % slideCount) + slideCount) % slideCount);
        requestAnimationFrame(() => {
          syncCarouselToIndex(normalized, false);
        });
      }
    },
    [syncCarouselToIndex],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      syncCarouselToIndex(LOOP_OFFSET, false);
    });
  }, [syncCarouselToIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      syncCarouselToIndex(currentIndexRef.current + 1, true);
    }, AUTO_SCROLL_MS);

    return () => clearInterval(timer);
  }, [syncCarouselToIndex]);

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
        if (!active) return;
        setPackages(offerings.current?.availablePackages ?? []);
      } catch {
        if (active) {
          console.warn("[Paywall] Offerings unavailable");
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
      purchasedAt?: number | null,
      subscriptionEnd?: number | null,
    ) => {
      await setPlan({
        plan,
        subscriptionType,
        purchasedAt: typeof purchasedAt === "number" ? purchasedAt : undefined,
        subscriptionEnd: typeof subscriptionEnd === "number" ? subscriptionEnd : undefined,
      });
    },
    [setPlan],
  );

  const handleClose = useCallback(() => {
    triggerHaptic();
    dismissLaunchPaywall();
    router.replace("/(tabs)");
  }, [router]);

  const handleSelectDuration = useCallback((duration: BillingDuration) => {
    triggerHaptic();
    setSelectedDuration(duration);
  }, []);

  const handleToggleTrial = useCallback(() => {
    triggerHaptic();
    setFreeTrialEnabled((current) => !current);
  }, []);

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

      const inferredPlan = inferPlanFromCustomerInfo(info);
      const inferredDuration = inferBillingDurationFromCustomerInfo(info);
      const purchasedAt = inferPurchaseDateFromCustomerInfo(info);
      const subscriptionEnd = inferSubscriptionEndFromCustomerInfo(info);

      if (isSignedIn) {
        await persistPurchasedPlan(inferredPlan, inferredDuration, purchasedAt, subscriptionEnd);
      }

      if (inferredPlan === "trial") {
        showToast("Your 7-day Darkor.ai Pro trial is active.");
      } else {
        showSuccess();
      }

      dismissLaunchPaywall();
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, persistPurchasedPlan, router, showSuccess, showToast]);

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

      const purchasedPlan: BillingPlan = inferPlanFromCustomerInfo(result.customerInfo);

      if (isSignedIn) {
        await persistPurchasedPlan(purchasedPlan, selectedDuration, Date.now(), null);
      }

      if (freeTrialEnabled && purchasedPlan === "trial") {
        showToast("Your 7-day Darkor.ai Pro trial is active.");
      } else {
        showSuccess();
      }

      dismissLaunchPaywall();
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase cancelled.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
    } finally {
      setIsLoading(false);
    }
  }, [
    isSignedIn,
    persistPurchasedPlan,
    router,
    freeTrialEnabled,
    selectedDuration,
    selectedPackage,
    showSuccess,
    showToast,
  ]);

  const handleCarouselMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / heroSnapInterval);
      currentIndexRef.current = nextIndex;
      setActiveHeroSlide(normalizeHeroSlideIndex(nextIndex));
      normalizeLoopIndex(nextIndex);
    },
    [heroSnapInterval, normalizeHeroSlideIndex, normalizeLoopIndex],
  );

  const renderHeroItem = useCallback(
    ({
      item,
      index,
    }: {
      item: (typeof LOOPED_HERO_SLIDES)[number];
      index: number;
    }) => (
      <HeroSlide
        image={item.image}
        index={index}
        width={heroWidth}
        height={heroHeight}
        snapInterval={heroSnapInterval}
        scrollX={scrollX}
      />
    ),
    [heroHeight, heroSnapInterval, heroWidth, scrollX],
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#09090b", "#09090b", "#050505"]}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <View style={[styles.closeRow, { paddingTop: insets.top + 6 }]}>
        <View style={styles.closeSpacer} />
        <DwaraTimer onDismiss={handleClose} />
      </View>

      <View style={styles.layout}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (compactLevel === 2 ? 52 : 58),
              paddingBottom: bottomDockHeight + Math.max(insets.bottom + 20, 28),
              paddingHorizontal: 14,
            },
          ]}
        >
        <View style={[styles.mainStack, { width: contentWidth, gap: compactLevel === 2 ? 14 : 18 }]}>
          <View style={[styles.heroSection, { gap: compactLevel === 2 ? 10 : 14 }]}>
            <View style={styles.headerCopy}>
              <Text style={styles.brandMark}>DARKOR.AI PRO</Text>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingStars}>★★★★★</Text>
                <Text style={styles.ratingText}>4.8 · 2,400+ happy designers</Text>
              </View>
              <Text style={[styles.title, compactLevel === 2 ? styles.titleCompact : null]}>
                Transform any room with AI — photorealistic in seconds.
              </Text>
            </View>

            <View style={styles.carouselShell}>
              <Animated.FlatList
                ref={carouselRef as any}
                data={LOOPED_HERO_SLIDES}
                keyExtractor={(item) => item.key}
                renderItem={renderHeroItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={heroSnapInterval}
                snapToAlignment="start"
                decelerationRate="fast"
                bounces={false}
                contentInsetAdjustmentBehavior="never"
                scrollEventThrottle={16}
                onScroll={onHeroScroll}
                onMomentumScrollEnd={handleCarouselMomentumEnd}
                contentContainerStyle={{ paddingHorizontal: heroInset }}
                ItemSeparatorComponent={() => <View style={{ width: HERO_GAP }} />}
                getItemLayout={(_, index) => ({
                  index,
                  length: heroSnapInterval,
                  offset: heroSnapInterval * index,
                })}
                style={styles.carouselList}
                removeClippedSubviews={false}
              />
            </View>

            <View style={styles.carouselDots}>
              {Array.from({ length: HERO_DOT_COUNT }).map((_, index) => {
                const isActive = activeHeroSlide % HERO_DOT_COUNT === index;

                return (
                  <View
                    key={`hero-dot-${index}`}
                    style={[styles.carouselDot, isActive ? styles.carouselDotActive : null]}
                  />
                );
              })}
            </View>

            <View style={[styles.featureGrid, compactLevel === 2 ? styles.featureGridCompact : null]}>
              {FEATURE_ITEMS.map((item) => (
                <FeaturePill key={item} label={item} />
              ))}
            </View>
          </View>

          <View style={[styles.pricingStack, { gap: compactLevel === 2 ? 10 : 12 }]}>
            <View style={styles.urgencyBanner}>
              <Text style={styles.urgencyBannerText}>🔥 Limited Offer — Free trial ends soon</Text>
            </View>
            <View style={styles.planStack}>
              <PlanCard
                duration="yearly"
                active={selectedDuration === "yearly"}
                freeTrialEnabled={freeTrialEnabled}
                onPress={() => handleSelectDuration("yearly")}
              />
              <PlanCard
                duration="weekly"
                active={selectedDuration === "weekly"}
                freeTrialEnabled={freeTrialEnabled}
                onPress={() => handleSelectDuration("weekly")}
              />
            </View>
          </View>
        </View>

        </ScrollView>

        <View
          onLayout={(event) => setBottomDockHeight(event.nativeEvent.layout.height)}
          style={[
            styles.bottomDockWrap,
            {
              paddingHorizontal: 14,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View style={[styles.bottomDock, { width: contentWidth }]}>
            <View style={styles.toggleRow}>
              <MotiView
                key={`trial-copy-${freeTrialEnabled ? "on" : "off"}`}
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={LUX_SPRING}
                style={styles.toggleCopy}
              >
                <Text style={[styles.toggleLabel, freeTrialEnabled ? styles.toggleLabelOn : styles.toggleLabelOff]}>
                  {toggleLabel}
                </Text>
              </MotiView>
              <TrialSwitch value={freeTrialEnabled} onPress={handleToggleTrial} />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.ctaPulseShell}>
              {!isCtaDisabled ? (
                <MotiView
                  from={{ opacity: 0.3, scale: 0.98 }}
                  animate={{ opacity: 0.58, scale: 1.03 }}
                  transition={{ type: "timing", duration: 2000, loop: true, repeatReverse: true }}
                  style={styles.ctaPulse}
                />
              ) : null}

              <LuxPressable
                onPress={handlePurchase}
                disabled={isCtaDisabled}
                className={pointerClassName}
                style={[styles.ctaOuter, isCtaDisabled ? styles.ctaOuterDisabled : null]}
                glowColor="rgba(124,58,237,0.22)"
                scale={0.992}
              >
                <LinearGradient
                  colors={isCtaDisabled ? ["#4b4b4f", "#323236"] : ["#7C3AED", "#EC4899"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.ctaGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.ctaText}>Processing...</Text>
                    </View>
                  ) : (
                    <MotiView
                      key={`cta-${freeTrialEnabled ? "trial" : "pro"}`}
                      from={{ opacity: 0, translateY: 6 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={LUX_SPRING}
                      style={styles.ctaContent}
                    >
                      {freeTrialEnabled ? (
                        <>
                          <Text style={styles.ctaText}>Start Free Trial</Text>
                          <ArrowRight color="#ffffff" size={18} strokeWidth={2.5} />
                          <Text style={styles.ctaAccentText}>7 Days Free</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.ctaText}>Unlock Pro Access</Text>
                          <ArrowRight color="#ffffff" size={18} strokeWidth={2.5} />
                        </>
                      )}
                    </MotiView>
                  )}
                </LinearGradient>
              </LuxPressable>
            </View>

            <Text style={styles.trustRow}>✓ Cancel anytime  ·  ✓ Secure payment  ·  ✓ Instant access</Text>

            <LuxPressable
              onPress={handleRestore}
              className={pointerClassName}
              style={styles.restoreButton}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.99}
            >
              <Text style={styles.restoreText}>Already subscribed? Restore purchase</Text>
            </LuxPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#09090b",
    cursor: "pointer",
  },
  topGlow: {
    position: "absolute",
    top: -60,
    left: -24,
    right: -24,
    height: 280,
    borderRadius: 280,
  },
  closeRow: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeSpacer: {
    width: 44,
    height: 44,
  },
  timerShell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  timerLayer: {
    position: "absolute",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(24,24,27,0.94)",
    cursor: "pointer",
  },
  timerCore: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#d946ef",
  },
  layout: {
    flex: 1,
    cursor: "pointer",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  mainStack: {
    width: "100%",
    alignItems: "center",
    gap: 18,
    cursor: "pointer",
  },
  heroSection: {
    width: "100%",
    alignItems: "center",
    cursor: "pointer",
  },
  headerCopy: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
    paddingBottom: 18,
    cursor: "pointer",
  },
  brandMark: {
    color: "#f4f4f5",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900",
    fontFamily: DISPLAY_FONT_FAMILY,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    marginTop: -4,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderCurve: "continuous",
  },
  ratingStars: {
    color: "#FBBF24",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.2,
  },
  ratingText: {
    color: "#F4F4F5",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
  },
  title: {
    color: "#fafafa",
    fontSize: 31,
    lineHeight: 35,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.95,
    textAlign: "center",
    maxWidth: 330,
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 31,
  },
  carouselShell: {
    width: "100%",
    alignItems: "center",
    overflow: "visible",
    cursor: "pointer",
  },
  carouselList: {
    width: "100%",
    overflow: "visible",
    cursor: "pointer",
  },
  carouselDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  carouselDotActive: {
    backgroundColor: "#FFFFFF",
  },
  heroSlideWrap: {
    overflow: "visible",
    cursor: "pointer",
  },
  heroSlideCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#18181b",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
    cursor: "pointer",
  },
  featureGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  featureGridCompact: {
    gap: 8,
  },
  featurePill: {
    minWidth: "46%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(24,24,27,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    cursor: "pointer",
  },
  featureText: {
    flexShrink: 1,
    color: "#f4f4f5",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.12,
    textAlign: "center",
  },
  pricingStack: {
    width: "100%",
    cursor: "pointer",
  },
  urgencyBanner: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#92400E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  urgencyBannerText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  planStack: {
    width: "100%",
    gap: 12,
    cursor: "pointer",
  },
  planCardMotion: {
    width: "100%",
  },
  planCard: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    cursor: "pointer",
    borderCurve: "continuous",
    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
    position: "relative",
  },
  planCardYearly: {
    minHeight: 224,
    backgroundColor: "#4C1D95",
  },
  planCardWeekly: {
    minHeight: 148,
    backgroundColor: "#1A1A2E",
    borderColor: "#3D3D5C",
    paddingVertical: 18,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: "#A855F7",
  },
  planCardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  planSelectedCheck: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    boxShadow: "0 8px 18px rgba(76, 29, 149, 0.36)",
  },
  planContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 1,
  },
  yearlyBadgeStack: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  yearlySavingsBadge: {
    borderRadius: 999,
    backgroundColor: "#22C55E",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderCurve: "continuous",
  },
  yearlySavingsBadgeText: {
    color: "#052E16",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  yearlyValueBadge: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderCurve: "continuous",
  },
  yearlyValueBadgeText: {
    color: "#4C1D95",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.35,
    textAlign: "center",
  },
  yearlyPriceRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  yearlyPrice: {
    color: "#ffffff",
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -1.4,
  },
  yearlyPriceSuffix: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    marginTop: 14,
  },
  yearlyBillingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  yearlyTrialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(5,46,22,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.34)",
    borderCurve: "continuous",
  },
  yearlyTrialCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  yearlyTrialText: {
    color: "#ECFDF5",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  yearlyTrialRowMuted: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  yearlyTrialCheckMuted: {
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  yearlyTrialTextMuted: {
    color: "rgba(255,255,255,0.9)",
  },
  weeklyLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  weeklyPrice: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -1,
    textAlign: "center",
  },
  weeklySubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  toggleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(17,17,27,0.96)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderCurve: "continuous",
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
  },
  toggleLabelOn: {
    color: "#86EFAC",
  },
  toggleLabelOff: {
    color: "#9CA3AF",
  },
  toggleTrack: {
    width: 66,
    height: 38,
    borderRadius: 999,
    justifyContent: "center",
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#312E81",
    boxShadow: "0 10px 26px rgba(0, 0, 0, 0.24)",
  },
  toggleTrackActive: {
    backgroundColor: "#7C3AED",
    borderColor: "rgba(216,180,254,0.46)",
  },
  toggleThumb: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    boxShadow: "0 5px 14px rgba(0, 0, 0, 0.22)",
  },
  toggleThumbActive: {
    backgroundColor: "#ffffff",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  bottomDockWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(9,9,11,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  bottomDock: {
    width: "100%",
    gap: 10,
    alignItems: "center",
    cursor: "pointer",
    alignSelf: "center",
    paddingTop: 14,
  },
  ctaPulseShell: {
    width: "100%",
    position: "relative",
  },
  ctaPulse: {
    position: "absolute",
    top: 3,
    right: -4,
    bottom: 3,
    left: -4,
    borderRadius: 20,
    backgroundColor: "rgba(168,85,247,0.28)",
  },
  ctaOuter: {
    width: "100%",
    borderRadius: 16,
    cursor: "pointer",
  },
  ctaOuterDisabled: {
    opacity: 0.72,
  },
  ctaGradient: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    cursor: "pointer",
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.25,
  },
  ctaAccentText: {
    color: "#FCE7F3",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  trustRow: {
    color: "#9CA3AF",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
    width: "100%",
  },
  restoreButton: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    cursor: "pointer",
  },
  restoreText: {
    color: "#71717A",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
});
