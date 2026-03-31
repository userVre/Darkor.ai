import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated as LegacyAnimated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ShieldCheck, X } from "lucide-react-native";

import { LuxPressable } from "../components/lux-pressable";
import { useProSuccess } from "../components/pro-success-context";
import { useViewerSession } from "../components/viewer-session-context";
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
const PANEL_BG = "#151515";
const PANEL_BG_SELECTED = "#171717";
const PANEL_BORDER = "#2A2A2A";
const BRAND_RED = "#E53935";
const TOGGLE_OFF = "#5A5A5A";
const TOGGLE_THUMB = "#FFFFFF";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.72)";
const TEXT_SUBTLE = "rgba(255,255,255,0.54)";
const TRUST_TEXT = "rgba(255,255,255,0.45)";
const COUNTDOWN_MS = 5000;
const HERO_GAP = 12;
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

function formatPriceLabel(pkg?: RevenueCatPackage | null) {
  const product = pkg?.product as
    | {
        currencyCode?: string | null;
        price?: number | null;
        priceString?: string | null;
      }
    | undefined;

  if (typeof product?.priceString === "string" && product.priceString.trim().length > 0) {
    return product.priceString.trim();
  }

  if (typeof product?.price === "number" && Number.isFinite(product.price)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: product.currencyCode ?? "USD",
      }).format(product.price);
    } catch {
      return `$${product.price.toFixed(2)}`;
    }
  }

  return null;
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureCheckbox}>
        <Check color={TEXT_PRIMARY} size={11} strokeWidth={3.2} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

function TrialToggle({
  value,
  onPress,
}: {
  value: boolean;
  onPress: () => void;
}) {
  return (
    <LuxPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      glowColor="rgba(255,255,255,0.05)"
      onPress={onPress}
      scale={0.995}
      style={styles.trialBar}
    >
      <Text style={styles.trialLabel}>{value ? "Free trial enabled" : "Enable free trial"}</Text>

      <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : styles.toggleThumbOff]} />
      </View>
    </LuxPressable>
  );
}

function PlanBar({
  badge,
  detail,
  onPress,
  price,
  selected,
  subtitle,
  title,
}: {
  badge?: string;
  detail?: string;
  onPress: () => void;
  price: string;
  selected: boolean;
  subtitle?: string;
  title: string;
}) {
  return (
    <LuxPressable
      accessibilityRole="button"
      glowColor={selected ? "rgba(229,57,53,0.2)" : "rgba(255,255,255,0.04)"}
      onPress={onPress}
      scale={0.995}
      style={[styles.planBar, selected ? styles.planBarSelected : styles.planBarIdle]}
    >
      {badge ? (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}

      <View style={styles.planTopRow}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.planPrice}>
          {price}
        </Text>
      </View>

      {subtitle ? (
        <View style={styles.planBottomRow}>
          <Text style={styles.planSubtitle}>{subtitle}</Text>
          {detail ? <Text style={styles.planDetail}>{detail}</Text> : null}
        </View>
      ) : null}
    </LuxPressable>
  );
}

