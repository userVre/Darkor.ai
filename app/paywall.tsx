import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Carousel from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ShieldCheck, Sparkles, X } from "lucide-react-native";

import { LuxPressable } from "../components/lux-pressable";
import { useProSuccess } from "../components/pro-success-context";
import { triggerHaptic } from "../lib/haptics";
import { dismissLaunchPaywall } from "../lib/launch-paywall";
import { planCreditGrant } from "../lib/pricing";
import {
  configureRevenueCat,
  findRevenueCatPackage,
  getRevenueCatClient,
  hasActiveSubscription,
  inferPlanFromCustomerInfo,
  type BillingDuration,
  type BillingPlan,
  type RevenueCatPackage,
  type RevenueCatPurchases,
} from "../lib/revenuecat";

const GALLERY_IMAGES = [
  require("../assets/media/luxury-1.jpg"),
  require("../assets/media/luxury-2.jpg"),
  require("../assets/media/luxury-3.jpg"),
  require("../assets/media/luxury-4.jpg"),
  require("../assets/media/luxury-5.jpg"),
  require("../assets/media/luxury-6.jpg"),
  require("../assets/media/luxury-7.jpg"),
];

type PlanId = "basic" | "pro";

type PlanCopy = {
  id: PlanId;
  eyebrow: string;
  title: string;
  audience: string;
  weeklyPrice: string;
  monthlyPrice: string;
  savings: string;
  featureSummary: string;
  features: string[];
  trialAvailable: boolean;
};

const PLAN_COPY: Record<PlanId, PlanCopy> = {
  basic: {
    id: "basic",
    eyebrow: "Homeowners",
    title: "Basic",
    audience: "Reliable redesigns for everyday spaces.",
    weeklyPrice: "$0.99 / week",
    monthlyPrice: "$2.99 / month",
    savings: "Save 30%",
    featureSummary: "35 images/month, HD with watermark.",
    features: [
      "35 images each month",
      "Standard HD quality with watermark",
      "Basic room types only",
      "10 style presets",
    ],
    trialAvailable: false,
  },
  pro: {
    id: "pro",
    eyebrow: "Designers & Pros",
    title: "Pro",
    audience: "Priority-grade output for serious client work.",
    weeklyPrice: "$2.99 / week",
    monthlyPrice: "$7.99 / month",
    savings: "Save 38%",
    featureSummary: "110 images/month, 4K, no watermark.",
    features: [
      "110 images each month",
      "4K Ultra HD with no watermark",
      "All room types plus outdoor",
      "30+ premium style presets",
      "Priority generation",
      "3D walkthroughs and VR",
    ],
    trialAvailable: true,
  },
};

const SPRING = {
  damping: 18,
  stiffness: 180,
} as const;

const GallerySlide = memo(function GallerySlide({ source }: { source: number }) {
  return <Image source={source} style={styles.galleryImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />;
});

const FeatureRow = memo(function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Check color="#f5f5f5" size={13} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
});

function useSlidingHighlight(index: number) {
  const trackWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  const onLayout = useCallback((width: number) => {
    trackWidth.value = width;
    translateX.value = withSpring(width / 2 * index, SPRING);
  }, [index, trackWidth, translateX]);

  useEffect(() => {
    if (trackWidth.value > 0) {
      translateX.value = withSpring((trackWidth.value / 2) * index, SPRING);
    }
  }, [index, trackWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: trackWidth.value / 2,
    transform: [{ translateX: translateX.value }],
  }));

  return { animatedStyle, onLayout };
}

