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
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react-native";

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
const AUTO_SCROLL_INTERVAL_MS = 3200;
const HERO_IMAGE_GAP = 10;

const FEATURE_ITEMS = [
  "Unlock 4K Ultra-HD renders",
  "20+ premium styles",
  "No watermarks",
  "Faster Rendering",
] as const;

const PLAN_COPY = {
  yearly: {
    badge: "BEST VALUE",
    title: "Yearly",
    price: "$0.90 / week",
    subtitle: "Just $47.52 per year",
  },
  weekly: {
    badge: null,
    title: "Weekly",
    price: "$11.90 / week",
    subtitle: "Includes 3-day free trial",
  },
} as const;

const HERO_SLIDES = [
  {
    id: "master-suite",
    image: require("../assets/media/discover/home/home-master-suite.jpg"),
  },
  {
    id: "infinity-pool",
    image: require("../assets/media/discover/garden/garden-infinity-pool.jpg"),
  },
  {
    id: "gaming-room",
    image: require("../assets/media/discover/home/home-gaming-room.jpg"),
  },
  {
    id: "living-room",
    image: require("../assets/media/discover/home/home-living-room.jpg"),
  },
  {
    id: "kitchen",
    image: require("../assets/media/discover/home/home-kitchen.jpg"),
  },
] as const;

const LOOPED_HERO_SLIDES = Array.from({ length: 3 }, (_, blockIndex) =>
  HERO_SLIDES.map((slide) => ({
    ...slide,
    loopId: `${slide.id}-${blockIndex}`,
  })),
).flat();

const BASE_LOOP_INDEX = HERO_SLIDES.length;

