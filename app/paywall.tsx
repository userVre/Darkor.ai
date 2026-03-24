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
const INITIAL_HERO_INDEX = 3;
const HERO_GAP = 14;
const PREMIUM_FONT_FAMILY = process.env.EXPO_OS === "ios" ? "Avenir Next" : "sans-serif";

const FEATURE_ITEMS = ["Unlock 4K", "50+ Styles", "No Watermarks", "Faster Rendering"] as const;

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
    subtitle: "Billed weekly",
  },
} as const;

const HERO_SLIDES = [
  { id: "luxury-1", image: require("../assets/media/luxury-1.jpg") },
  { id: "luxury-2", image: require("../assets/media/luxury-2.jpg") },
  { id: "luxury-3", image: require("../assets/media/luxury-3.jpg") },
  { id: "luxury-4", image: require("../assets/media/luxury-4.jpg") },
  { id: "luxury-5", image: require("../assets/media/luxury-5.jpg") },
  { id: "luxury-6", image: require("../assets/media/luxury-6.jpg") },
  { id: "luxury-7", image: require("../assets/media/luxury-7.jpg") },
] as const;

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
      glowColor="rgba(244, 226, 190, 0.14)"
      scale={0.985}
    >
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
    </LuxPressable>
  );
}

const FeatureRow = memo(function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Check color="#f4e2be" size={18} strokeWidth={2.8} />
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
    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [16, 0, 16], Extrapolation.CLAMP);
    const rotateY = interpolate(scrollX.value, inputRange, [12, 0, -12], Extrapolation.CLAMP);

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
          colors={["rgba(255,255,255,0.02)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.34)"]}
          locations={[0, 0.56, 1]}
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
    <MotiView animate={{ scale: active ? 1 : 0.986 }} transition={LUX_SPRING} style={styles.planCardMotion}>
      <LuxPressable
        onPress={onPress}
        className={pointerClassName}
        style={[styles.planCard, active ? styles.planCardActive : null]}
        glowColor={active ? "rgba(244,226,190,0.18)" : "rgba(255,255,255,0.04)"}
        scale={0.99}
      >
        {active ? (
          <LinearGradient
            colors={["rgba(244,226,190,0.14)", "rgba(244,226,190,0.04)", "rgba(255,255,255,0)"]}
            locations={[0, 0.46, 1]}
            style={styles.planCardGlow}
            pointerEvents="none"
          />
        ) : null}

        {badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}

        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planPrice}>{price}</Text>
        <Text style={styles.planSubtitle}>{subtitle}</Text>

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

  const isCompact = height < 840;
  const contentWidth = Math.min(width - 32, 430);
  const heroWidth = Math.max(104, Math.min(136, Math.floor((width - HERO_GAP * 2 - 24) / 3)));
  const heroHeight = Math.round(heroWidth * 1.46);
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
      <LinearGradient
        colors={["#090909", "#000000", "#000000"]}
        locations={[0, 0.34, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(244,226,190,0.18)", "rgba(244,226,190,0.05)", "rgba(244,226,190,0)"]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.72, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(92,111,255,0.12)", "rgba(0,0,0,0)"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.sideGlow}
        pointerEvents="none"
      />

      <View style={[styles.closeRow, { paddingTop: insets.top + 8 }]}>
        <View style={styles.closeSpacer} />
        <LuxPressable
          onPress={handleClose}
          className={pointerClassName}
          style={styles.closeButton}
          glowColor="rgba(255,255,255,0.08)"
          scale={0.96}
        >
          <X color="#f5f5f5" size={18} strokeWidth={2.2} />
        </LuxPressable>
      </View>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: isCompact ? 18 : 28,
          paddingBottom: Math.max(insets.bottom + 176, 208),
          paddingHorizontal: 16,
          alignItems: "center",
        }}
      >
        <View style={[styles.mainStack, { width: contentWidth, gap: isCompact ? 24 : 30 }]}>
          <View style={[styles.carouselShell, { gap: isCompact ? 18 : 22 }]}>
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

            <View style={styles.featureStack}>
              {FEATURE_ITEMS.map((item) => (
                <FeatureRow key={item} label={item} />
              ))}
            </View>
          </View>

          <View style={styles.selectionStack}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleSideSpacer} />
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

          <View style={styles.footerStack}>
            {freeTrialEnabled ? (
              <View style={styles.footerRow}>
                <ShieldCheck color="rgba(181,181,186,0.78)" size={15} strokeWidth={2.1} />
                <Text style={styles.footerText}>No Payment Now</Text>
              </View>
            ) : null}

            <View style={styles.footerRow}>
              <Check color="rgba(181,181,186,0.78)" size={15} strokeWidth={2.5} />
              <Text style={styles.footerText}>Cancel Anytime</Text>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </ScrollView>

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
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.88)", "#000000"]}
          locations={[0, 0.3, 1]}
          style={styles.bottomShade}
          pointerEvents="none"
        />

        <View style={[styles.bottomContent, { width: contentWidth }]}>
          <LuxPressable
            onPress={handlePurchase}
            disabled={isCtaDisabled}
            className={pointerClassName}
            style={[styles.ctaOuter, isCtaDisabled ? styles.ctaOuterDisabled : null]}
            glowColor="rgba(244,226,190,0.2)"
            scale={0.992}
          >
            <LinearGradient
              colors={isCtaDisabled ? ["#4a433a", "#322d28"] : ["#f7e8c9", "#d8ad72"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#09090b" />
                  <Text style={styles.ctaText}>Processing...</Text>
                </View>
              ) : (
                <MotiView
                  key={`cta-${ctaTitle}`}
                  from={{ opacity: 0, translateY: 5 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={LUX_SPRING}
                  style={styles.ctaContent}
                >
                  <Text style={styles.ctaText}>{ctaTitle}</Text>
                  <ArrowRight color="#09090b" size={20} strokeWidth={2.5} />
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
  topGlow: {
    position: "absolute",
    top: -40,
    left: -24,
    right: 24,
    height: 260,
    borderRadius: 240,
  },
  sideGlow: {
    position: "absolute",
    top: 180,
    right: -48,
    width: 220,
    height: 320,
    borderRadius: 280,
  },
  closeRow: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeSpacer: {
    width: 48,
    height: 48,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(16,16,18,0.82)",
  },
  mainStack: {
    alignItems: "center",
    justifyContent: "center",
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
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#121214",
  },
  featureStack: {
    width: "100%",
    alignItems: "center",
    gap: 18,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 28,
  },
  featureText: {
    color: "#f5f5f4",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.35,
    textAlign: "center",
  },
  selectionStack: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  toggleRow: {
    width: "100%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(18,18,20,0.94)",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  toggleSideSpacer: {
    width: 64,
  },
  toggleLabel: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  toggleTrack: {
    width: 64,
    height: 36,
    borderRadius: 999,
    justifyContent: "center",
    padding: 4,
    backgroundColor: "#2b2b31",
  },
  toggleTrackActive: {
    backgroundColor: "#f4e2be",
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  planCardMotion: {
    width: "100%",
  },
  planCard: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(18,18,20,0.94)",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    minHeight: 164,
  },
  planCardActive: {
    borderColor: "rgba(244,226,190,0.74)",
    backgroundColor: "#17171a",
  },
  planCardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  planBadge: {
    position: "absolute",
    top: 18,
    left: 18,
    borderRadius: 999,
    backgroundColor: "#f4e2be",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planBadgeText: {
    color: "#09090b",
    fontSize: 11,
    fontWeight: "900",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.55,
  },
  planTitle: {
    color: "#ffffff",
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.35,
    textAlign: "center",
  },
  planPrice: {
    color: "#ffffff",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -1.05,
    textAlign: "center",
  },
  planSubtitle: {
    color: "rgba(183,183,188,0.82)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.1,
    textAlign: "center",
  },
  selectedChip: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  selectedChipText: {
    color: "#f5f5f5",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.2,
  },
  footerStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    color: "rgba(181,181,186,0.72)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "400",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: PREMIUM_FONT_FAMILY,
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
    borderRadius: 999,
  },
  ctaOuterDisabled: {
    opacity: 0.72,
  },
  ctaGradient: {
    minHeight: 66,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  ctaText: {
    color: "#09090b",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.35,
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
    color: "rgba(197,197,202,0.7)",
    fontSize: 12,
    fontWeight: "500",
    fontFamily: PREMIUM_FONT_FAMILY,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
