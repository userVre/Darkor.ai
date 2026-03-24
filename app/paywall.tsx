import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
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
const PAYWALL_VIDEO = require("../assets/videos/paywall-dream-home.mp4");

const FEATURE_ITEMS = [
  "Unlock 4K Ultra-HD renders",
  "20+ premium styles",
  "No watermarks",
  "Faster rendering",
];

const PLAN_COPY = {
  yearly: {
    badge: "BEST VALUE",
    title: "Yearly Access",
    price: "$0.90 / week",
    subtitle: "Just $47.52 per year",
  },
  weekly: {
    badge: null,
    title: "Weekly Access",
    price: "$11.90 / week",
    subtitle: "Includes 3-day free trial",
  },
} as const;

const SPRING = {
  damping: 18,
  stiffness: 190,
} as const;

function TrialSwitch({ value, onPress }: { value: boolean; onPress: () => void }) {
  const translateX = useSharedValue(value ? 24 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 24 : 0, SPRING);
  }, [translateX, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <LuxPressable
      onPress={onPress}
      className={pointerClassName}
      style={[
        styles.toggleTrack,
        value ? styles.toggleTrackActive : null,
      ]}
    >
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
    </LuxPressable>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Check color="#f3ead9" size={13} strokeWidth={2.5} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function PlanOptionCard({
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
      animate={{
        scale: active ? 1 : 0.992,
        opacity: 1,
      }}
      transition={SPRING}
    >
      <LuxPressable
        onPress={onPress}
        className={pointerClassName}
        style={[
          styles.planCard,
          active ? styles.planCardActive : null,
        ]}
      >
        {badge ? (
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>{badge}</Text>
          </View>
        ) : null}

        {active ? (
          <MotiView
            pointerEvents="none"
            from={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SPRING}
            style={styles.selectedGlow}
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
              <MotiView
                from={{ opacity: 0, translateY: -4 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={SPRING}
                style={styles.selectedPill}
              >
                <Text style={styles.selectedPillText}>Selected</Text>
              </MotiView>
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
  const { width } = useWindowDimensions();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const { showSuccess, showToast } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const player = useVideoPlayer(PAYWALL_VIDEO, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.volume = 0;
    instance.timeUpdateEventInterval = 0;
    instance.play();
  });

  const contentWidth = useMemo(() => Math.min(width - 28, 430), [width]);
  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );
  const isCtaDisabled = isLoading || !selectedPackage;
  const footerLine = freeTrialEnabled
    ? "No Payment Now. Cancel anytime before the trial ends."
    : "Cancel Anytime";
  const ctaTitle = freeTrialEnabled ? "Try for Free" : "Continue";

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
    async (plan: BillingPlan, subscriptionType: BillingDuration, purchasedAt?: number | null, subscriptionEnd?: number | null) => {
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
  }, [freeTrialEnabled, isSignedIn, persistPurchasedPlan, router, selectedDuration, selectedPackage, showSuccess, showToast]);

  return (
    <View style={styles.screen}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.26)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.72)"]}
        locations={[0, 0.38, 1]}
        style={styles.videoShade}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 14,
          paddingBottom: Math.max(insets.bottom + 26, 34),
          paddingHorizontal: 14,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chromeRow}>
          <View style={styles.chromeSpacer} />
          <LuxPressable onPress={handleClose} style={styles.closeButton} className={pointerClassName}>
            <X color="#f4ede0" size={18} strokeWidth={2.2} />
          </LuxPressable>
        </View>

        <View style={[styles.contentShell, { width: contentWidth, alignSelf: "center" }]}>
          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>Unlock Your Dream Home with AI</Text>
          </View>

          <View style={styles.featureStack}>
            {FEATURE_ITEMS.map((item) => (
              <FeatureItem key={item} label={item} />
            ))}
          </View>

          <View style={styles.toggleCard}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Enable Free Trial</Text>
              <Text style={styles.toggleBody}>Weekly only. Switches selection automatically.</Text>
            </View>
            <TrialSwitch value={freeTrialEnabled} onPress={handleToggleTrial} />
          </View>

          <View style={styles.planStack}>
            <PlanOptionCard
              active={selectedDuration === "yearly"}
              title={PLAN_COPY.yearly.title}
              price={PLAN_COPY.yearly.price}
              subtitle={PLAN_COPY.yearly.subtitle}
              badge={PLAN_COPY.yearly.badge}
              onPress={() => handleSelectDuration("yearly")}
            />

            <PlanOptionCard
              active={selectedDuration === "weekly"}
              title={PLAN_COPY.weekly.title}
              price={PLAN_COPY.weekly.price}
              subtitle={PLAN_COPY.weekly.subtitle}
              badge={PLAN_COPY.weekly.badge}
              onPress={() => handleSelectDuration("weekly")}
            />
          </View>

          <MotiView
            key={`footer-${freeTrialEnabled ? "trial" : "standard"}`}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={SPRING}
            style={styles.footerInfo}
          >
            {freeTrialEnabled ? (
              <ShieldCheck color="#f3ead9" size={16} strokeWidth={2.1} />
            ) : (
              <Check color="#f3ead9" size={16} strokeWidth={2.8} />
            )}
            <Text style={styles.footerInfoText}>{footerLine}</Text>
          </MotiView>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <LuxPressable
            onPress={handlePurchase}
            disabled={isCtaDisabled}
            style={[
              styles.ctaOuter,
              isCtaDisabled ? styles.ctaOuterDisabled : null,
            ]}
            className={pointerClassName}
          >
            <LinearGradient
              colors={isCtaDisabled ? ["#53483c", "#3e352b"] : ["#f2d8aa", "#d3b17f"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#14100c" />
                  <Text style={styles.ctaText}>Processing...</Text>
                </View>
              ) : (
                <MotiView
                  key={`cta-${ctaTitle}`}
                  from={{ opacity: 0, translateY: 4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={SPRING}
                  style={styles.ctaContent}
                >
                  <Text style={styles.ctaText}>{ctaTitle}</Text>
                  <ArrowRight color="#14100c" size={18} strokeWidth={2.4} />
                </MotiView>
              )}
            </LinearGradient>
          </LuxPressable>

          <LuxPressable onPress={handleRestore} className={pointerClassName} style={styles.restoreButton}>
            <Text style={styles.restoreText}>Restore purchase</Text>
          </LuxPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050402",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoShade: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flex: 1,
  },
  chromeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chromeSpacer: {
    width: 44,
    height: 44,
  },
  closeButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,237,224,0.18)",
    backgroundColor: "rgba(14,12,10,0.38)",
  },
  contentShell: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 16,
    paddingTop: 42,
  },
  heroBlock: {
    gap: 10,
  },
  heroTitle: {
    color: "#f4ede0",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "500",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  featureStack: {
    gap: 10,
    paddingHorizontal: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconWrap: {
    height: 22,
    width: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(194,160,118,0.26)",
    borderWidth: 1,
    borderColor: "rgba(243,234,217,0.18)",
  },
  featureText: {
    flex: 1,
    color: "#f2eadc",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  toggleCard: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(244,237,224,0.14)",
    backgroundColor: "rgba(248,239,226,0.18)",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: "#f6efe2",
    fontSize: 16,
    fontWeight: "700",
  },
  toggleBody: {
    color: "rgba(246,239,226,0.78)",
    fontSize: 12,
    lineHeight: 18,
  },
  toggleTrack: {
    width: 54,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.28)",
    padding: 3,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: "rgba(231,198,149,0.92)",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  planStack: {
    gap: 12,
  },
  planCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(244,237,224,0.16)",
    backgroundColor: "rgba(249,240,228,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  planCardActive: {
    borderColor: "rgba(246,228,194,0.82)",
    backgroundColor: "rgba(252,244,233,0.22)",
  },
  selectedGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: 26,
    borderWidth: 1.25,
    borderColor: "rgba(255,241,214,0.95)",
    backgroundColor: "rgba(255,244,225,0.06)",
  },
  bestValueBadge: {
    position: "absolute",
    left: 14,
    top: 12,
    zIndex: 2,
    borderRadius: 999,
    backgroundColor: "#f0472e",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestValueText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
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
  planCopy: {
    flex: 1,
    gap: 3,
    paddingTop: 4,
  },
  radioOuter: {
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(246,239,226,0.48)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  radioOuterActive: {
    borderColor: "#1b1712",
    backgroundColor: "rgba(255,250,241,0.95)",
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 999,
    backgroundColor: "#15110d",
  },
  planTitle: {
    color: "#fff7eb",
    fontSize: 17,
    fontWeight: "700",
  },
  planSubtitle: {
    color: "rgba(255,247,235,0.72)",
    fontSize: 12,
    lineHeight: 17,
  },
  planPriceBlock: {
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 4,
  },
  planPrice: {
    color: "#fff7eb",
    fontSize: 18,
    fontWeight: "700",
  },
  selectedPill: {
    borderRadius: 999,
    backgroundColor: "rgba(16,14,12,0.78)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedPillText: {
    color: "#f6efe2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "rgba(8,7,6,0.34)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footerInfoText: {
    flex: 1,
    color: "#f6efe2",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
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
    paddingHorizontal: 20,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaText: {
    color: "#14100c",
    fontSize: 17,
    fontWeight: "800",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  restoreButton: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  restoreText: {
    color: "rgba(246,239,226,0.78)",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