function TrialSwitch({ value, onPress }: { value: boolean; onPress: () => void }) {
  const translateX = useSharedValue(value ? 22 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 22 : 0, {
      damping: 18,
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
      glowColor="rgba(255,255,255,0.08)"
      scale={0.98}
    >
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
    </LuxPressable>
  );
}

const FeatureRow = memo(function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Check color="#f5f5f5" size={14} strokeWidth={3} />
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
    const inputRange = [
      (index - 1) * snapInterval,
      index * snapInterval,
      (index + 1) * snapInterval,
    ];

    return {
      transform: [
        {
          scale: interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [10, 0, 10], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(scrollX.value, inputRange, [0.68, 1, 0.68], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[styles.heroCardWrap, { width, height }, animatedStyle]}>
      <View style={styles.heroCard}>
        <Image
          source={image}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={140}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.36)"]}
          locations={[0, 0.68, 1]}
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
  subtitle,
  badge,
  onPress,
}: {
  active: boolean;
  title: string;
  price: string;
  subtitle: string;
  badge: string | null;
  onPress: () => void;
}) {
  return (
    <MotiView
      animate={{ scale: active ? 1 : 0.992 }}
      transition={LUX_SPRING}
    >
      <LuxPressable
        onPress={onPress}
        className={pointerClassName}
        style={[styles.planCard, active ? styles.planCardActive : null]}
        glowColor={active ? "rgba(246, 223, 180, 0.18)" : "rgba(255,255,255,0.04)"}
        scale={0.985}
      >
        {badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}

        {active ? (
          <MotiView
            from={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={LUX_SPRING}
            style={styles.planSelectionGlow}
          />
        ) : null}

        <View style={styles.planRow}>
          <View style={styles.planLeft}>
            <View style={[styles.radioOuter, active ? styles.radioOuterActive : null]}>
              {active ? <View style={styles.radioInner} /> : null}
            </View>

            <View style={styles.planCopy}>
              <Text style={styles.planTitle}>{title}</Text>
              <Text style={styles.planSubtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.planPriceBlock}>
            <Text style={styles.planPrice}>{price}</Text>
            {active ? (
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillText}>Selected</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LuxPressable>
    </MotiView>
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

  const carouselRef = useRef<FlatList<(typeof LOOPED_HERO_SLIDES)[number]> | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const currentCarouselIndexRef = useRef<number>(BASE_LOOP_INDEX);
  const isDraggingCarouselRef = useRef(false);

  const scrollX = useSharedValue(0);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCompact = height < 860;
  const isVeryCompact = height < 760;
  const contentWidth = Math.min(width - 32, 430);
  const heroCardWidth = Math.min(width - 76, 320);
  const heroCardHeight = Math.max(188, Math.min(isVeryCompact ? 208 : 228, Math.round(heroCardWidth * 0.72)));
  const heroSnapInterval = heroCardWidth + HERO_IMAGE_GAP;
  const heroInset = (width - heroCardWidth) / 2;
  const footerLine = freeTrialEnabled ? "No Payment Now" : "Cancel Anytime";
  const ctaTitle = freeTrialEnabled ? "Try for Free" : "Continue";
  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );
  const isCtaDisabled = isLoading || !selectedPackage;

  const onHeroScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    const initialOffset = BASE_LOOP_INDEX * heroSnapInterval;
    scrollX.value = initialOffset;

    requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
    });
  }, [heroSnapInterval, scrollX]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDraggingCarouselRef.current) return;

      let nextIndex = currentCarouselIndexRef.current + 1;
      if (nextIndex >= HERO_SLIDES.length * 2) {
        const resetIndex = BASE_LOOP_INDEX;
        const resetOffset = resetIndex * heroSnapInterval;
        carouselRef.current?.scrollToOffset({ offset: resetOffset, animated: false });
        currentCarouselIndexRef.current = resetIndex;
        scrollX.value = resetOffset;
        nextIndex = resetIndex + 1;
      }

      carouselRef.current?.scrollToOffset({
        offset: nextIndex * heroSnapInterval,
        animated: true,
      });
      currentCarouselIndexRef.current = nextIndex;
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [heroSnapInterval, scrollX]);

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
    if (duration === "yearly") {
      setFreeTrialEnabled(false);
    }
  }, []);

  const handleToggleTrial = useCallback(() => {
    triggerHaptic();
    setFreeTrialEnabled((current) => {
      const next = !current;
      setSelectedDuration(next ? "weekly" : "yearly");
      return next;
    });
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

      const purchasedPlan: BillingPlan =
        freeTrialEnabled && selectedDuration === "weekly" ? "trial" : "pro";

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

  const handleHeroMomentumEnd = useCallback(
    (offsetX: number) => {
      const rawIndex = Math.round(offsetX / heroSnapInterval);
      const minIndex = HERO_SLIDES.length;
      const maxIndex = HERO_SLIDES.length * 2 - 1;

      let normalizedIndex = rawIndex;
      if (rawIndex < minIndex || rawIndex > maxIndex) {
        const relativeIndex =
          ((rawIndex % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length;
        normalizedIndex = BASE_LOOP_INDEX + relativeIndex;
        carouselRef.current?.scrollToOffset({
          offset: normalizedIndex * heroSnapInterval,
          animated: false,
        });
      }

      currentCarouselIndexRef.current = normalizedIndex;
      isDraggingCarouselRef.current = false;
    },
    [heroSnapInterval],
  );

  const renderHeroSlide = useCallback(
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
        width={heroCardWidth}
        height={heroCardHeight}
        snapInterval={heroSnapInterval}
        scrollX={scrollX}
      />
    ),
    [heroCardHeight, heroCardWidth, heroSnapInterval, scrollX],
  );

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom + 126, 136),
            paddingHorizontal: 16,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <LuxPressable
            onPress={handleClose}
            className={pointerClassName}
            style={styles.closeButton}
            glowColor="rgba(255,255,255,0.08)"
          >
            <X color="#f5f5f5" size={18} strokeWidth={2.4} />
          </LuxPressable>
        </View>

        <View style={[styles.mainStack, { width: contentWidth }]}>
          <View style={[styles.heroStack, { gap: isVeryCompact ? 10 : 14 }]}>
            <View style={styles.heroCarouselShell}>
              <Animated.FlatList
                ref={carouselRef as any}
                data={LOOPED_HERO_SLIDES}
                keyExtractor={(item) => item.loopId}
                renderItem={renderHeroSlide}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={heroSnapInterval}
                decelerationRate="fast"
                bounces={false}
                contentContainerStyle={{ paddingHorizontal: heroInset }}
                ItemSeparatorComponent={() => <View style={{ width: HERO_IMAGE_GAP }} />}
                getItemLayout={(_, index) => ({
                  index,
                  length: heroSnapInterval,
                  offset: heroSnapInterval * index,
                })}
                initialScrollIndex={BASE_LOOP_INDEX}
                onScroll={onHeroScroll}
                onScrollBeginDrag={() => {
                  isDraggingCarouselRef.current = true;
                }}
                onMomentumScrollEnd={(event) => {
                  handleHeroMomentumEnd(event.nativeEvent.contentOffset.x);
                }}
                onScrollEndDrag={() => {
                  if (!isDraggingCarouselRef.current) return;
                  setTimeout(() => {
                    isDraggingCarouselRef.current = false;
                  }, 120);
                }}
                scrollEventThrottle={16}
                style={{ marginHorizontal: -16 }}
                contentInsetAdjustmentBehavior="never"
              />
            </View>

            <View style={[styles.featureStack, { gap: isCompact ? 8 : 10 }]}>
              {FEATURE_ITEMS.map((item) => (
                <FeatureRow key={item} label={item} />
              ))}
            </View>
          </View>

          <View style={[styles.offerStack, { gap: isVeryCompact ? 10 : 12 }]}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Enable free trial</Text>
              <TrialSwitch value={freeTrialEnabled} onPress={handleToggleTrial} />
            </View>

            <PlanCard
              active={selectedDuration === "yearly"}
              title={PLAN_COPY.yearly.title}
              price={PLAN_COPY.yearly.price}
              subtitle={PLAN_COPY.yearly.subtitle}
              badge={PLAN_COPY.yearly.badge}
              onPress={() => handleSelectDuration("yearly")}
            />

            <PlanCard
              active={selectedDuration === "weekly"}
              title={PLAN_COPY.weekly.title}
              price={PLAN_COPY.weekly.price}
              subtitle={PLAN_COPY.weekly.subtitle}
              badge={PLAN_COPY.weekly.badge}
              onPress={() => handleSelectDuration("weekly")}
            />

            <MotiView
              key={`footer-${freeTrialEnabled ? "trial" : "standard"}`}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={LUX_SPRING}
              style={styles.footerStatus}
            >
              {freeTrialEnabled ? (
                <ShieldCheck color="#8b8b90" size={15} strokeWidth={2.2} />
              ) : (
                <Check color="#8b8b90" size={15} strokeWidth={2.8} />
              )}
              <Text style={styles.footerStatusText}>{footerLine}</Text>
            </MotiView>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.bottomDock,
          {
            paddingBottom: Math.max(insets.bottom + 12, 18),
            paddingHorizontal: 16,
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.92)", "#000000"]}
          locations={[0, 0.38, 1]}
          style={styles.bottomDockShade}
          pointerEvents="none"
        />

        <View style={[styles.bottomDockContent, { width: contentWidth }]}>
          <LuxPressable
            onPress={handlePurchase}
            disabled={isCtaDisabled}
            className={pointerClassName}
            style={[styles.ctaOuter, isCtaDisabled ? styles.ctaOuterDisabled : null]}
            glowColor="rgba(243, 223, 184, 0.18)"
          >
            <LinearGradient
              colors={isCtaDisabled ? ["#49433a", "#302c26"] : ["#f3dfb8", "#cea56d"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#0b0b0c" />
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
                  <ArrowRight color="#0b0b0c" size={18} strokeWidth={2.6} />
                </MotiView>
              )}
            </LinearGradient>
          </LuxPressable>

          <LuxPressable
            onPress={handleRestore}
            className={pointerClassName}
            style={styles.restoreButton}
            glowColor="rgba(255,255,255,0.05)"
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
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0d0d0f",
  },
  mainStack: {
    flex: 1,
    alignSelf: "center",
    justifyContent: "space-evenly",
    gap: 16,
  },
  heroStack: {
    gap: 14,
  },
  heroCarouselShell: {
    alignItems: "center",
  },
  heroCardWrap: {
    overflow: "visible",
  },
  heroCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#101012",
  },
  featureStack: {
    paddingHorizontal: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    flex: 1,
    color: "#f5f5f5",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  offerStack: {
    gap: 12,
  },
  toggleRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#111113",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  toggleLabel: {
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  toggleTrack: {
    width: 52,
    height: 30,
    borderRadius: 999,
    justifyContent: "center",
    padding: 3,
    backgroundColor: "#2b2b30",
  },
  toggleTrackActive: {
    backgroundColor: "#f3dfb8",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  planCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#111113",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  planCardActive: {
    borderColor: "rgba(243,223,184,0.8)",
    backgroundColor: "#151518",
  },
  planBadge: {
    position: "absolute",
    left: 14,
    top: 10,
    zIndex: 2,
    borderRadius: 999,
    backgroundColor: "#f3dfb8",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  planBadgeText: {
    color: "#09090b",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  planSelectionGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: 22,
    borderWidth: 1.1,
    borderColor: "rgba(243,223,184,0.72)",
    backgroundColor: "rgba(243,223,184,0.03)",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  planLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "#0a0a0b",
  },
  radioOuterActive: {
    borderColor: "#f3dfb8",
    backgroundColor: "#f3dfb8",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#09090b",
  },
  planCopy: {
    flex: 1,
    gap: 4,
    paddingTop: 3,
  },
  planTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  planSubtitle: {
    color: "#9f9fa5",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  planPriceBlock: {
    alignItems: "flex-end",
    gap: 7,
    paddingTop: 3,
  },
  planPrice: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  selectedPill: {
    borderRadius: 999,
    backgroundColor: "#1e1e22",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  selectedPillText: {
    color: "#f5f5f5",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  footerStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 2,
  },
  footerStatusText: {
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.05,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  bottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  bottomDockShade: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomDockContent: {
    alignSelf: "center",
    gap: 10,
  },
  ctaOuter: {
    borderRadius: 22,
  },
  ctaOuterDisabled: {
    opacity: 0.72,
  },
  ctaGradient: {
    minHeight: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaText: {
    color: "#0b0b0c",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  restoreButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restoreText: {
    color: "#8f8f95",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
