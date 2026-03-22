import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import * as Localization from "expo-localization";
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
import { ArrowRight, Check, ShieldCheck, Sparkles, X } from "lucide-react-native";

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
  inferBillingDurationFromCustomerInfo,
  inferPlanFromCustomerInfo,
  inferPurchaseDateFromCustomerInfo,
  inferSubscriptionEndFromCustomerInfo,
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

const PRO_FEATURES = [
  "Watermark-free 4K Ultra HD exports",
  "Priority generation and premium render path",
  "All interior, exterior, and outdoor workflows",
  "3D walkthroughs and VR presentation tools",
];

const EUROPE_REGIONS = new Set([
  "AD", "AL", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  "FO", "FR", "GB", "GG", "GI", "GR", "HR", "HU", "IE", "IM", "IS", "IT", "JE", "LI", "LT", "LU",
  "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "SE", "SI", "SJ", "SK",
  "SM", "UA", "VA",
]);

const FX_RATES = {
  USD: 1,
  EUR: 0.92,
  MAD: 10,
} as const;

const BASE_PRICES_USD = {
  yearlyWeekly: 0.99,
  yearlyTotal: 47.52,
  weekly: 11.99,
} as const;

const SPRING = {
  damping: 18,
  stiffness: 180,
} as const;

const pointerClassName = "cursor-pointer";

type CurrencyCode = keyof typeof FX_RATES;

type LocalizedPricing = {
  currency: CurrencyCode;
  localeTag: string;
  regionCode: string;
  yearlyWeeklyLabel: string;
  yearlyTotalLabel: string;
  weeklyLabel: string;
};

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

function getCurrencyCode(regionCode: string): CurrencyCode {
  if (regionCode === "MA") {
    return "MAD";
  }
  if (EUROPE_REGIONS.has(regionCode)) {
    return "EUR";
  }
  return "USD";
}

