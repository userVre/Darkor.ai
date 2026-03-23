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
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react-native";

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
  "Full access to 50+ Premium Styles",
  "Redesign Interior, Exterior, and Gardens",
  "Smart Wall Paint & Floor Restyle tools",
  "Priority processing (No waiting in line)",
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
  yearlyWeekly: 0.9,
  yearlyTotal: 47.52,
  weekly: 11.9,
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
  yearlyBillingLabel: string;
  weeklyLabel: string;
  weeklyCompactLabel: string;
  trialLine: string;
};

const GallerySlide = memo(function GallerySlide({ source }: { source: number }) {
  return <Image source={source} style={styles.galleryImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />;
});

const FeatureRow = memo(function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Check color="#f7efe0" size={13} />
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
  const yearlyWeekly = formatMoney(BASE_PRICES_USD.yearlyWeekly * rate, currency, localeTag);
  const yearlyTotal = formatMoney(BASE_PRICES_USD.yearlyTotal * rate, currency, localeTag);
  const weekly = formatMoney(BASE_PRICES_USD.weekly * rate, currency, localeTag);

  return {
    currency,
    localeTag,
    regionCode,
    yearlyWeeklyLabel: `${yearlyWeekly} / week`,
    yearlyBillingLabel: `Billed at ${yearlyTotal}/year`,
    weeklyLabel: `${weekly} / week`,
    weeklyCompactLabel: `${weekly}/week`,
    trialLine: `3-DAYS FREE TRIAL then ${weekly}/week`,
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
    <LuxPressable
      onPress={onPress}
      style={[styles.trialSwitch, value ? styles.trialSwitchActive : null]}
      className={pointerClassName}
    >
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
  const galleryHeight = Math.round(galleryWidth * 0.64);
  const pricing = useMemo(() => getLocalizedPricing(), []);
  const selectedPackage = useMemo(
    () => findRevenueCatPackage(packages, selectedDuration),
    [packages, selectedDuration],
  );
  const checkoutStateMessage = useMemo(() => {
    if (errorMessage) {
      return errorMessage;
    }
    if (selectedPackage) {
      return null;
    }
    if (!packages.length) {
      return "Loading secure checkout...";
    }
    return "This plan is temporarily unavailable. Please try the other option or restore a purchase.";
  }, [errorMessage, packages.length, selectedPackage]);
  const isCtaDisabled = isLoading || !selectedPackage;

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

      const purchasedPlan: BillingPlan = trialEnabled && selectedDuration === "weekly" ? "trial" : "pro";
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
  }, [isSignedIn, persistPurchasedPlan, router, selectedDuration, selectedPackage, showSuccess, showToast, trialEnabled]);

  const renderGalleryItem = useCallback(({ item }: { item: number }) => <GallerySlide source={item} />, []);
  const ctaTitle = trialEnabled ? "Start free trial" : "Continue";
  const ctaSubtitle = trialEnabled
    ? pricing.trialLine
    : selectedDuration === "yearly"
      ? pricing.yearlyBillingLabel
      : "Flexible weekly access";

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom + 28, 32),
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <LuxPressable onPress={handleRestore} style={styles.topAction} className={pointerClassName}>
            <Text style={styles.topActionText}>Restore</Text>
          </LuxPressable>
          <LuxPressable onPress={handleClose} style={styles.closeButton} className={pointerClassName}>
            <X color="#ffffff" size={18} />
          </LuxPressable>
        </View>

        <View style={styles.carouselWrap}>
          <Carousel
            loop
            autoPlay
            autoPlayInterval={2600}
            width={galleryWidth}
            height={galleryHeight}
            data={GALLERY_IMAGES}
            scrollAnimationDuration={900}
            renderItem={renderGalleryItem}
          />
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Darkor.ai Pro</Text>
          <Text style={styles.heroTitle}>Unlock the full power of Darkor.ai Pro</Text>
          <Text style={styles.heroBody}>
            Export without watermarks, access every premium style, and redesign interiors, exteriors, and gardens with faster turnaround.
          </Text>
        </View>

        <View style={styles.trialControlRow}>
          <View style={styles.trialControlCopy}>
            <Text style={styles.trialControlTitle}>3-day free trial</Text>
            <Text style={styles.trialControlBody}>Available on the weekly plan only.</Text>
          </View>
          <TrialSwitch value={trialEnabled} onPress={handleToggleTrial} />
        </View>

        <View style={styles.planStack}>
          <LuxPressable
            onPress={() => handleSelectDuration("yearly")}
            style={[styles.planCard, selectedDuration === "yearly" ? styles.planCardActive : null]}
            className={pointerClassName}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.valueBadge}>
                <Text style={styles.valueBadgeText}>BEST VALUE</Text>
              </View>
              <View style={[styles.selectionDot, selectedDuration === "yearly" ? styles.selectionDotActive : null]} />
            </View>

            <Animated.View key={`yearly-${pricing.currency}`} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <Text style={styles.planTitle}>Yearly Pro</Text>
              <Text style={styles.primaryPrice}>{pricing.yearlyWeeklyLabel}</Text>
              <Text style={styles.secondaryPrice}>{pricing.yearlyBillingLabel}</Text>
              <Text style={styles.planBody}>The lowest weekly cost for full Darkor.ai Pro access.</Text>
            </Animated.View>
          </LuxPressable>

          <LuxPressable
            onPress={() => handleSelectDuration("weekly")}
            style={[
              styles.planCard,
              selectedDuration === "weekly" ? styles.planCardActive : null,
              trialEnabled ? styles.weeklyTrialCard : null,
            ]}
            className={pointerClassName}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.weeklyBadge, trialEnabled ? styles.weeklyBadgeActive : null]}>
                <Text style={[styles.weeklyBadgeText, trialEnabled ? styles.weeklyBadgeTextActive : null]}>
                  {trialEnabled ? "TRIAL ON" : "WEEKLY"}
                </Text>
              </View>
              <View style={[styles.selectionDot, selectedDuration === "weekly" ? styles.selectionDotActive : null]} />
            </View>

            <Animated.View key={`weekly-${trialEnabled}-${pricing.currency}`} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
              <Text style={styles.planTitle}>Weekly Pro</Text>
              {trialEnabled ? (
                <>
                  <Text style={styles.trialHeadline}>3-DAYS FREE TRIAL</Text>
                  <Text style={styles.secondaryPrice}>{`then ${pricing.weeklyCompactLabel}`}</Text>
                  <Text style={styles.planBody}>Flexible weekly access after your trial ends.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryPrice}>{pricing.weeklyLabel}</Text>
                  <Text style={styles.secondaryPrice}>Flexible weekly access</Text>
                  <Text style={styles.planBody}>Start Pro immediately without the yearly commitment.</Text>
                </>
              )}
            </Animated.View>
          </LuxPressable>
        </View>

        <View style={styles.featureShell}>
          <View style={styles.featureHeaderRow}>
            <ShieldCheck color="#d6b06a" size={16} />
            <Text style={styles.featureHeaderText}>Everything included in Pro</Text>
          </View>
          <View style={styles.featureList}>
            {PRO_FEATURES.map((feature) => (
              <FeatureRow key={feature} label={feature} />
            ))}
          </View>
        </View>

        {checkoutStateMessage ? (
          <Text style={errorMessage ? styles.errorText : styles.statusText}>{checkoutStateMessage}</Text>
        ) : null}

        <LuxPressable
          onPress={handlePurchase}
          disabled={isCtaDisabled}
          style={[styles.ctaOuter, isCtaDisabled ? styles.ctaOuterDisabled : null]}
          className={pointerClassName}
        >
          <LinearGradient
            colors={isCtaDisabled ? ["#171717", "#111111"] : ["#f1d49a", "#b47b31"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0b0b0b" />
                <Text style={styles.ctaText}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.ctaContent}>
                <Text style={[styles.ctaText, isCtaDisabled ? styles.ctaTextDisabled : null]}>{ctaTitle}</Text>
                {!isCtaDisabled ? <ArrowRight color="#0b0b0b" size={18} /> : null}
              </View>
            )}
            {!isLoading ? (
              <Text style={[styles.ctaSubtext, isCtaDisabled ? styles.ctaSubtextDisabled : null]}>{ctaSubtitle}</Text>
            ) : null}
          </LinearGradient>
        </LuxPressable>

        <Text style={styles.disclaimer}>
          Subscriptions renew automatically unless canceled in your App Store or Google Play settings.
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
    marginBottom: 16,
  },
  topAction: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  topActionText: {
    color: "#f5f5f5",
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  carouselWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroBlock: {
    gap: 12,
  },
  eyebrow: {
    color: "#b9b9b9",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.2,
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#050505",
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
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 18,
  },
  trialSwitch: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#242424",
    padding: 4,
    justifyContent: "center",
  },
  trialSwitchActive: {
    backgroundColor: "#b47b31",
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#050505",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  planCardActive: {
    borderColor: "rgba(214,176,106,0.75)",
    backgroundColor: "#080808",
    shadowColor: "#b47b31",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  weeklyTrialCard: {
    borderColor: "rgba(214,176,106,0.75)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  valueBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(214,176,106,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  valueBadgeText: {
    color: "#f1d49a",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  weeklyBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weeklyBadgeActive: {
    backgroundColor: "rgba(214,176,106,0.14)",
  },
  weeklyBadgeText: {
    color: "#d4d4d8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  weeklyBadgeTextActive: {
    color: "#f1d49a",
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
  },
  selectionDotActive: {
    borderColor: "#d6b06a",
    backgroundColor: "rgba(214,176,106,0.22)",
  },
  planTitle: {
    color: "#ffffff",
    fontSize: 24,
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
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 34,
  },
  secondaryPrice: {
    marginTop: 8,
    color: "#f1d49a",
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#050505",
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
    backgroundColor: "rgba(214,176,106,0.14)",
  },
  featureText: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 13,
    lineHeight: 18,
  },
  statusText: {
    marginTop: 16,
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    marginTop: 16,
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
  },
  ctaOuter: {
    marginTop: 24,
    borderRadius: 28,
  },
  ctaOuterDisabled: {
    opacity: 0.72,
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
    color: "#0b0b0b",
    fontSize: 17,
    fontWeight: "800",
  },
  ctaTextDisabled: {
    color: "#f5f5f5",
  },
  ctaSubtext: {
    marginTop: 6,
    color: "rgba(11,11,11,0.72)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  ctaSubtextDisabled: {
    color: "rgba(255,255,255,0.72)",
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