function TrialSwitch({ value, disabled, onPress }: { value: boolean; disabled?: boolean; onPress: () => void }) {
  const offset = useSharedValue(value ? 20 : 0);

  useEffect(() => {
    offset.value = withSpring(value ? 20 : 0, SPRING);
  }, [offset, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <LuxPressable onPress={onPress} disabled={disabled} style={[styles.trialSwitch, disabled ? styles.disabledControl : null]}>
      <Animated.View style={[styles.trialThumb, thumbStyle]} />
    </LuxPressable>
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

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("monthly");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const durationIndex = selectedDuration === "monthly" ? 1 : 0;
  const { animatedStyle: durationHighlightStyle, onLayout: onDurationLayout } = useSlidingHighlight(durationIndex);

  const galleryWidth = Math.min(width - 32, 420);
  const galleryHeight = Math.round(galleryWidth * 0.62);
  const selectedCopy = PLAN_COPY[selectedPlan];
  const canUseTrial = selectedPlan === "pro" && selectedDuration === "monthly";

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
        const availablePackages = offerings.current?.availablePackages ?? [];
        setPackages(availablePackages);
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

  useEffect(() => {
    if (!canUseTrial && trialEnabled) {
      setTrialEnabled(false);
    }
  }, [canUseTrial, trialEnabled]);

  const catalog = useMemo(() => ({
    basic: {
      weekly: findRevenueCatPackage(packages, "basic", "weekly"),
      monthly: findRevenueCatPackage(packages, "basic", "monthly"),
    },
    pro: {
      weekly: findRevenueCatPackage(packages, "pro", "weekly"),
      monthly: findRevenueCatPackage(packages, "pro", "monthly"),
    },
  }), [packages]);

  const selectedPackage = catalog[selectedPlan][selectedDuration];
  const ctaTitle = canUseTrial && trialEnabled ? "Start Free Trial" : "Subscribe";
  const ctaSubtitle = canUseTrial && trialEnabled
    ? "5 images free, then $21.99/mo"
    : selectedPlan === "basic"
      ? `${selectedCopy.monthlyPrice.replace("/ month", "")} billed monthly or ${selectedCopy.weeklyPrice.replace("/ week", "")} weekly`
      : `${selectedCopy.featureSummary} Cancel anytime.`;

  const handleClose = useCallback(() => {
    triggerHaptic();
    dismissLaunchPaywall();
    router.replace("/(tabs)");
  }, [router]);

  const handleSelectDuration = useCallback((duration: BillingDuration) => {
    triggerHaptic();
    setSelectedDuration(duration);
  }, []);

  const handleSelectPlan = useCallback((plan: PlanId) => {
    triggerHaptic();
    setSelectedPlan(plan);
    if (plan === "basic") {
      setTrialEnabled(false);
    }
  }, []);

  const handleToggleTrial = useCallback(() => {
    if (!canUseTrial) return;
    triggerHaptic();
    setTrialEnabled((current) => !current);
  }, [canUseTrial]);

  const persistPurchasedPlan = useCallback(async (plan: BillingPlan) => {
    await setPlan({ plan, credits: planCreditGrant(plan) });
  }, [setPlan]);

  const handleRestore = useCallback(async () => {
    triggerHaptic();
    setErrorMessage(null);

    try {
      if (!purchasesRef.current) {
        Alert.alert("Restore failed", "Subscriptions are not available on this build.");
        return;
      }

      setIsLoading(true);
      const info = await purchasesRef.current.restorePurchases();
      if (!hasActiveSubscription(info)) {
        Alert.alert("Restored", "No active subscriptions found.");
        return;
      }

      const inferredPlan = inferPlanFromCustomerInfo(info);
      if (isSignedIn) {
        await persistPurchasedPlan(inferredPlan);
      }

      if (inferredPlan === "pro") {
        showSuccess();
      } else {
        showToast("Basic subscription restored.");
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
      const message = "We could not load the selected product from RevenueCat. Check your package identifiers.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
      return;
    }

    try {
      if (!purchasesRef.current) {
        Alert.alert("Purchase Error", "Subscriptions are not available on this build.");
        return;
      }

      setIsLoading(true);
      const result = await purchasesRef.current.purchasePackage(selectedPackage);
      if (!hasActiveSubscription(result.customerInfo)) {
        throw new Error("No active entitlement was returned after checkout.");
      }

      const purchasedPlan: BillingPlan = canUseTrial && trialEnabled ? "trial" : selectedPlan;
      if (isSignedIn) {
        await persistPurchasedPlan(purchasedPlan);
      }

      if (selectedPlan === "pro") {
        showSuccess();
      } else {
        showToast("Basic unlocked successfully.");
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
  }, [canUseTrial, isSignedIn, persistPurchasedPlan, router, selectedPackage, selectedPlan, showSuccess, showToast, trialEnabled]);

  const renderGalleryItem = useCallback(({ item }: { item: number }) => <GallerySlide source={item} />, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingBottom: Math.max(insets.bottom + 30, 36),
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <LuxPressable onPress={handleRestore} style={styles.topAction}>
            <Text style={styles.topActionText}>Restore</Text>
          </LuxPressable>
          <LuxPressable onPress={handleClose} style={styles.closeButton}>
            <X color="#f5f5f5" size={18} />
          </LuxPressable>
        </View>

        <View style={styles.carouselWrap}>
          <Carousel
            loop
            autoPlay
            autoPlayInterval={2400}
            width={galleryWidth}
            height={galleryHeight}
            data={GALLERY_IMAGES}
            scrollAnimationDuration={900}
            renderItem={renderGalleryItem}
          />
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Darkor.ai Membership</Text>
          <Text style={styles.heroTitle}>Choose the right studio tier for your redesign workflow.</Text>
          <Text style={styles.heroBody}>
            Start on Basic for homeowner-friendly edits or unlock Pro for premium output, priority rendering, and immersive walkthrough tools.
          </Text>
        </View>

        <View style={styles.durationShell}>
          <View
            style={styles.durationTrack}
            onLayout={(event) => onDurationLayout(event.nativeEvent.layout.width)}
          >
            <Animated.View style={[styles.durationHighlight, durationHighlightStyle]} />
            <LuxPressable onPress={() => handleSelectDuration("weekly")} style={styles.durationOption}>
              <Text style={[styles.durationText, selectedDuration === "weekly" ? styles.durationTextActive : null]}>Weekly</Text>
            </LuxPressable>
            <LuxPressable onPress={() => handleSelectDuration("monthly")} style={styles.durationOption}>
              <View style={styles.durationLabelRow}>
                <Text style={[styles.durationText, selectedDuration === "monthly" ? styles.durationTextActive : null]}>Monthly</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save up to 36%</Text>
                </View>
              </View>
            </LuxPressable>
          </View>
        </View>

        <View style={styles.planStack}>
          {(Object.keys(PLAN_COPY) as PlanId[]).map((plan) => {
            const copy = PLAN_COPY[plan];
            const active = selectedPlan === plan;
            const currentPrice = selectedDuration === "monthly" ? copy.monthlyPrice : copy.weeklyPrice;
            const hasSelectedProduct = Boolean(catalog[plan][selectedDuration]);
            return (
              <LuxPressable
                key={plan}
                onPress={() => handleSelectPlan(plan)}
                style={[styles.planCard, active ? styles.planCardActive : null]}
              >
                <View style={styles.planHeaderRow}>
                  <View>
                    <Text style={styles.planEyebrow}>{copy.eyebrow}</Text>
                    <Text style={styles.planTitle}>{copy.title}</Text>
                    <Text style={styles.planAudience}>{copy.audience}</Text>
                  </View>
                  <View style={[styles.selectionDot, active ? styles.selectionDotActive : null]} />
                </View>

                <Animated.View key={`${plan}-${selectedDuration}`} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                  <Text style={styles.planPrice}>{currentPrice}</Text>
                  <Text style={styles.planMeta}>{selectedDuration === "monthly" ? copy.savings : "Flexible weekly access"}</Text>
                  <Text style={styles.planSummary}>{copy.featureSummary}</Text>
                </Animated.View>

                <View style={styles.featureList}>
                  {copy.features.map((feature) => (
                    <FeatureRow key={feature} label={feature} />
                  ))}
                </View>

                {plan === "pro" ? (
                  <View style={styles.trialRow}>
                    <View style={styles.trialCopyWrap}>
                      <Text style={styles.trialTitle}>Enable 3-day free trial</Text>
                      <Text style={styles.trialBody}>
                        {canUseTrial ? "Available on Pro Monthly only." : "Switch to Pro Monthly to unlock the trial."}
                      </Text>
                    </View>
                    <TrialSwitch value={trialEnabled} disabled={!canUseTrial} onPress={handleToggleTrial} />
                  </View>
                ) : null}

                {!hasSelectedProduct ? (
                  <Text style={styles.planWarning}>RevenueCat package for this option is not mapped yet.</Text>
                ) : null}
              </LuxPressable>
            );
          })}
        </View>

        {selectedPlan === "pro" ? (
          <View style={styles.trialBanner}>
            <ShieldCheck color="#67e8f9" size={16} />
            <Text style={styles.trialBannerText}>
              {canUseTrial && trialEnabled
                ? "Trial users get 5 images in HD with watermark before the paid Pro plan begins."
                : "Paid Pro removes the watermark automatically and unlocks the full 4K path."}
            </Text>
          </View>
        ) : (
          <View style={styles.basicBanner}>
            <Text style={styles.basicBannerText}>Basic stays direct-pay only: HD exports, watermark on, and homeowner-focused presets.</Text>
          </View>
        )}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <LuxPressable onPress={handlePurchase} disabled={isLoading} style={styles.ctaOuter}>
          <LinearGradient colors={["#d946ef", "#8b5cf6", "#312e81"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.ctaText}>Processing...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.ctaText}>{ctaTitle}</Text>
                <Text style={styles.ctaSubtext}>{ctaSubtitle}</Text>
              </>
            )}
          </LinearGradient>
        </LuxPressable>

        <Text style={styles.disclaimer}>
          Free trial and billing terms are managed by the App Store or Google Play. Darkor.ai applies watermark-free 4K output only to active paid Pro users.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  topAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  topActionText: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    height: 38,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  carouselWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroBlock: {
    gap: 12,
  },
  eyebrow: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  heroBody: {
    color: "#d4d4d8",
    fontSize: 15,
    lineHeight: 24,
  },
  durationShell: {
    marginTop: 24,
  },
  durationTrack: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  durationHighlight: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    backgroundColor: "rgba(217,70,239,0.18)",
  },
  durationOption: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  durationLabelRow: {
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "700",
  },
  durationTextActive: {
    color: "#f5f5f5",
  },
  saveBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(244,114,182,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveBadgeText: {
    color: "#fbcfe8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  planStack: {
    marginTop: 20,
    gap: 16,
  },
  planCard: {
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  planCardActive: {
    borderColor: "rgba(217,70,239,0.6)",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  planEyebrow: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  planTitle: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  planAudience: {
    marginTop: 4,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: "92%",
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    marginTop: 4,
  },
  selectionDotActive: {
    borderColor: "#f0abfc",
    backgroundColor: "rgba(217,70,239,0.18)",
  },
  planPrice: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
  },
  planMeta: {
    marginTop: 8,
    color: "#f5d0fe",
    fontSize: 12,
    fontWeight: "700",
  },
  planSummary: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  featureList: {
    marginTop: 18,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconWrap: {
    height: 26,
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  featureText: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 13,
    lineHeight: 18,
  },
  trialRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 16,
  },
  trialCopyWrap: {
    flex: 1,
    gap: 4,
  },
  trialTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  trialBody: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18,
  },
  trialSwitch: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(217,70,239,0.24)",
    padding: 4,
    justifyContent: "center",
  },
  trialThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  disabledControl: {
    opacity: 0.45,
  },
  planWarning: {
    marginTop: 12,
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
  },
  trialBanner: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "rgba(34,211,238,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  trialBannerText: {
    flex: 1,
    color: "#cffafe",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  basicBanner: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  basicBannerText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  errorText: {
    marginTop: 16,
    color: "#fecdd3",
    fontSize: 12,
    lineHeight: 18,
  },
  ctaOuter: {
    marginTop: 24,
    borderRadius: 28,
  },
  ctaGradient: {
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  ctaSubtext: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  disclaimer: {
    marginTop: 14,
    color: "#71717a",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
