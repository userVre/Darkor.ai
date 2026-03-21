import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Carousel from "react-native-reanimated-carousel";
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
  const selectedPackage = useMemo(
    () => (trialEnabled || selectedPlan === "yearly" ? annualPackage : weeklyPackage),
    [annualPackage, selectedPlan, trialEnabled, weeklyPackage],
  );

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

  const handleClose = () => {
    triggerHaptic();
    dismissLaunchPaywall();
    router.replace("/(tabs)");
  };

  const handleSelectPlan = (plan: "yearly" | "weekly") => {
    if (trialEnabled && plan === "weekly") return;
    triggerHaptic();
    setSelectedPlan(plan);
  };

  const handleToggleTrial = (value: boolean) => {
    triggerHaptic();
    setTrialEnabled(value);
    if (value) {
      setSelectedPlan("yearly");
    }
  };

  const handleRestore = async () => {
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
  };

  const handlePurchase = async () => {
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
  };

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
            width={galleryWidth}
            height={galleryHeight}
            data={GALLERY_IMAGES}
            autoPlay
            autoPlayInterval={2800}
            scrollAnimationDuration={1400}
            loop
            style={{ width: galleryWidth }}
            renderItem={({ item }) => (
              <Image source={item} style={styles.galleryImage} contentFit="cover" />
            )}
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
            <View key={feature} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Check color="#ffffff" size={14} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.trialRow}>
          <View style={styles.trialCopyWrap}>
            <Text style={styles.trialTitle}>Enable free trial</Text>
            <Text style={styles.trialBody}>3 days free on yearly access, then MAD 119.99 per week.</Text>
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
            style={({ pressed }) => [styles.planCard, styles.planCardPrimary, selectedPlan === "yearly" ? styles.planCardActive : null, pressed ? styles.pressed : null]}
          >
            <View style={styles.planTopRow}>
              <Text style={styles.planLabel}>YEARLY ACCESS</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>BEST OFFER</Text>
              </View>
            </View>
            <Text style={styles.planPrice}>MAD {YEARLY_WEEKLY_EQUIV} / week</Text>
            <Text style={styles.planMeta}>Billed as MAD {YEARLY_TOTAL.toFixed(2)} per year</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSelectPlan("weekly")}
            disabled={trialEnabled}
            style={({ pressed }) => [
              styles.planCard,
              selectedPlan === "weekly" ? styles.planCardActive : null,
              trialEnabled ? styles.planCardDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.planLabel}>WEEKLY ACCESS</Text>
            <Text style={styles.planPrice}>MAD {WEEKLY_PRICE.toFixed(2)} / week</Text>
            <Text style={styles.planMeta}>Flexible weekly billing for fast testing and upgrades</Text>
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
    marginBottom: 26,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  heroBlock: {
    gap: 10,
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
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  heroBody: {
    color: "#d4d4d8",
    fontSize: 15,
    lineHeight: 22,
  },
  featureList: {
    marginTop: 22,
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  trialCopyWrap: {
    flex: 1,
    gap: 4,
  },
  trialTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  trialBody: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
  },
  planList: {
    marginTop: 20,
    gap: 14,
  },
  planCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  planCardPrimary: {
    backgroundColor: "rgba(236,72,153,0.09)",
  },
  planCardActive: {
    borderColor: "rgba(236,72,153,0.78)",
  },
  planCardDisabled: {
    opacity: 0.52,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 28,
    fontWeight: "800",
  },
  planMeta: {
    marginTop: 6,
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
  },
  trialBanner: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "rgba(34,211,238,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginTop: 22,
    borderRadius: 24,
  },
  ctaGradient: {
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
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

