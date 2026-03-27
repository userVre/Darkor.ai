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
import { ArrowRight, BadgeCheck, X } from "lucide-react-native";

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
  "Redesign a room in 10 seconds",
  "Impress clients with 4K renders",
  "Unlock 50+ Premium AI Styles",
  "Completely Watermark-free",
] as const;

const PLAN_COPY = {
  yearly: {
    badge: null,
    titleBadge: "SAVE 92%",
    title: "Yearly Access",
    price: "$0.90",
    priceSuffix: "/ week",
    subtitle: "Billed annually at $47.52",
  },
  weekly: {
    badge: "FREE TRIAL",
    titleBadge: null,
    title: "Weekly Access",
    price: "$11.90",
    priceSuffix: "/ week",
    subtitle: "Auto-selected for trial",
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
      glowColor="rgba(217,70,239,0.16)"
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
  active,
  title,
  price,
  priceSuffix,
  subtitle,
  badge,
  titleBadge,
  onPress,
}: {
  active: boolean;
  title: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  badge: string | null;
  titleBadge: string | null;
  onPress: () => void;
}) {
  return (
    <MotiView animate={{ scale: active ? 1 : 0.985 }} transition={LUX_SPRING} style={styles.planCardMotion}>
      <LuxPressable
      onPress={onPress}
      className={pointerClassName}
      style={[styles.planCard, active ? styles.planCardActive : null]}
      glowColor={active ? "rgba(217,70,239,0.18)" : "rgba(255,255,255,0.04)"}
      scale={0.99}
    >
        {active ? (
          <LinearGradient
            colors={["rgba(217,70,239,0.18)", "rgba(79,70,229,0.08)", "rgba(255,255,255,0)"]}
            locations={[0, 0.52, 1]}
            style={styles.planCardGlow}
            pointerEvents="none"
          />
        ) : null}

        {badge ? (
          <View style={[styles.planBadge, active ? styles.planBadgeActive : null]}>
            <Text style={[styles.planBadgeText, active ? styles.planBadgeTextActive : null]}>{badge}</Text>
          </View>
        ) : null}

        <View style={styles.planTitleRow}>
          <Text style={styles.planTitle}>{title}</Text>
          {titleBadge ? (
            <View style={styles.planTitleBadge}>
              <Text style={styles.planTitleBadgeText}>{titleBadge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPriceLine}>
            <Text style={styles.planPrice}>{price}</Text>
            <Text style={styles.planPriceSuffix}> {priceSuffix}</Text>
          </Text>
        </View>
        <Text style={styles.planSubtitle}>{subtitle}</Text>
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

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("weekly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const ctaTitle = freeTrialEnabled ? "Start Free Trial & Subscribe" : "Unlock Pro";
  const weeklySubtitle = freeTrialEnabled ? "Trial starts now, then billed weekly" : "Billed weekly";

  const onHeroScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const syncCarouselToIndex = useCallback(
    (index: number, animated: boolean) => {
      const nextOffset = index * heroSnapInterval;
      currentIndexRef.current = index;
      scrollX.value = nextOffset;
      carouselRef.current?.scrollToOffset({ offset: nextOffset, animated });
    },
    [heroSnapInterval, scrollX],
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

  const handleToggleTrial = useCallback(() => {
    triggerHaptic();
    setFreeTrialEnabled((current) => {
      const next = !current;
      setSelectedDuration(next ? "weekly" : "yearly");
      return next;
    });
  }, []);

  const handleSelectDuration = useCallback((duration: BillingDuration) => {
    triggerHaptic();
    setSelectedDuration(duration);

    if (duration === "weekly") {
      return;
    }

    setFreeTrialEnabled(false);
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
        showToast("Your 3-day Darkor.ai Pro trial is active.");
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

      const purchasedPlan: BillingPlan = freeTrialEnabled && selectedDuration === "weekly" ? "trial" : "pro";

      if (isSignedIn) {
        await persistPurchasedPlan(purchasedPlan, selectedDuration, Date.now(), null);
      }

      if (purchasedPlan === "trial") {
        showToast("Your 3-day Darkor.ai Pro trial is active.");
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
    freeTrialEnabled,
    isSignedIn,
    persistPurchasedPlan,
    router,
    selectedDuration,
    selectedPackage,
    showSuccess,
    showToast,
  ]);

  const handleCarouselMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / heroSnapInterval);
      currentIndexRef.current = nextIndex;
      normalizeLoopIndex(nextIndex);
    },
    [heroSnapInterval, normalizeLoopIndex],
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

      <View
        style={[
          styles.layout,
          {
            paddingTop: insets.top + (compactLevel === 2 ? 52 : 58),
            paddingBottom: Math.max(insets.bottom + 12, 18),
            paddingHorizontal: 14,
          },
        ]}
      >
        <View style={[styles.mainStack, { width: contentWidth, gap: compactLevel === 2 ? 14 : 18 }]}>
          <View style={[styles.heroSection, { gap: compactLevel === 2 ? 10 : 14 }]}>
            <View style={styles.headerCopy}>
              <Text style={styles.brandMark}>DARKOR.AI PRO</Text>
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

            <View style={[styles.featureGrid, compactLevel === 2 ? styles.featureGridCompact : null]}>
              {FEATURE_ITEMS.map((item) => (
                <FeaturePill key={item} label={item} />
              ))}
            </View>
          </View>

          <View style={[styles.pricingStack, { gap: compactLevel === 2 ? 10 : 12 }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleEyebrow}>Free Trial</Text>
              </View>
              <TrialSwitch value={freeTrialEnabled} onPress={handleToggleTrial} />
            </View>

            <View style={styles.planRow}>
              <PlanCard
                active={selectedDuration === "weekly"}
                title={PLAN_COPY.weekly.title}
                price={PLAN_COPY.weekly.price}
                priceSuffix={PLAN_COPY.weekly.priceSuffix}
                subtitle={freeTrialEnabled ? weeklySubtitle : "Billed weekly"}
                badge={freeTrialEnabled ? PLAN_COPY.weekly.badge : null}
                titleBadge={PLAN_COPY.weekly.titleBadge}
                onPress={() => handleSelectDuration("weekly")}
              />
              <PlanCard
                active={selectedDuration === "yearly"}
                title={PLAN_COPY.yearly.title}
                price={PLAN_COPY.yearly.price}
                priceSuffix={PLAN_COPY.yearly.priceSuffix}
                subtitle={PLAN_COPY.yearly.subtitle}
                badge={PLAN_COPY.yearly.badge}
                titleBadge={PLAN_COPY.yearly.titleBadge}
                onPress={() => handleSelectDuration("yearly")}
              />
            </View>

            <View style={styles.footerStack}>
              {freeTrialEnabled ? (
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>{"\u{1F6E1}\uFE0F No Payment Now"}</Text>
                </View>
              ) : null}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>{"\u2705 Cancel Anytime"}</Text>
              </View>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </View>

        <View style={[styles.bottomDock, { width: contentWidth, marginTop: compactLevel === 2 ? 10 : 14 }]}>
          <LuxPressable
            onPress={handlePurchase}
            disabled={isCtaDisabled}
            className={pointerClassName}
            style={[styles.ctaOuter, isCtaDisabled ? styles.ctaOuterDisabled : null]}
            glowColor="rgba(217,70,239,0.18)"
            scale={0.992}
          >
            <LinearGradient
              colors={isCtaDisabled ? ["#4b4b4f", "#323236"] : ["#d946ef", "#4f46e5"]}
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
                  key={`cta-${ctaTitle}`}
                  from={{ opacity: 0, translateY: 4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={LUX_SPRING}
                  style={styles.ctaContent}
                >
                  <Text style={styles.ctaText}>{ctaTitle}</Text>
                  <ArrowRight color="#ffffff" size={20} strokeWidth={2.5} />
                </MotiView>
              )}
            </LinearGradient>
          </LuxPressable>

          <LuxPressable
            onPress={handleRestore}
            className={pointerClassName}
            style={styles.restoreButton}
            glowColor="rgba(255,255,255,0.04)"
            scale={0.99}
          >
            <Text style={styles.restoreText}>Restore purchase</Text>
          </LuxPressable>
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
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  mainStack: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(24,24,27,0.96)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    cursor: "pointer",
  },
  toggleCopy: {
    flex: 1,
  },
  toggleEyebrow: {
    color: "#fafafa",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.1,
  },
  toggleTrack: {
    width: 66,
    height: 38,
    borderRadius: 999,
    justifyContent: "center",
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#3f3f46",
    boxShadow: "0 10px 26px rgba(0, 0, 0, 0.24)",
  },
  toggleTrackActive: {
    backgroundColor: "#7c3aed",
    borderColor: "rgba(216,180,254,0.42)",
  },
  toggleThumb: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    boxShadow: "0 5px 14px rgba(0, 0, 0, 0.22)",
  },
  toggleThumbActive: {
    backgroundColor: "#fdf4ff",
  },
  planRow: {
    flexDirection: "row",
    gap: 10,
    cursor: "pointer",
  },
  planCardMotion: {
    flex: 1,
  },
  planCard: {
    minHeight: 136,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(24,24,27,0.96)",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    cursor: "pointer",
  },
  planCardActive: {
    borderColor: "rgba(217,70,239,0.46)",
    backgroundColor: "#18181b",
  },
  planCardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  planBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  planBadgeActive: {
    borderColor: "rgba(217,70,239,0.28)",
    backgroundColor: "rgba(217,70,239,0.14)",
  },
  planBadgeText: {
    color: "#d4d4d8",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.55,
  },
  planBadgeTextActive: {
    color: "#f5d0fe",
  },
  planTitle: {
    color: "#fafafa",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.25,
    textAlign: "center",
  },
  planTitleRow: {
    minHeight: 42,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  planTitleBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.34)",
    backgroundColor: "#22c55e",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planTitleBadgeText: {
    color: "#052e16",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.45,
  },
  planPriceRow: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 38,
  },
  planPriceLine: {
    textAlign: "center",
  },
  planPrice: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.85,
  },
  planPriceSuffix: {
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
  },
  planSubtitle: {
    color: "#a1a1aa",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  footerStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    cursor: "pointer",
  },
  footerRow: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  footerText: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
    width: "100%",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
  },
  bottomDock: {
    width: "100%",
    gap: 8,
    alignItems: "center",
    cursor: "pointer",
  },
  ctaOuter: {
    width: "100%",
    borderRadius: 999,
    cursor: "pointer",
  },
  ctaOuterDisabled: {
    opacity: 0.72,
  },
  ctaGradient: {
    minHeight: 62,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    cursor: "pointer",
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.25,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  restoreButton: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: "pointer",
  },
  restoreText: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