function formatMoney(value: number, currency: CurrencyCode, localeTag: string) {
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getLocalizedPricing(): LocalizedPricing {
  const locale = Localization.getLocales()[0];
  const regionCode = locale?.regionCode?.toUpperCase()
    ?? locale?.languageTag?.split("-")[1]?.toUpperCase()
    ?? "US";
  const currency = getCurrencyCode(regionCode);
  const localeTag = locale?.languageTag ?? (currency === "MAD" ? "fr-MA" : currency === "EUR" ? "fr-FR" : "en-US");
  const rate = FX_RATES[currency];

  return {
    currency,
    localeTag,
    regionCode,
    yearlyWeeklyLabel: `${formatMoney(BASE_PRICES_USD.yearlyWeekly * rate, currency, localeTag)} / week`,
    yearlyTotalLabel: formatMoney(BASE_PRICES_USD.yearlyTotal * rate, currency, localeTag),
    weeklyLabel: `${formatMoney(BASE_PRICES_USD.weekly * rate, currency, localeTag)} / week`,
  };
}

function TrialSwitch({ value, onPress }: { value: boolean; onPress: () => void }) {
  const offset = useSharedValue(value ? 20 : 0);

  useEffect(() => {
    offset.value = withSpring(value ? 20 : 0, SPRING);
  }, [offset, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <LuxPressable onPress={onPress} style={styles.trialSwitch} className={pointerClassName}>
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

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const galleryWidth = Math.min(width - 32, 420);
  const galleryHeight = Math.round(galleryWidth * 0.62);
  const pricing = useMemo(() => getLocalizedPricing(), []);
  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );

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

  const handleClose = useCallback(() => {
    triggerHaptic();
    dismissLaunchPaywall();
    router.replace("/(tabs)");
  }, [router]);

  const handleSelectDuration = useCallback((duration: BillingDuration) => {
    triggerHaptic();
    setSelectedDuration(duration);
    if (duration === "yearly" && trialEnabled) {
      setTrialEnabled(false);
    }
  }, [trialEnabled]);

  const handleToggleTrial = useCallback(() => {
    triggerHaptic();
    setTrialEnabled((current) => {
      const next = !current;
      if (next) {
        setSelectedDuration("weekly");
      }
      return next;
    });
  }, []);

  const persistPurchasedPlan = useCallback(async (plan: BillingPlan, subscriptionType: BillingDuration, purchasedAt?: number | null, subscriptionEnd?: number | null) => {
    await setPlan({
      plan,
      credits: planCreditGrant(plan),
      subscriptionType,
      purchasedAt: typeof purchasedAt === "number" ? purchasedAt : undefined,
      subscriptionEnd: typeof subscriptionEnd === "number" ? subscriptionEnd : undefined,
    });
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
      const inferredDuration = inferBillingDurationFromCustomerInfo(info);
      const purchasedAt = inferPurchaseDateFromCustomerInfo(info);
      const subscriptionEnd = inferSubscriptionEndFromCustomerInfo(info);
      if (isSignedIn) {
        await persistPurchasedPlan(inferredPlan, inferredDuration, purchasedAt, subscriptionEnd);
      }

      if (inferredPlan === "trial") {
        showToast("Your 3-day Pro Studio trial is active.");
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

      const purchasedPlan: BillingPlan = trialEnabled && selectedDuration === "weekly" ? "trial" : "pro";
      if (isSignedIn) {
        await persistPurchasedPlan(purchasedPlan, selectedDuration, Date.now(), null);
      }

      if (purchasedPlan === "trial") {
        showToast("Your 3-day Pro Studio trial is active.");
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
  }, [isSignedIn, persistPurchasedPlan, router, selectedDuration, selectedPackage, showSuccess, showToast, trialEnabled]);

  const renderGalleryItem = useCallback(({ item }: { item: number }) => <GallerySlide source={item} />, []);
  const ctaTitle = trialEnabled ? "Try for Free" : "Continue";
  const ctaSubtitle = trialEnabled
    ? `3 days free, then ${pricing.weeklyLabel}`
    : selectedDuration === "yearly"
      ? `Just ${pricing.yearlyTotalLabel} per year`
      : `Billed at ${pricing.weeklyLabel}. Cancel anytime.`;

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
          <LuxPressable onPress={handleRestore} style={styles.topAction} className={pointerClassName}>
            <Text style={styles.topActionText}>Restore</Text>
          </LuxPressable>
          <LuxPressable onPress={handleClose} style={styles.closeButton} className={pointerClassName}>
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
          <Text style={styles.eyebrow}>Darkor.ai Pro Studio</Text>
          <Text style={styles.heroTitle}>One premium studio, localized for every market.</Text>
          <Text style={styles.heroBody}>
            Choose the best Pro Studio billing cadence for your region. Morocco displays in MAD, Europe in EUR, and the rest of the world in USD automatically.
          </Text>
        </View>

        <View style={styles.trialControlRow}>
          <View style={styles.trialControlCopy}>
            <Text style={styles.trialControlTitle}>Enable free trial</Text>
            <Text style={styles.trialControlBody}>Turning this on automatically switches you to the weekly plan.</Text>
          </View>
          <TrialSwitch value={trialEnabled} onPress={handleToggleTrial} />
        </View>

        <View style={styles.planStack}>
          <LuxPressable
            onPress={() => handleSelectDuration("yearly")}
            style={[styles.planCard, styles.yearlyCard, selectedDuration === "yearly" ? styles.planCardActive : null]}
            className={pointerClassName}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.bestOfferBadge}>
                <Text style={styles.bestOfferText}>BEST OFFER</Text>
              </View>
              <View style={[styles.selectionDot, selectedDuration === "yearly" ? styles.selectionDotActive : null]} />
            </View>

            <Animated.View key={`yearly-${pricing.currency}`} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <Text style={styles.planTitle}>Yearly Access</Text>
              <Text style={styles.primaryPrice}>{pricing.yearlyWeeklyLabel}</Text>
              <Text style={styles.secondaryPrice}>Just {pricing.yearlyTotalLabel} per year</Text>
              <Text style={styles.planBody}>The lowest weekly cost for full Pro Studio access.</Text>
            </Animated.View>
          </LuxPressable>

          <LuxPressable
            onPress={() => handleSelectDuration("weekly")}
            style={[
              styles.planCard,
              styles.weeklyCard,
              selectedDuration === "weekly" ? styles.planCardActive : null,
              trialEnabled ? styles.weeklyTrialCard : null,
            ]}
            className={pointerClassName}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.weeklyBadge, trialEnabled ? styles.weeklyBadgeActive : null]}>
                <Text style={styles.weeklyBadgeText}>{trialEnabled ? "TRIAL ACTIVE" : "WEEKLY"}</Text>
              </View>
              <View style={[styles.selectionDot, selectedDuration === "weekly" ? styles.selectionDotActive : null]} />
            </View>

            <Animated.View key={`weekly-${trialEnabled}-${pricing.currency}`} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <Text style={styles.planTitle}>Weekly Access</Text>
              {trialEnabled ? (
                <>
                  <Text style={styles.trialHeadline}>3-DAYS FREE TRIAL</Text>
                  <Text style={styles.secondaryPrice}>then {pricing.weeklyLabel}</Text>
                  <Text style={styles.planBody}>The only plan that unlocks the free trial experience.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryPrice}>{pricing.weeklyLabel}</Text>
                  <Text style={styles.secondaryPrice}>Flexible weekly billing</Text>
                  <Text style={styles.planBody}>Ideal for trying Pro Studio without the yearly commitment.</Text>
                </>
              )}
            </Animated.View>
          </LuxPressable>
        </View>

        <View style={styles.featureShell}>
          <View style={styles.featureHeaderRow}>
            <ShieldCheck color="#67e8f9" size={16} />
            <Text style={styles.featureHeaderText}>Everything in Pro Studio</Text>
          </View>
          <View style={styles.featureList}>
            {PRO_FEATURES.map((feature) => (
              <FeatureRow key={feature} label={feature} />
            ))}
          </View>
          <Text style={styles.featureFooter}>
            {trialEnabled
              ? "Trial checkout is available on the weekly plan only."
              : "Switch on the trial at any time and we will move you to the weekly card automatically."}
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {!selectedPackage ? <Text style={styles.warningText}>RevenueCat package for this billing option is not mapped yet.</Text> : null}

        <LuxPressable onPress={handlePurchase} disabled={isLoading} style={styles.ctaOuter} className={pointerClassName}>
          <LinearGradient
            colors={trialEnabled ? ["#ef4444", "#d946ef", "#7c3aed"] : ["#a855f7", "#d946ef", "#312e81"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.ctaText}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.ctaContent}>
                <Text style={styles.ctaText}>{ctaTitle}</Text>
                {trialEnabled ? <ArrowRight color="#ffffff" size={18} /> : null}
              </View>
            )}
            {!isLoading ? <Text style={styles.ctaSubtext}>{ctaSubtitle}</Text> : null}
          </LinearGradient>
        </LuxPressable>

        <Text style={styles.disclaimer}>
          Free trials and recurring billing are managed by the App Store or Google Play. Darkor.ai localizes displayed prices for your region and removes the watermark only for active paid Pro Studio subscriptions.
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
    color: "#f4f4f5",
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
  trialControlRow: {
    marginTop: 24,
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  trialControlCopy: {
    flex: 1,
    gap: 4,
  },
  trialControlTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  trialControlBody: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18,
  },
  trialSwitch: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(217,70,239,0.28)",
    padding: 4,
    justifyContent: "center",
  },
  trialThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  planStack: {
    marginTop: 20,
    gap: 16,
  },
  planCard: {
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#050505",
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  yearlyCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  weeklyCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  weeklyTrialCard: {
    borderColor: "rgba(248,113,113,0.72)",
    shadowColor: "#ef4444",
  },
  planCardActive: {
    borderColor: "rgba(217,70,239,0.7)",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  bestOfferBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(217,70,239,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bestOfferText: {
    color: "#f5d0fe",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  weeklyBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weeklyBadgeActive: {
    backgroundColor: "rgba(239,68,68,0.18)",
  },
  weeklyBadgeText: {
    color: "#fca5a5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  selectionDotActive: {
    borderColor: "#f0abfc",
    backgroundColor: "rgba(217,70,239,0.18)",
  },
  planTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
  },
  primaryPrice: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
  },
  trialHeadline: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  secondaryPrice: {
    marginTop: 8,
    color: "#f5d0fe",
    fontSize: 14,
    fontWeight: "700",
  },
  planBody: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  featureShell: {
    marginTop: 20,
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  featureHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureHeaderText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  featureList: {
    marginTop: 16,
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
  featureFooter: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    marginTop: 16,
    color: "#fecdd3",
    fontSize: 12,
    lineHeight: 18,
  },
  warningText: {
    marginTop: 10,
    color: "#fca5a5",
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
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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


