import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { fonts } from "../styles/typography";

const AUTO_ROTATE_MS = 3000;
const SIDE_IMAGE_WIDTH = 130;
const SIDE_IMAGE_HEIGHT = 160;
const CENTER_IMAGE_SIZE = 188;
const IMAGE_GAP = 12;
const HERO_TRACK_WIDTH = SIDE_IMAGE_WIDTH * 2 + CENTER_IMAGE_SIZE + IMAGE_GAP * 2;

const SCREEN_BG = "#0D0D0D";
const SURFACE = "#1C1C1C";
const SURFACE_ACCENT = "#25030D";
const BORDER = "#2A2A2A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0A0A0";
const TEXT_RESTORE = "#B3B3B3";
const TOGGLE_OFF = "#3A3A3A";
const CTA_RED = "#E53935";
const CLOSE_BG = "#2A2A2A";
const CHECK_BACKGROUND = "#343434";

const FEATURE_ITEMS = [
  "Faster Rendering",
  "Ad-free Experience",
  "Unlimited Design Renders",
] as const;

const PAYWALL_IMAGES = [
  {
    id: "paywall-soft-lounge",
    source: require("../assets/media/paywall/paywall-soft-lounge.png"),
  },
  {
    id: "paywall-luxury-lounge",
    source: require("../assets/media/paywall/paywall-luxury-lounge.png"),
  },
  {
    id: "paywall-marble-kitchen",
    source: require("../assets/media/paywall/paywall-marble-kitchen.png"),
  },
] as const;

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureCheck}>
        <Check color={TEXT_PRIMARY} size={12} strokeWidth={3} />
      </View>
      <Text style={styles.featureText}>{label}</Text>
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
    <LuxPressable onPress={onPress} style={[styles.toggleSwitch, value ? styles.toggleSwitchOn : styles.toggleSwitchOff]} scale={0.98}>
      <MotiView
        animate={{ translateX: value ? 20 : 0 }}
        transition={{ type: "timing", duration: 200 }}
        style={styles.toggleThumbWrap}
      >
        <View style={styles.toggleThumb} />
      </MotiView>
    </LuxPressable>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const { showSuccess, showToast } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("weekly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayedImages = useMemo(() => {
    const total = PAYWALL_IMAGES.length;
    return [
      PAYWALL_IMAGES[wrapIndex(activeImageIndex - 1, total)],
      PAYWALL_IMAGES[wrapIndex(activeImageIndex, total)],
      PAYWALL_IMAGES[wrapIndex(activeImageIndex + 1, total)],
    ];
  }, [activeImageIndex]);

  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );

  const isCtaDisabled = isLoading || !selectedPackage;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((current) => wrapIndex(current + 1, PAYWALL_IMAGES.length));
    }, AUTO_ROTATE_MS);

    return () => clearInterval(timer);
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

  const applyTrialState = useCallback((enabled: boolean) => {
    setFreeTrialEnabled(enabled);
    setSelectedDuration(enabled ? "weekly" : "yearly");
  }, []);

  const handleToggleTrial = useCallback(() => {
    triggerHaptic();
    setErrorMessage(null);
    applyTrialState(!freeTrialEnabled);
  }, [applyTrialState, freeTrialEnabled]);

  const handleSelectYearly = useCallback(() => {
    triggerHaptic();
    setErrorMessage(null);
    applyTrialState(false);
  }, [applyTrialState]);

  const handleSelectWeekly = useCallback(() => {
    triggerHaptic();
    setErrorMessage(null);
    applyTrialState(true);
  }, [applyTrialState]);

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
        showToast("Your 7-day Darkor AI Pro trial is active.");
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

      const purchasedPlan = inferPlanFromCustomerInfo(result.customerInfo);

      if (isSignedIn) {
        await persistPurchasedPlan(purchasedPlan, selectedDuration, Date.now(), null);
      }

      if (freeTrialEnabled && purchasedPlan === "trial") {
        showToast("Your 7-day Darkor AI Pro trial is active.");
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

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 28, 28) },
        ]}
      >
        <View style={styles.heroViewport}>
          <View style={styles.heroTrack}>
            <MotiView
              key={`left-${displayedImages[0].id}`}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 200 }}
              style={styles.sideImageWrap}
            >
              <Image source={displayedImages[0].source} style={styles.sideImage} contentFit="cover" />
            </MotiView>

            <MotiView
              key={`center-${displayedImages[1].id}`}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 200 }}
              style={styles.centerImageWrap}
            >
              <Image source={displayedImages[1].source} style={styles.centerImage} contentFit="cover" />
            </MotiView>

            <MotiView
              key={`right-${displayedImages[2].id}`}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 200 }}
              style={styles.sideImageWrap}
            >
              <Image source={displayedImages[2].source} style={styles.sideImage} contentFit="cover" />
            </MotiView>
          </View>
        </View>

        <View style={styles.featureList}>
          {FEATURE_ITEMS.map((item, index) => (
            <View key={item} style={index === 0 ? null : styles.featureRowSpacing}>
              <FeatureRow label={item} />
            </View>
          ))}
        </View>

        <View style={styles.toggleBar}>
          <AnimatePresence>
            <MotiView
              key={freeTrialEnabled ? "trial-on" : "trial-off"}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "timing", duration: 200 }}
            >
              <Text style={styles.toggleLabel}>
                {freeTrialEnabled ? "Free trial enabled" : "Enable free trial"}
              </Text>
            </MotiView>
          </AnimatePresence>
          <TrialToggle value={freeTrialEnabled} onPress={handleToggleTrial} />
        </View>

        <LuxPressable onPress={handleSelectYearly} style={[styles.planBar, !freeTrialEnabled ? styles.planBarSelected : styles.planBarIdle]} scale={0.99}>
          <View style={styles.planCopyLeft}>
            <Text style={styles.planTitle}>YEARLY ACCESS</Text>
            <Text style={styles.planSubtitle}>Just MAD 484.99 per year</Text>
          </View>

          <View style={styles.planCopyRight}>
            <Text style={styles.planPrice}>MAD9.33</Text>
            <Text style={styles.planPriceCaption}>per week</Text>
          </View>

          <View style={styles.bestOfferBadge}>
            <Text style={styles.bestOfferText}>BEST OFFER</Text>
          </View>
        </LuxPressable>

        <AnimatePresence>
          <MotiView
            key={freeTrialEnabled ? "trial-card" : "weekly-card"}
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "timing", duration: 200 }}
          >
            <LuxPressable
              onPress={handleSelectWeekly}
              style={[
                styles.planBar,
                styles.secondaryPlanBar,
                freeTrialEnabled ? styles.planBarSelected : styles.planBarIdle,
                freeTrialEnabled ? styles.trialBarSelected : null,
              ]}
              scale={0.99}
            >
              {freeTrialEnabled ? (
                <>
                  <View style={styles.planCopyLeft}>
                    <Text style={styles.planTitle}>3-DAYS FREE TRIAL</Text>
                  </View>

                  <View style={styles.planCopyRight}>
                    <Text style={styles.trialPrice}>then MAD 119.99</Text>
                    <Text style={styles.planPriceCaption}>per week</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.planCopyLeft}>
                    <Text style={styles.planTitle}>WEEKLY ACCESS</Text>
                  </View>

                  <View style={styles.planCopyRight}>
                    <Text style={styles.trialPrice}>MAD 119.99</Text>
                    <Text style={styles.planPriceCaption}>per week</Text>
                  </View>
                </>
              )}
            </LuxPressable>
          </MotiView>
        </AnimatePresence>

        <AnimatePresence>
          {freeTrialEnabled ? (
            <MotiView
              key="no-payment-now"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "timing", duration: 200 }}
              style={styles.trustNoteTrial}
            >
              <ShieldCheck color={TEXT_SECONDARY} size={15} strokeWidth={2.2} />
              <Text style={styles.trustNoteText}>No Payment Now</Text>
            </MotiView>
          ) : (
            <MotiView
              key="cancel-anytime"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "timing", duration: 200 }}
              style={styles.trustNoteWeekly}
            >
              <ShieldCheck color={TEXT_SECONDARY} size={15} strokeWidth={2.2} />
              <Text style={styles.trustNoteText}>Cancel Anytime</Text>
            </MotiView>
          )}
        </AnimatePresence>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <LuxPressable onPress={handlePurchase} disabled={isCtaDisabled} style={styles.ctaButton} scale={0.985}>
          {isLoading ? (
            <View style={styles.ctaContent}>
              <ActivityIndicator color={TEXT_PRIMARY} />
              <Text style={styles.ctaText}>Processing...</Text>
            </View>
          ) : (
            <AnimatePresence>
              <MotiView
                key={freeTrialEnabled ? "cta-trial" : "cta-continue"}
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "timing", duration: 200 }}
                style={styles.ctaContent}
              >
                <Text style={styles.ctaText}>{freeTrialEnabled ? "Try for Free" : "Continue"}</Text>
                <ArrowRight color={TEXT_PRIMARY} size={20} strokeWidth={2.5} />
              </MotiView>
            </AnimatePresence>
          )}
        </LuxPressable>
      </ScrollView>

      <LuxPressable onPress={handleRestore} style={styles.restoreButton} scale={0.98}>
        <Text style={styles.restoreText}>Restore</Text>
      </LuxPressable>

      <LuxPressable onPress={handleClose} style={styles.closeButton} scale={0.96}>
        <X color={TEXT_PRIMARY} size={16} strokeWidth={2.4} />
      </LuxPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  heroViewport: {
    width: "100%",
    overflow: "hidden",
    marginBottom: 36,
  },
  heroTrack: {
    width: HERO_TRACK_WIDTH,
    flexDirection: "row",
    alignSelf: "center",
    gap: IMAGE_GAP,
  },
  sideImageWrap: {
    marginTop: 92,
  },
  centerImageWrap: {
    marginTop: 64,
  },
  sideImage: {
    width: SIDE_IMAGE_WIDTH,
    height: SIDE_IMAGE_HEIGHT,
    borderRadius: 16,
    backgroundColor: SURFACE,
  },
  centerImage: {
    width: CENTER_IMAGE_SIZE,
    height: CENTER_IMAGE_SIZE,
    borderRadius: 20,
    backgroundColor: SURFACE,
  },
  featureList: {
    marginHorizontal: 82,
    marginBottom: 36,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureRowSpacing: {
    marginTop: 24,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: CHECK_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  toggleBar: {
    height: 56,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  toggleSwitchOn: {
    backgroundColor: CTA_RED,
  },
  toggleSwitchOff: {
    backgroundColor: TOGGLE_OFF,
  },
  toggleThumbWrap: {
    width: 28,
    height: 28,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEXT_PRIMARY,
  },
  planBar: {
    height: 72,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  planBarIdle: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  planBarSelected: {
    borderWidth: 2,
    borderColor: CTA_RED,
  },
  secondaryPlanBar: {
    marginTop: 12,
  },
  trialBarSelected: {
    backgroundColor: SURFACE_ACCENT,
  },
  planCopyLeft: {
    flexShrink: 1,
    paddingRight: 12,
  },
  planCopyRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  planTitle: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  planSubtitle: {
    marginTop: 4,
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  planPrice: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  trialPrice: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  planPriceCaption: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  bestOfferBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: CTA_RED,
  },
  bestOfferText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 13,
    textTransform: "uppercase",
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  trustNoteTrial: {
    marginTop: 16,
    marginLeft: 136,
    marginRight: 132,
    marginBottom: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  trustNoteWeekly: {
    marginTop: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  trustNoteText: {
    marginLeft: 6,
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  errorText: {
    marginHorizontal: 16,
    marginBottom: 16,
    color: CTA_RED,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  ctaButton: {
    height: 58,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CTA_RED,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: CTA_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaContent: {
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
  restoreButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 2,
  },
  restoreText: {
    color: TEXT_RESTORE,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  closeButton: {
    position: "absolute",
    top: 28,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CLOSE_BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