function CountdownClose({
  canClose,
  progress,
  secondsLeft,
  onPress,
}: {
  canClose: boolean;
  progress: number;
  secondsLeft: number;
  onPress: () => void;
}) {
  const size = 36;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  if (canClose) {
    return (
      <Pressable accessibilityLabel="Close paywall" accessibilityRole="button" onPress={onPress} style={styles.closeButton}>
        <View style={styles.closeButtonVisual}>
          <X color={TEXT_PRIMARY} size={18} strokeWidth={2.4} />
        </View>
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={`${secondsLeft} seconds until close`} style={styles.countdownWrap}>
      <Svg height={size} style={styles.countdownSvg} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={BRAND_RED}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.countdownText}>{secondsLeft}</Text>
    </View>
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
  const setPlan = useMutation("users:setViewerPlanFromRevenueCat" as any);
  const { showSuccess } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const heroListRef = useRef<FlatList<number> | null>(null);
  const scrollX = useRef(new LegacyAnimated.Value(0)).current;
  const entranceProgress = useSharedValue(0);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownRemainingMs, setCountdownRemainingMs] = useState(COUNTDOWN_MS);

  const yearlyPackage = useMemo(() => findRevenueCatPackage(packages, "yearly"), [packages]);
  const weeklyPackage = useMemo(() => findRevenueCatPackage(packages, "weekly"), [packages]);
  const selectedPackage = useMemo(() => {
    if (freeTrialEnabled) {
      return weeklyPackage ?? yearlyPackage ?? packages[0] ?? null;
    }

    const picked = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
    return picked ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
  }, [freeTrialEnabled, packages, selectedDuration, weeklyPackage, yearlyPackage]);

  const ctaDisabled = isLoading || !selectedPackage;
  const canClose = countdownRemainingMs <= 0;
  const countdownProgress = Math.min(1, Math.max(0, 1 - countdownRemainingMs / COUNTDOWN_MS));
  const countdownSecondsLeft = Math.max(1, Math.ceil(countdownRemainingMs / 1000));
  const heroCardWidth = Math.min(width - 116, 248);
  const heroCardHeight = Math.round(heroCardWidth * 1.22);
  const heroSnapInterval = heroCardWidth + HERO_GAP;
  const heroInset = Math.max((width - heroCardWidth) / 2, 0);
  const sheetTopInset = Math.max(insets.top + 12, 24);
  const sheetHeight = Math.max(height - sheetTopInset, 0);

  useEffect(() => {
    entranceProgress.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [entranceProgress]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setCountdownRemainingMs(Math.max(0, COUNTDOWN_MS - elapsed));
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initialOffset = heroSnapInterval;
    const id = setTimeout(() => {
      heroListRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
    }, 0);

    return () => clearTimeout(id);
  }, [heroSnapInterval]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = (scrollX as any).__getValue?.() ?? heroSnapInterval;
      const currentIndex = Math.round(current / heroSnapInterval);
      const nextIndex = (currentIndex + 1) % HERO_IMAGES.length;
      heroListRef.current?.scrollToOffset({
        offset: nextIndex * heroSnapInterval,
        animated: true,
      });
    }, 2800);

    return () => clearInterval(interval);
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

  const exitPaywall = useCallback(() => {
    dismissLaunchPaywall();

    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(redirectTo as any);
      return;
    }

    if (source === "generate" && router.canGoBack()) {
      router.back();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [redirectTo, router, source]);

  const handleClose = useCallback(() => {
    if (!canClose) {
      return;
    }

    triggerHaptic();
    exitPaywall();
  }, [canClose, exitPaywall]);

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
      showSuccess();
      exitPaywall();
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [exitPaywall, persistPurchasedPlan, showSuccess]);

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
      showSuccess();
      exitPaywall();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase cancelled.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
    } finally {
      setIsLoading(false);
    }
  }, [exitPaywall, persistPurchasedPlan, selectedPackage, showSuccess]);

  const renderHeroItem = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const center = index * heroSnapInterval;
      const inputRange = [center - heroSnapInterval, center, center + heroSnapInterval];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.86, 1, 0.86],
        extrapolate: "clamp",
      });
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.58, 1, 0.58],
        extrapolate: "clamp",
      });
      const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [14, 0, 14],
        extrapolate: "clamp",
      });

      return (
        <LegacyAnimated.View
          style={[
            styles.heroItemWrap,
            {
              opacity,
              transform: [{ scale }, { translateY }],
              width: heroCardWidth,
            },
          ]}
        >
          <Image contentFit="cover" source={item} style={[styles.heroImage, { height: heroCardHeight }]} transition={220} />
        </LegacyAnimated.View>
      );
    },
    [heroCardHeight, heroCardWidth, heroSnapInterval, scrollX],
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: (1 - entranceProgress.value) * Math.max(sheetHeight, 1),
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

      <Animated.View style={[styles.sheet, { marginTop: sheetTopInset, minHeight: sheetHeight }, sheetAnimatedStyle]}>
        <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => void handleRestore()} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore</Text>
        </Pressable>

        <View style={styles.closeButtonSlot}>
          <CountdownClose
            canClose={canClose}
            onPress={handleClose}
            progress={countdownProgress}
            secondsLeft={countdownSecondsLeft}
          />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 24, 24),
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.heroShell}>
          <LegacyAnimated.FlatList
            ref={heroListRef as any}
            contentContainerStyle={{ paddingHorizontal: heroInset }}
            data={Array.from(HERO_IMAGES)}
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({
              index,
              length: heroSnapInterval,
              offset: heroSnapInterval * index,
            })}
            horizontal
            initialNumToRender={HERO_IMAGES.length}
            keyExtractor={(_, index) => `hero-${index}`}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / heroSnapInterval);
              heroListRef.current?.scrollToOffset({
                offset: nextIndex * heroSnapInterval,
                animated: true,
              });
            }}
            onScroll={LegacyAnimated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            pagingEnabled={false}
            removeClippedSubviews={false}
            renderItem={renderHeroItem}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            snapToInterval={heroSnapInterval}
            style={styles.heroList}
            ItemSeparatorComponent={() => <View style={{ width: HERO_GAP }} />}
          />
        </View>

        <View style={styles.featuresList}>
          {FEATURE_ITEMS.map((feature) => (
            <FeatureRow key={feature} label={feature} />
          ))}
        </View>

        <TrialToggle
          onPress={() => {
            triggerHaptic();
            setFreeTrialEnabled((current) => !current);
          }}
          value={freeTrialEnabled}
        />

        <View style={styles.pricingStack}>
          <PlanBar
            badge="BEST OFFER"
            onPress={() => {
              triggerHaptic();
              setSelectedDuration("yearly");
            }}
            price="MAD9.33 per week"
            selected={selectedDuration === "yearly"}
            subtitle="Just MAD 484.99 per year"
            title="YEARLY ACCESS"
          />

          <PlanBar
            onPress={() => {
              triggerHaptic();
              setSelectedDuration("weekly");
            }}
            price={freeTrialEnabled ? "then MAD 119.99 per week" : "MAD 119.99 per week"}
            selected={freeTrialEnabled}
            title={freeTrialEnabled ? "3-DAYS FREE TRIAL" : "WEEKLY ACCESS"}
          />
        </View>

        <View style={freeTrialEnabled ? styles.noticeRowTrial : styles.noticeRowRegular}>
          {freeTrialEnabled ? <ShieldCheck color={TEXT_SUBTLE} size={14} strokeWidth={2.2} /> : null}
          <Text style={styles.noticeText}>{freeTrialEnabled ? "No Payment Now" : "Cancel Anytime"}</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <LuxPressable
          accessibilityRole="button"
          disabled={ctaDisabled}
          glowColor="rgba(229,57,53,0.24)"
          onPress={handlePurchase}
          scale={0.992}
          style={styles.ctaButton}
        >
          <View style={styles.ctaFill}>
            {isLoading ? (
              <View style={styles.ctaLoadingRow}>
                <ActivityIndicator color={TEXT_PRIMARY} />
                <Text style={styles.ctaText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.ctaText}>{freeTrialEnabled ? "Try for Free →" : "Continue →"}</Text>
            )}
          </View>
        </LuxPressable>

        <Text style={styles.trustRow}>✓ Cancel anytime · ✓ Secure payment · ✓ Instant access</Text>
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
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  sheet: {
    overflow: "hidden",
    backgroundColor: SCREEN_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  restoreButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    paddingVertical: 4,
    paddingRight: 8,
  },
  restoreText: {
    color: TEXT_MUTED,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  closeButtonSlot: {
    position: "absolute",
    top: 28,
    right: 24,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonVisual: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  countdownWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownSvg: {
    position: "absolute",
  },
  countdownText: {
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 13,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  scrollContent: {
    paddingTop: 96,
  },
  heroShell: {
    marginTop: 8,
  },
  heroList: {
    overflow: "visible",
  },
  heroItemWrap: {
    overflow: "visible",
  },
  heroImage: {
    width: "100%",
    borderRadius: 28,
    backgroundColor: PANEL_BG,
  },
  featuresList: {
    marginTop: 32,
  },
  featureRow: {
    marginHorizontal: 82,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  featureCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.4,
    borderColor: TEXT_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  trialBar: {
    marginHorizontal: 16,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trialLabel: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    padding: 3,
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
    backgroundColor: TOGGLE_THUMB,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  toggleThumbOff: {
    alignSelf: "flex-start",
  },
  pricingStack: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  planBar: {
    minHeight: 84,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
  },
  planBarIdle: {
    borderColor: PANEL_BORDER,
  },
  planBarSelected: {
    backgroundColor: PANEL_BG_SELECTED,
    borderColor: BRAND_RED,
  },
  planBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    backgroundColor: BRAND_RED,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeText: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  planPrice: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "right",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  planSubtitle: {
    color: TEXT_SUBTLE,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  planDetail: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "right",
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  noticeRowTrial: {
    marginLeft: 136,
    marginRight: 132,
    marginBottom: 42,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noticeRowRegular: {
    marginLeft: 136,
    marginRight: 132,
    marginBottom: 42,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeText: {
    color: TEXT_SUBTLE,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  errorText: {
    color: "#FFB4B2",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  ctaButton: {
    marginHorizontal: 16,
    height: 58,
    borderRadius: 18,
    overflow: "hidden",
  },
  ctaFill: {
    flex: 1,
    backgroundColor: BRAND_RED,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  trustRow: {
    marginTop: 12,
    textAlign: "center",
    color: TRUST_TEXT,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
});
