import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ShieldCheck, X } from "lucide-react-native";

import { useProSuccess } from "../components/pro-success-context";
import { triggerHaptic } from "../lib/haptics";
import { dismissLaunchPaywall } from "../lib/launch-paywall";
import {
  configureRevenueCat,
  getRevenueCatClient,
  hasProEntitlement,
  inferPlanFromCustomerInfo,
  inferPlanFromRevenueCat,
  type RevenueCatPackage,
  type RevenueCatPurchases,
} from "../lib/revenuecat";
import { planCreditGrant } from "../lib/pricing";

const GALLERY_IMAGES = [
  require("../assets/media/luxury-1.jpg"),
  require("../assets/media/luxury-2.jpg"),
  require("../assets/media/luxury-3.jpg"),
  require("../assets/media/luxury-4.jpg"),
  require("../assets/media/luxury-5.jpg"),
  require("../assets/media/luxury-6.jpg"),
  require("../assets/media/luxury-7.jpg"),
];

const YEARLY_TOTAL = 484.99;
const WEEKLY_PRICE = 119.99;
const YEARLY_WEEKLY_EQUIV = (YEARLY_TOTAL / 52).toFixed(2);
const FEATURES = ["Faster rendering", "Ad-free experience", "Unlimited design renders"];

const GallerySlide = memo(function GallerySlide({ source }: { source: number }) {
  return <Image source={source} style={styles.galleryImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />;
});

const FeatureRow = memo(function FeatureRow({ feature }: { feature: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>
        <Check color="#ffffff" size={14} />
      </View>
      <Text style={styles.featureText}>{feature}</Text>
    </View>
  );
});

export default function PaywallScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const { showSuccess } = useProSuccess();

  const [annualPackage, setAnnualPackage] = useState<RevenueCatPackage | null>(null);
  const [weeklyPackage, setWeeklyPackage] = useState<RevenueCatPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "weekly">("yearly");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const galleryWidth = Math.min(width - 32, 420);
  const galleryHeight = Math.round(galleryWidth * 0.62);
  const selectedPackage = useMemo(() => {
    if (trialEnabled) return annualPackage;
    return selectedPlan === "yearly" ? annualPackage : weeklyPackage;
  }, [annualPackage, selectedPlan, trialEnabled, weeklyPackage]);
  const trialCopy = trialEnabled
    ? "3-DAYS FREE TRIAL then MAD 119.99 per week"
    : "Choose yearly for the best offer or weekly for flexible billing.";

  useEffect(() => {
    let active = true;

    const loadOfferings = async () => {
      try {
        const cached = getRevenueCatClient();
        if (cached) {
          purchasesRef.current = cached;
        } else {
          purchasesRef.current = await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
        }

        if (!active || !purchasesRef.current) {
          if (active) {
            setErrorMessage("Subscriptions are temporarily unavailable.");
          }
          return;
        }

        const offerings = await purchasesRef.current.getOfferings();
        if (!active) return;

        const current = offerings.current;
        const available = current?.availablePackages ?? [];
        const annual =
          current?.annual ??
          available.find((pkg) => pkg.packageType === purchasesRef.current?.PACKAGE_TYPE.ANNUAL);
        const weekly =
          current?.weekly ??
          available.find((pkg) => pkg.packageType === purchasesRef.current?.PACKAGE_TYPE.WEEKLY);

        setAnnualPackage(annual ?? null);
        setWeeklyPackage(weekly ?? null);
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

  const handleSelectPlan = useCallback((plan: "yearly" | "weekly") => {
    if (trialEnabled && plan === "weekly") return;
    triggerHaptic();
    setSelectedPlan(plan);
  }, [trialEnabled]);

  const handleToggleTrial = useCallback((value: boolean) => {
    triggerHaptic();
    setTrialEnabled(value);
    if (value) {
      setSelectedPlan("yearly");
    }
  }, []);

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
      const hasPro = hasProEntitlement(info);

      if (hasPro && isSignedIn) {
        const inferredPlan = inferPlanFromCustomerInfo(info);
        await setPlan({ plan: inferredPlan, credits: planCreditGrant(inferredPlan) });
      }

      if (hasPro) {
        dismissLaunchPaywall();
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, router, setPlan]);

  const handlePurchase = useCallback(async () => {
    triggerHaptic();
    setErrorMessage(null);

    if (!selectedPackage) {
      const message = "We could not load your subscription options. Please try again.";
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
      const hasPro = hasProEntitlement(result.customerInfo);

      if (hasPro && isSignedIn) {
        const inferredPlan = inferPlanFromRevenueCat({
          packageIdentifier: selectedPackage.identifier,
          productIdentifier: selectedPackage.product.identifier,
          activeSubscriptions: result.customerInfo.activeSubscriptions,
        });
        await setPlan({ plan: inferredPlan, credits: planCreditGrant(inferredPlan) });
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
  }, [isSignedIn, router, selectedPackage, setPlan, showSuccess]);

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
          <Pressable onPress={handleRestore} style={({ pressed }) => [styles.restoreButton, pressed ? styles.pressed : null]}>
            <Text style={styles.restoreText}>Restore</Text>
          </Pressable>
          <Pressable onPress={handleClose} style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}>
            <X color="#f5f5f5" size={18} />
          </Pressable>
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
          <Text style={styles.heroTitle}>Unlock the premium Home AI studio</Text>
          <Text style={styles.heroBody}>
            Access the seven-scene inspiration gallery, premium redesign flows, and unlimited pro-grade visual iterations.
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <FeatureRow key={feature} feature={feature} />
          ))}
        </View>

        <View style={styles.trialRow}>
          <View style={styles.trialCopyWrap}>
            <Text style={styles.trialTitle}>Enable free trial</Text>
            <Text style={styles.trialBody}>{trialCopy}</Text>
          </View>
          <Switch
            value={trialEnabled}
            onValueChange={handleToggleTrial}
            trackColor={{ false: "#27272a", true: "#ec4899" }}
            thumbColor={trialEnabled ? "#ffffff" : "#d4d4d8"}
            ios_backgroundColor="#27272a"
          />
        </View>

        <View style={styles.planList}>
          <Pressable
            onPress={() => handleSelectPlan("yearly")}
            style={({ pressed }) => [
              styles.planCard,
              styles.planCardPrimary,
              trialEnabled || selectedPlan === "yearly" ? styles.planCardActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.planTopRow}>
              <Text style={styles.planLabel}>YEARLY ACCESS</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>BEST OFFER</Text>
              </View>
            </View>
            <Text style={styles.planPrice}>MAD {YEARLY_WEEKLY_EQUIV} / week</Text>
            <Text style={styles.planMeta}>Billed as MAD {YEARLY_TOTAL.toFixed(2)} per year</Text>
            <Text style={styles.planFootnote}>Full access, lowest weekly equivalent.</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSelectPlan("weekly")}
            disabled={trialEnabled}
            style={({ pressed }) => [
              styles.planCard,
              !trialEnabled && selectedPlan === "weekly" ? styles.planCardActive : null,
              trialEnabled ? styles.planCardDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.planLabel}>WEEKLY ACCESS</Text>
            <Text style={styles.planPrice}>MAD {WEEKLY_PRICE.toFixed(2)} / week</Text>
            <Text style={styles.planMeta}>Flexible weekly billing for fast testing and upgrades</Text>
            <Text style={styles.planFootnote}>Best for short-term upgrades and quick access.</Text>
          </Pressable>
        </View>

        {trialEnabled ? (
          <View style={styles.trialBanner}>
            <ShieldCheck color="#67e8f9" size={16} />
            <Text style={styles.trialBannerText}>No payment now. Cancel anytime before the trial ends.</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable onPress={handlePurchase} disabled={isLoading} style={({ pressed }) => [styles.ctaOuter, pressed ? styles.pressed : null]}>
          <LinearGradient colors={["#f43f5e", "#d946ef", "#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.ctaText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.ctaText}>{trialEnabled ? "Try for Free" : "Continue"}</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={styles.disclaimer}>
          Subscription auto-renews unless cancelled. Manage billing anytime from Google Play or the App Store.
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
  restoreButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  restoreText: {
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
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pressed: {
    opacity: 0.84,
  },
  carouselWrap: {
    alignItems: "center",
    marginBottom: 28,
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  heroBlock: {
    gap: 12,
  },
  eyebrow: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
  },
  heroBody: {
    color: "#d4d4d8",
    fontSize: 16,
    lineHeight: 24,
  },
  featureList: {
    marginTop: 24,
    gap: 14,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  featureIconWrap: {
    height: 34,
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  featureText: {
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "700",
  },
  trialRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  trialCopyWrap: {
    flex: 1,
    gap: 6,
  },
  trialTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  trialBody: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  planList: {
    marginTop: 22,
    gap: 14,
  },
  planCard: {
    minHeight: 154,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  planCardPrimary: {
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  planCardActive: {
    borderColor: "rgba(236,72,153,0.92)",
    backgroundColor: "rgba(236,72,153,0.08)",
  },
  planCardDisabled: {
    opacity: 0.46,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planLabel: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  planBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(250,204,21,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planBadgeText: {
    color: "#fde68a",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  planPrice: {
    marginTop: 14,
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "800",
  },
  planMeta: {
    marginTop: 8,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 19,
  },
  planFootnote: {
    marginTop: 10,
    color: "#71717a",
    fontSize: 12,
    lineHeight: 17,
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
    paddingVertical: 19,
    paddingHorizontal: 18,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
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


