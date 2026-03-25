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
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, BadgeCheck, ShieldCheck, X } from "lucide-react-native";

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
const HERO_GAP = 12;
const AUTO_SCROLL_MS = 2600;

const FEATURE_ITEMS = [
  "Unlock 4K Ultra-HD renders",
  "20+ premium styles",
  "No watermarks",
  "Faster Rendering",
] as const;

const PLAN_COPY = {
  yearly: {
    badge: "BEST VALUE",
    title: "Yearly Access",
    price: "$0.90",
    priceSuffix: "/ week",
    subtitle: "Billed at $47.52/year",
  },
  weekly: {
    badge: "FREE TRIAL",
    title: "Weekly Access",
    price: "$11.90",
    priceSuffix: "/ week",
    subtitle: "Auto-selected for trial",
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

const LOOPED_HERO_SLIDES = [...HERO_SLIDES, ...HERO_SLIDES, ...HERO_SLIDES].map((slide, index) => ({
  ...slide,
  key: `${slide.id}-${index}`,
}));

const LOOP_OFFSET = HERO_SLIDES.length;

function TrialSwitch({ value, onPress }: { value: boolean; onPress: () => void }) {
  const translateX = useSharedValue(value ? 26 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 26 : 0, {
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
      glowColor="rgba(250,204,21,0.12)"
      scale={0.985}
    >
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
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
    const scale = interpolate(scrollX.value, inputRange, [0.8, 1.1, 0.8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [10, -4, 10], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ scale }, { translateY }],
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
  onPress,
}: {
  active: boolean;
  title: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  badge: string | null;
  onPress: () => void;
}) {
  return (
    <MotiView animate={{ scale: active ? 1 : 0.985 }} transition={LUX_SPRING} style={styles.planCardMotion}>
      <LuxPressable
        onPress={onPress}
        className={pointerClassName}
        style={[styles.planCard, active ? styles.planCardActive : null]}
        glowColor={active ? "rgba(250,204,21,0.18)" : "rgba(255,255,255,0.04)"}
        scale={0.99}
      >
        {active ? (
          <LinearGradient
            colors={["rgba(250,204,21,0.16)", "rgba(250,204,21,0.05)", "rgba(255,255,255,0)"]}
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

        <Text style={styles.planTitle}>{title}</Text>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{price}</Text>
          <Text style={styles.planPriceSuffix}>{priceSuffix}</Text>
        </View>
        <Text style={styles.planSubtitle}>{subtitle}</Text>
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
  const carouselRef = useRef<FlatList<(typeof LOOPED_HERO_SLIDES)[number]> | null>(null);
  const currentIndexRef = useRef<number>(LOOP_OFFSET);

  const scrollX = useSharedValue(0);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);
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
  const ctaTitle = freeTrialEnabled && selectedDuration === "weekly" ? "Start Free Trial" : "Unlock Pro";
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
        <LuxPressable
          onPress={handleClose}
          className={pointerClassName}
          style={styles.closeButton}
          glowColor="rgba(255,255,255,0.08)"
          scale={0.96}
        >
          <X color="#f4f4f5" size={18} strokeWidth={2.2} />
        </LuxPressable>
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
              <Text style={styles.eyebrow}>HOME AI PRO</Text>
              <Text style={[styles.title, compactLevel === 2 ? styles.titleCompact : null]}>Everything premium, on one screen.</Text>
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
                <Text style={styles.toggleLabel}>Turn on to auto-select Weekly</Text>
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
                onPress={() => handleSelectDuration("weekly")}
              />
              <PlanCard
                active={selectedDuration === "yearly"}
                title={PLAN_COPY.yearly.title}
                price={PLAN_COPY.yearly.price}
                priceSuffix={PLAN_COPY.yearly.priceSuffix}
                subtitle={PLAN_COPY.yearly.subtitle}
                badge={PLAN_COPY.yearly.badge}
                onPress={() => handleSelectDuration("yearly")}
              />
            </View>

            <View style={styles.footerStack}>
              {freeTrialEnabled ? (
                <View style={styles.footerRow}>
                  <ShieldCheck color="#a1a1aa" size={14} strokeWidth={2.15} />
                  <Text style={styles.footerText}>No Payment Now</Text>
                </View>
              ) : null}
              <View style={styles.footerRow}>
                <BadgeCheck color="#a1a1aa" size={14} strokeWidth={2.15} />
                <Text style={styles.footerText}>Cancel Anytime</Text>
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
            glowColor="rgba(250,204,21,0.18)"
            scale={0.992}
          >
            <LinearGradient
              colors={isCtaDisabled ? ["#4b4b4f", "#323236"] : ["#fff2d7", "#f3c98a", "#d99a4e"]}
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
                  from={{ opacity: 0, translateY: 4 }}
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
    backgroundColor: "#09090b",
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(24,24,27,0.94)",
  },
  layout: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainStack: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroSection: {
    width: "100%",
    alignItems: "center",
  },
  headerCopy: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  eyebrow: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#fafafa",
    fontSize: 27,
    lineHeight: 30,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: -0.7,
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 27,
  },
  carouselShell: {
    width: "100%",
    alignItems: "center",
    overflow: "visible",
  },
  carouselList: {
    width: "100%",
    overflow: "visible",
  },
  heroSlideWrap: {
    overflow: "visible",
  },
  heroSlideCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#18181b",
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
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleEyebrow: {
    color: "#fafafa",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    fontFamily: PREMIUM_FONT_FAMILY,
    letterSpacing: 0.1,
  },
  toggleLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    fontFamily: PREMIUM_FONT_FAMILY,
  },
  toggleTrack: {
    width: 58,
    height: 32,
    borderRadius: 999,
    justifyContent: "center",
    padding: 3,
    backgroundColor: "#3f3f46",
  },
  toggleTrackActive: {
    backgroundColor: "#f4e4c4",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  planRow: {
    flexDirection: "row",
    gap: 10,
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
  },
  planCardActive: {
    borderColor: "rgba(253,224,71,0.48)",
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
    borderColor: "rgba(250,204,21,0.28)",
    backgroundColor: "rgba(250,204,21,0.14)",
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
    color: "#fef3c7",
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
  planPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
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
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    marginBottom: 3,
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
    lineHeight: 16,
    fontWeight: "700",
    fontFamily: PREMIUM_FONT_FAMILY,
    textAlign: "center",
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
  },
  ctaOuter: {
    width: "100%",
    borderRadius: 999,
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
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    color: "#09090b",
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
