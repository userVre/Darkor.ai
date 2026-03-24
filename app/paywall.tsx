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
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
const INITIAL_HERO_INDEX = 2;
const HERO_GAP = 12;

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
  { id: "luxury-1", image: require("../assets/media/luxury-1.jpg") },
  { id: "luxury-2", image: require("../assets/media/luxury-2.jpg") },
  { id: "luxury-3", image: require("../assets/media/luxury-3.jpg") },
  { id: "luxury-4", image: require("../assets/media/luxury-4.jpg") },
  { id: "luxury-5", image: require("../assets/media/luxury-5.jpg") },
  { id: "luxury-6", image: require("../assets/media/luxury-6.jpg") },
] as const;

function TrialSwitch({ value, onPress }: { value: boolean; onPress: () => void }) {
  const translateX = useSharedValue(value ? 24 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 24 : 0, {
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
      <Check color="#f5f5f5" size={15} strokeWidth={3} />
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
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [18, 0, 18], Extrapolation.CLAMP);
    const rotateY = interpolate(scrollX.value, inputRange, [10, 0, -10], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { scale },
        { translateY },
        { rotateY: `${rotateY}deg` },
      ],
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
          colors={["rgba(0,0,0,0.01)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.26)"]}
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
    <MotiView animate={{ scale: active ? 1 : 0.992 }} transition={LUX_SPRING}>
      <LuxPressable
        onPress={onPress}
        className={pointerClassName}
        style={[styles.planCard, active ? styles.planCardActive : null]}
        glowColor={active ? "rgba(243, 223, 184, 0.16)" : "rgba(255,255,255,0.04)"}
        scale={0.987}
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

        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planSubtitle}>{subtitle}</Text>
        <Text style={styles.planPrice}>{price}</Text>

        {active ? (
          <View style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>Selected</Text>
          </View>
        ) : null}
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
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const carouselRef = useRef<FlatList<(typeof HERO_SLIDES)[number]> | null>(null);

  const scrollX = useSharedValue(0);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCompact = height < 860;
  const isVeryCompact = height < 760;
  const contentWidth = Math.min(width - 40, 430);
  const heroWidth = Math.min(width - 96, 332);
  const heroHeight = Math.max(182, Math.min(isVeryCompact ? 196 : 228, Math.round(heroWidth * 0.72)));
  const heroSnapInterval = heroWidth + HERO_GAP;
  const heroInset = Math.max((width - heroWidth) / 2, 0);

  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );
  const isCtaDisabled = isLoading || !selectedPackage;
  const ctaTitle = freeTrialEnabled ? "Try for Free" : "Continue";

  const onHeroScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    const initialOffset = INITIAL_HERO_INDEX * heroSnapInterval;
    scrollX.value = initialOffset;

    requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
    });
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
    if (duration === "yearly") {
      setFreeTrialEnabled(false);
    }
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

  const renderHeroItem = useCallback(
    ({
      item,
      index,
    }: {
      item: (typeof HERO_SLIDES)[number];
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
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom + 144, 152),
          },
        ]}
      >
        <View style={styles.closeRow}>
          <View style={styles.closeSpacer} />
          <LuxPressable
            onPress={handleClose}
            className={pointerClassName}
            style={styles.closeButton}
            glowColor="rgba(255,255,255,0.08)"
          >
            <X color="#f5f5f5" size={19} strokeWidth={2.4} />
          </LuxPressable>
        </View>

        <View style={[styles.mainStack, { width: contentWidth, gap: isCompact ? 12 : 16 }]}>
          <View style={[styles.carouselShell, { gap: isCompact ? 12 : 16 }]}>
            <Animated.FlatList
              ref={carouselRef as any}
              data={HERO_SLIDES}
              keyExtractor={(item) => item.id}
              renderItem={renderHeroItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={heroSnapInterval}
              snapToAlignment="start"
              decelerationRate="fast"
              bounces={false}
              scrollEventThrottle={16}
              onScroll={onHeroScroll}
              initialNumToRender={HERO_SLIDES.length}
              maxToRenderPerBatch={HERO_SLIDES.length}
              windowSize={5}
              removeClippedSubviews={false}
              contentContainerStyle={{ paddingHorizontal: heroInset }}
              ItemSeparatorComponent={() => <View style={{ width: HERO_GAP }} />}
              getItemLayout={(_, index) => ({
                index,
                length: heroSnapInterval,
                offset: heroSnapInterval * index,
              })}
              style={styles.carouselList}
              contentInsetAdjustmentBehavior="never"
            />

            <View style={[styles.featureStack, { gap: isVeryCompact ? 12 : 14 }]}>
              {FEATURE_ITEMS.map((item) => (
                <FeatureRow key={item} label={item} />
              ))}
            </View>
          </View>

          <View style={[styles.selectionStack, { gap: isCompact ? 10 : 12 }]}>
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
          </View>

          <View style={[styles.footerStack, { gap: freeTrialEnabled ? 8 : 0 }]}>
            {freeTrialEnabled ? (
              <View style={styles.footerRow}>
                <ShieldCheck color="#8b8b90" size={15} strokeWidth={2.2} />
                <Text style={styles.footerText}>No Payment Now</Text>
              </View>
            ) : null}

            <View style={styles.footerRow}>
              <Check color="#8b8b90" size={15} strokeWidth={2.8} />
              <Text style={styles.footerText}>Cancel Anytime</Text>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
          locations={[0, 0.34, 1]}
          style={styles.bottomShade}
          pointerEvents="none"
        />

        <View style={[styles.bottomContent, { width: contentWidth }]}>
          <LuxPressable
            onPress={handlePurchase}
            disabled={isCtaDisabled}
            className={pointerClassName}
            style={[styles.ctaOuter, isCtaDisabled ? styles.ctaOuterDisabled : null]}
            glowColor="rgba(243,223,184,0.18)"
          >
            <LinearGradient
              colors={isCtaDisabled ? ["#4a433a", "#322d28"] : ["#f4e2be", "#d0a66f"]}
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
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  closeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeSpacer: {
    width: 50,
    height: 50,
  },
  closeButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0e0e11",
  },
  mainStack: {
    flex: 1,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  carouselShell: {
    width: "100%",
    alignItems: "center",
  },
  carouselList: {
    marginHorizontal: -16,
    overflow: "visible",
  },
  heroSlideWrap: {
    overflow: "visible",
  },
  heroSlideCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#121214",
  },
  featureStack: {
    width: "100%",
    alignItems: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 28,
  },
  featureText: {
    color: "#f5f5f5",
    fontSize: 15,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  selectionStack: {
    width: "100%",
    alignItems: "center",
  },
  toggleRow: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#121214",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  toggleLabel: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  toggleTrack: {
    width: 54,
    height: 30,
    borderRadius: 999,
    justifyContent: "center",
    padding: 3,
    backgroundColor: "#2b2b31",
  },
  toggleTrackActive: {
    backgroundColor: "#f4e2be",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  planCard: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#121214",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  planCardActive: {
    borderColor: "rgba(244,226,190,0.75)",
    backgroundColor: "#17171a",
  },
  planSelectionGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: 24,
    borderWidth: 1.1,
    borderColor: "rgba(244,226,190,0.7)",
    backgroundColor: "rgba(244,226,190,0.03)",
  },
  planBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: "#f4e2be",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planBadgeText: {
    color: "#09090b",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  planTitle: {
    color: "#ffffff",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  planSubtitle: {
    color: "#8f8f95",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  planPrice: {
    color: "#ffffff",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  selectedChip: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "#1f1f24",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectedChipText: {
    color: "#f4f4f5",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footerStack: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  bottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  bottomShade: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomContent: {
    alignSelf: "center",
    gap: 10,
  },
  ctaOuter: {
    borderRadius: 24,
  },
  ctaOuterDisabled: {
    opacity: 0.72,
  },
  ctaGradient: {
    minHeight: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    color: "#0b0b0c",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
});
