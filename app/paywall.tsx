import {X} from "@/components/material-icons";
import {useAuth, useUser} from "@clerk/expo";
import {useMutation} from "convex/react";
import {Image} from "expo-image";
import {LinearGradient} from "expo-linear-gradient";
import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {AnimatePresence, MotiView} from "moti";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {
ActivityIndicator,
Alert,
I18nManager,
Pressable,
ScrollView,
StyleSheet,
Text,
View,
useWindowDimensions,
type StyleProp,
type ViewStyle,
} from "react-native";
import Animated, {
Easing,
useAnimatedStyle,
useSharedValue,
withTiming,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {usePricingContext} from "../lib/dynamic-pricing";
import {ANALYTICS_EVENTS, captureAnalytics} from "../lib/analytics";

import {useProSuccess} from "../components/pro-success-context";
import {useDiamondStore} from "../components/diamond-store-context";
import {useViewerCredits} from "../components/viewer-credits-context";
import {useViewerSession} from "../components/viewer-session-context";
import {getGenerationLimit} from "../convex/subscriptions";
import {triggerHaptic} from "../lib/haptics";
import {scheduleOrUpdateProTip} from "../lib/notifications";
import {
getDirectionalAlignment,
getDirectionalTextAlign,
} from "../lib/i18n/rtl";
import {dismissLaunchPaywall, persistHasDismissedPaywall} from "../lib/launch-paywall";
import {resolveSafeRoute, TOOLS_ROUTE} from "../lib/routes";
import {
configureRevenueCat,
fetchTieredPackage,
findRevenueCatPackage,
getCachedTieredPackage,
getRevenueCatClient,
hasActiveSubscription,
resolveRevenueCatSubscription,
type BillingDuration,
type BillingPlan,
type RevenueCatEntitlement,
type RevenueCatPackage,
type RevenueCatPurchases,
} from "../lib/revenuecat";
import {useTheme, type Theme} from "../styles/theme";
import {fonts} from "../styles/typography";

const TRANSITION_DURATION_MS = 200;
const CAROUSEL_INTERVAL_MS = 3000;
const CLOSE_VISUAL_SIZE = 36;
const HERO_HEIGHT = 146;
const HERO_SIDE_HEIGHT = 112;
const PAYWALL_BLACK = "#000000";
const PAYWALL_ACCENT = "#E83A5A";
const PAYWALL_ACCENT_DARK = "#C0254A";
const PAYWALL_ACCENT_SHADOW = "rgba(232,58,90,0.22)";
const PAYWALL_CARD_BG = "rgba(255,255,255,0.06)";
const PAYWALL_CARD_BG_ALT = "rgba(255,255,255,0.04)";
const PAYWALL_BORDER = "rgba(255,255,255,0.12)";
const PAYWALL_TEXT_PRIMARY = "#FFFFFF";
const PAYWALL_TEXT_SECONDARY = "rgba(255,255,255,0.76)";
const PAYWALL_TEXT_MUTED = "rgba(255,255,255,0.58)";
const HERO_IMAGES = [
  require("../assets/media/paywall/carousel-japandi-bedroom.webp"),
  require("../assets/media/paywall/carousel-luxury-marble.webp"),
  require("../assets/media/paywall/paint-intro-black-marble-salon.webp"),
] as const;
const PAYWALL_FORCE_LTR = true;

function FadeSwap({
  children,
  swapKey,
  style,
}: {
  children: ReactNode;
  swapKey: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <AnimatePresence exitBeforeEnter>
      <MotiView
        key={swapKey}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        from={{ opacity: 0 }}
        style={style}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      >
        {children}
      </MotiView>
    </AnimatePresence>
  );
}

function TrialIncludedText() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedFonts = fonts;
  return (
    <View style={styles.trialIncludedRow}>
      <Text style={[styles.trialIncludedCheck, localizedFonts.bold]}>{"✓"}</Text>
      <Text style={[styles.trialIncludedText, localizedFonts.medium]}>
        {"3 jours d'essai gratuit inclus"}
      </Text>
    </View>
  );
}

function FeatureComparisonTable() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedFonts = fonts;
  const rows = [
    {
      feature: "Rendus par jour",
      free: "1 💎",
      pro: "Illimité",
    },
    {
      feature: "Qualité d'image",
      free: "HD Standard",
      pro: "Ultra 4K",
    },
    {
      feature: "Filigrane",
      free: "Oui",
      pro: "Non",
    },
    {
      feature: "Styles de design",
      free: "5 styles",
      pro: "20+ styles",
    },
    {
      feature: "Priorité de rendu",
      free: "✕",
      pro: "✓",
    },
    {
      feature: "Sauvegarde portfolio",
      free: "3 max",
      pro: "Illimité",
    },
    {
      feature: "Partage sans filigrane",
      free: "✕",
      pro: "✓ Export propre",
    },
  ];

  return (
    <View style={styles.featureTable}>
      <View style={styles.featureTableHeader}>
        <Text style={[styles.featureTableHeaderText, styles.featureTableFeatureCell, localizedFonts.bold]}>{"FONCTIONNALITÉ"}</Text>
        <Text style={[styles.featureTableHeaderText, styles.featureTablePlanCell, localizedFonts.bold]}>{"GRATUIT"}</Text>
        <Text style={[styles.featureTableHeaderText, styles.featureTablePlanCell, styles.featureTableProHeader, localizedFonts.bold]}>{"PRO"}</Text>
      </View>
      {rows.map((row, index) => (
        <View key={row.feature} style={[styles.featureTableRow, index % 2 === 0 ? styles.featureTableRowAlt : null]}>
          <Text style={[styles.featureTableFeatureText, styles.featureTableFeatureCell, localizedFonts.medium]}>{row.feature}</Text>
          <Text style={[styles.featureTableValueText, row.free === "✕" ? styles.featureTableNoText : null, styles.featureTablePlanCell, localizedFonts.medium]}>{row.free}</Text>
          <Text style={[styles.featureTableProText, row.pro === "✓" ? styles.featureTableYesText : null, styles.featureTablePlanCell, localizedFonts.bold]}>{row.pro}</Text>
        </View>
      ))}
    </View>
  );
}

function LegalLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedFonts = fonts;
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={10}
      onPress={onPress}
      style={styles.legalLinkButton}
    >
      <Text style={[styles.legalLinkText, localizedFonts.regular]}>{label}</Text>
    </Pressable>
  );
}

function getHeroImageIndex(index: number) {
  return ((index % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length;
}

function HeroFanCarousel({
  activeIndex,
  centerWidth,
  sideWidth,
}: {
  activeIndex: number;
  centerWidth: number;
  sideWidth: number;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const leftIndex = getHeroImageIndex(activeIndex - 1);
  const centerIndex = getHeroImageIndex(activeIndex);
  const rightIndex = getHeroImageIndex(activeIndex + 1);
  const sideOffset = -Math.round(sideWidth * 0.28);

  return (
    <View style={styles.heroFan}>
      <MotiView
        key={`left-${leftIndex}-${activeIndex}`}
        animate={{ opacity: 0.74, scale: 1, translateX: 0 }}
        from={{ opacity: 0.45, scale: 0.96, translateX: -8 }}
        style={[
          styles.heroImageWrap,
          styles.heroFanSideCard,
          styles.heroFanLeftCard,
          { height: HERO_SIDE_HEIGHT, left: sideOffset, width: sideWidth },
        ]}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      >
        <Image contentFit="cover" source={HERO_IMAGES[leftIndex]} style={styles.heroImage} transition={0} />
      </MotiView>

      <MotiView
        key={`right-${rightIndex}-${activeIndex}`}
        animate={{ opacity: 0.74, scale: 1, translateX: 0 }}
        from={{ opacity: 0.45, scale: 0.96, translateX: 8 }}
        style={[
          styles.heroImageWrap,
          styles.heroFanSideCard,
          styles.heroFanRightCard,
          { height: HERO_SIDE_HEIGHT, right: sideOffset, width: sideWidth },
        ]}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      >
        <Image contentFit="cover" source={HERO_IMAGES[rightIndex]} style={styles.heroImage} transition={0} />
      </MotiView>

      <MotiView
        key={`center-${centerIndex}`}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        from={{ opacity: 0.82, scale: 0.96, translateY: 6 }}
        style={[
          styles.heroImageWrap,
          styles.heroFanCenterCard,
          { height: HERO_HEIGHT, width: centerWidth },
        ]}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      >
        <Image contentFit="cover" source={HERO_IMAGES[centerIndex]} style={styles.heroImage} transition={0} />
      </MotiView>
    </View>
  );
}

function YearlyPlanCard({
  onPress,
}: {
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedFonts = fonts;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.planCard,
        styles.yearlyCard,
        styles.yearlyCardHighlighted,
      ]}
    >
      <View style={styles.bestOfferBadge}>
        <Text style={[styles.bestOfferText, localizedFonts.bold]}>{"MEILLEURE OFFRE"}</Text>
      </View>

      <View style={styles.planRow}>
        <View style={styles.planCopy}>
          <Text style={[styles.planLabel, localizedFonts.bold]}>{"ACCÈS ANNUEL"}</Text>
          <Text style={[styles.yearlyPerWeekPriceText, localizedFonts.bold]}>{"4,78 MAD par semaine"}</Text>
          <Text style={[styles.yearlyTotalText, localizedFonts.medium]}>{"248,65 MAD facturé annuellement"}</Text>
          <Text style={[styles.yearlySavingsText, localizedFonts.medium]}>{"Économisez 90% vs hebdomadaire"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function WeeklyPlanCard({
  onPress,
}: {
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedFonts = fonts;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.planCard,
        styles.weeklyCard,
        styles.weeklyCardSecondary,
      ]}
    >
      <View style={styles.planRow}>
        <View style={styles.planCopy}>
          <Text style={[styles.weeklyPlanLabel, localizedFonts.bold]}>{"ACCÈS HEBDOMADAIRE"}</Text>
          <Text style={[styles.planPriceText, localizedFonts.bold]}>{"44,68 MAD par semaine"}</Text>
          <Text style={[styles.weeklyTrialText, localizedFonts.medium]}>{"3 jours d'essai gratuit"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PaywallCloseButton({
  onPress,
}: {
  canClose: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View pointerEvents="box-none" style={styles.closeSlot}>
      <View pointerEvents="auto" style={styles.closeBubble}>
        <Pressable accessibilityLabel="Fermer" accessibilityRole="button" hitSlop={10} onPress={onPress} style={styles.closeButtonInner}>
          <X color={PAYWALL_TEXT_PRIMARY} size={20} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

function filterPackagesByCurrency(
  packages: RevenueCatPackage[],
  currencyCode: string,
) {
  const matchingPackages = packages.filter((pkg) => pkg.product.currencyCode === currencyCode);
  return matchingPackages.length > 0 ? matchingPackages : packages;
}

export default function PaywallScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const localizedFonts = fonts;
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  const pricingContext = usePricingContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { source, redirectTo, lastImageUrl, variant } = useLocalSearchParams<{
    source?: "launch" | "design-flow" | "generate" | "download" | "share" | "second-design" | "generation-speed-up" | "post_wow";
    redirectTo?: string;
    lastImageUrl?: string;
    variant?: "soft";
  }>();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { anonymousId } = useViewerSession();
  const {
    credits,
    notificationsDeclined,
    proTipNotificationIndex,
    setOptimisticAccess,
  } = useViewerCredits();
  const { openStore } = useDiamondStore();
  const setPlan = useMutation("users:setViewerPlanFromRevenueCat" as any);
  const setProTipNotificationIndex = useMutation("users:setProTipNotificationIndex" as any);
  const { showSuccess } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const entranceProgress = useSharedValue(0);

  const canClose = true;
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const personalizedImageUrl = typeof lastImageUrl === "string" && lastImageUrl.length > 0 ? lastImageUrl : null;
  const hasPersonalizedBackground = Boolean(personalizedImageUrl);
  const isPostWowPaywall = source === "post_wow";
  const isSoftPaywall = variant === "soft" && !isPostWowPaywall;
  const isHardPaywall = source === "generate" || source === "second-design";
  const paywallTitle = "Concevez comme un pro. Liberté de création illimitée.";
  const paywallSubtitle = "Découvrez toute la puissance de l'IA architecturale avec des rendus illimités et une précision 4K.";
  const heroSideWidth = Math.min(Math.max(width * 0.3, 90), 118);
  const heroCenterWidth = Math.min(Math.max(width * 0.56, 196), 226);
  const heroRowHeight = HERO_HEIGHT;
  const yearlyPackage = useMemo(() => findRevenueCatPackage(packages, "yearly", pricingContext.revenueCat), [packages, pricingContext.revenueCat]);
  const weeklyPackage = useMemo(() => findRevenueCatPackage(packages, "weekly", pricingContext.revenueCat), [packages, pricingContext.revenueCat]);
  const cachedOfferingPackages = useMemo(
    () =>
      filterPackagesByCurrency(
        getCachedTieredPackage(pricingContext.revenueCat)?.packages ?? [],
        pricingContext.currencyCode,
      ),
    [
      pricingContext.currencyCode,
      pricingContext.revenueCat.countryCode,
      pricingContext.revenueCat.currencyCode,
      pricingContext.revenueCat.offeringHint,
      pricingContext.revenueCat.tierId,
    ],
  );
  const selectedPackage = useMemo(() => {
    if (isSoftPaywall) {
      const nextPackage = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
      return nextPackage ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
    }

    const nextPackage = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
    return nextPackage ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
  }, [isSoftPaywall, packages, selectedDuration, weeklyPackage, yearlyPackage]);

  const ctaDisabled = isLoading || !selectedPackage;
  const sheetHeight = Math.max(height - 12, 0);

  useEffect(() => {
    captureAnalytics(posthog, ANALYTICS_EVENTS.paywallViewed, {
      paywall_source: isPostWowPaywall ? "post_wow" : source ?? "unknown",
      source: source ?? "unknown",
      personalized: hasPersonalizedBackground,
    });
  }, [hasPersonalizedBackground, isPostWowPaywall, posthog, source]);

  useEffect(() => {
    entranceProgress.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [entranceProgress]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((currentIndex) => getHeroImageIndex(currentIndex + 1));
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    if (cachedOfferingPackages.length > 0) {
      setPackages(cachedOfferingPackages);
    }

    const loadOfferings = async () => {
      try {
        const cached = getRevenueCatClient();
        purchasesRef.current = cached ?? (await configureRevenueCat(isSignedIn ? user?.id ?? null : null));

        if (!active || !purchasesRef.current) {
          if (active) {
            setErrorMessage(t("paywall.subscriptionsUnavailable"));
          }
          return;
        }

        const offeringResult = await fetchTieredPackage(purchasesRef.current, pricingContext.revenueCat);
        if (!active) {
          return;
        }

        const nextPackages = filterPackagesByCurrency(
          Array.isArray(offeringResult?.packages) ? offeringResult.packages : [],
          pricingContext.currencyCode,
        );
        setPackages(nextPackages);

        setErrorMessage(null);
      } catch {
        if (active) {
          setErrorMessage(t("paywall.subscriptionsUnavailable"));
        }
      }
    };

    void loadOfferings();

    return () => {
      active = false;
    };
  }, [
    cachedOfferingPackages,
    isSignedIn,
    pricingContext.revenueCat.countryCode,
    pricingContext.revenueCat.currencyCode,
    pricingContext.revenueCat.tierId,
    t,
    user?.id,
  ]);

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
        pricingTier: pricingContext.tierId,
        pricingCountryCode: pricingContext.countryCode,
        pricingCurrencyCode: pricingContext.currencyCode,
      });
    },
    [anonymousId, pricingContext.countryCode, pricingContext.currencyCode, pricingContext.tierId, setPlan],
  );

  const schedulePurchasedProTip = useCallback(() => {
    void scheduleOrUpdateProTip({
      notificationsDeclined,
      proTipNotificationIndex,
      persistNextTipIndex: async (nextIndex) => {
        await setProTipNotificationIndex({ anonymousId: anonymousId ?? undefined, nextIndex });
      },
    });
  }, [anonymousId, notificationsDeclined, proTipNotificationIndex, setProTipNotificationIndex]);

  const prepareSkippedPaywallClaim = useCallback(async () => undefined, []);

  const closePaywall = useCallback(() => {
    if (source === "launch") {
      dismissLaunchPaywall();
    } else {
      void persistHasDismissedPaywall();
    }

    router.replace(TOOLS_ROUTE as any);
  }, [router, source]);

  const completePaywall = useCallback(() => {
    void persistHasDismissedPaywall();

    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(resolveSafeRoute(redirectTo, TOOLS_ROUTE) as any);
      return;
    }

    router.replace(TOOLS_ROUTE as any);
  }, [redirectTo, router]);

  const handleClose = useCallback(async () => {
    if (!canClose || isLoading) {
      return;
    }

    triggerHaptic();
    if (isHardPaywall) {
      router.back();
      return;
    }

    void persistHasDismissedPaywall();
    await prepareSkippedPaywallClaim();
    if (source === "post_wow") {
      captureAnalytics(posthog, "paywall_declined", {
        paywall_source: "post_wow",
      });
      router.replace(TOOLS_ROUTE as any);
      return;
    }

    closePaywall();

    if (source === "launch" && credits <= 0) {
      setTimeout(() => openStore("empty_balance"), 250);
    }
  }, [canClose, closePaywall, credits, isHardPaywall, isLoading, openStore, posthog, prepareSkippedPaywallClaim, router, source]);

  const handleRestore = useCallback(async () => {
    triggerHaptic();
    setErrorMessage(null);

    try {
      if (!purchasesRef.current) {
        Alert.alert(t("paywall.restoreFailed"), t("settings.messages.subscriptionsUnavailable"));
        return;
      }

      setIsLoading(true);
      const info = await purchasesRef.current.restorePurchases();
      if (!info || !hasActiveSubscription(info)) {
        Alert.alert(t("paywall.restored"), t("paywall.noActiveSubscriptions"));
        return;
      }

      const subscriptionState = resolveRevenueCatSubscription(info);

      if (subscriptionState.plan === "free" || subscriptionState.subscriptionType === "free") {
        Alert.alert(t("paywall.restored"), t("paywall.noActiveSubscriptions"));
        return;
      }

      await persistPurchasedPlan(
        subscriptionState.plan,
        subscriptionState.subscriptionType,
        subscriptionState.entitlement,
        subscriptionState.purchasedAt,
        subscriptionState.subscriptionEnd,
      );
      setOptimisticAccess({
        credits: getGenerationLimit(subscriptionState.subscriptionType),
        hasPaidAccess: subscriptionState.plan === "pro" || subscriptionState.plan === "trial",
        hasProAccess: subscriptionState.plan === "pro" || subscriptionState.plan === "trial",
        subscriptionType: subscriptionState.subscriptionType,
      });
      if (subscriptionState.plan === "trial") {
        captureAnalytics(posthog, ANALYTICS_EVENTS.trialStarted, {
          type: subscriptionState.subscriptionType,
          packageIdentifier: selectedPackage.identifier,
        });
      }
      showSuccess();
      schedulePurchasedProTip();
      completePaywall();
    } catch (error) {
      Alert.alert(t("paywall.restoreFailed"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    } finally {
      setIsLoading(false);
    }
  }, [completePaywall, persistPurchasedPlan, schedulePurchasedProTip, setOptimisticAccess, showSuccess]);

  const handlePurchase = useCallback(async (
    packageOverride?: RevenueCatPackage | null,
    durationOverride?: BillingDuration,
  ) => {
    triggerHaptic();
    void persistHasDismissedPaywall();
    setErrorMessage(null);

    const packageToPurchase = packageOverride ?? selectedPackage;

    if (!packageToPurchase) {
      const message = t("paywall.planUnavailable");
      setErrorMessage(message);
      Alert.alert(t("paywall.purchaseError"), message);
      return;
    }

    try {
      if (!purchasesRef.current) {
        Alert.alert(t("paywall.purchaseError"), t("settings.messages.subscriptionsUnavailable"));
        return;
      }

      setIsLoading(true);
      const result = await purchasesRef.current.purchasePackage(packageToPurchase);
      const customerInfo = result?.customerInfo;
      if (!customerInfo || !hasActiveSubscription(customerInfo)) {
        throw new Error(t("paywall.subscriptionConfirmFailed"));
      }

      const subscriptionState = resolveRevenueCatSubscription(customerInfo);
      if (subscriptionState.plan === "free" || subscriptionState.subscriptionType === "free") {
        throw new Error(t("paywall.subscriptionConfirmFailed"));
      }

      await persistPurchasedPlan(
        subscriptionState.plan,
        subscriptionState.subscriptionType,
        subscriptionState.entitlement,
        subscriptionState.purchasedAt,
        subscriptionState.subscriptionEnd,
      );
      setOptimisticAccess({
        credits: getGenerationLimit(subscriptionState.subscriptionType),
        hasPaidAccess: subscriptionState.plan === "pro" || subscriptionState.plan === "trial",
        hasProAccess: subscriptionState.plan === "pro" || subscriptionState.plan === "trial",
        subscriptionType: subscriptionState.subscriptionType,
      });
      captureAnalytics(posthog, ANALYTICS_EVENTS.planSelected, {
        type: durationOverride ?? subscriptionState.subscriptionType,
        packageIdentifier: packageToPurchase.identifier,
        paywall_source: isPostWowPaywall ? "post_wow" : source ?? "unknown",
      });
      showSuccess();
      schedulePurchasedProTip();
      completePaywall();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("paywall.purchaseCancelled");
      setErrorMessage(message);
      Alert.alert(t("paywall.purchaseError"), message);
    } finally {
      setIsLoading(false);
    }
  }, [completePaywall, isPostWowPaywall, persistPurchasedPlan, posthog, schedulePurchasedProTip, selectedPackage, setOptimisticAccess, showSuccess, source, t]);

  const handleSelectYearly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("yearly");
    captureAnalytics(posthog, ANALYTICS_EVENTS.planSelected, {
      type: "yearly",
      paywall_source: isPostWowPaywall ? "post_wow" : source ?? "unknown",
    });
    if (isSoftPaywall) {
      void handlePurchase(yearlyPackage ?? selectedPackage, "yearly");
    }
  }, [handlePurchase, isLoading, isPostWowPaywall, isSoftPaywall, posthog, selectedPackage, source, yearlyPackage]);

  const handleSelectWeekly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("weekly");
    captureAnalytics(posthog, ANALYTICS_EVENTS.planSelected, {
      type: !isPostWowPaywall ? "weekly_trial" : "weekly",
      paywall_source: isPostWowPaywall ? "post_wow" : source ?? "unknown",
    });
    if (isSoftPaywall) {
      void handlePurchase(weeklyPackage ?? selectedPackage, "weekly");
    }
  }, [handlePurchase, isLoading, isPostWowPaywall, isSoftPaywall, posthog, selectedPackage, source, weeklyPackage]);

  const ctaButtonText = "Commencer — 3 jours gratuits →";

  const handleSkipPostWowPaywall = useCallback(async () => {
    triggerHaptic();
    void persistHasDismissedPaywall();
    captureAnalytics(posthog, "paywall_skipped", {
      paywall_source: "post_wow",
    });
    await prepareSkippedPaywallClaim();
    router.replace("/(tabs)" as any);
  }, [posthog, prepareSkippedPaywallClaim, router]);

  const handleOpenTerms = useCallback(() => {
    triggerHaptic();
    router.push({ pathname: "/legal-viewer", params: { document: "terms" } } as never);
  }, [router]);

  const handleOpenPrivacy = useCallback(() => {
    triggerHaptic();
    router.push({ pathname: "/legal-viewer", params: { document: "privacy" } } as never);
  }, [router]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: (1 - entranceProgress.value) * 56,
      },
    ],
  }));

  if (isSoftPaywall) {
    return (
      <View style={styles.softScreen}>
        <Stack.Screen
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            contentStyle: { backgroundColor: "transparent" },
            gestureEnabled: true,
          }}
        />
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <View style={styles.softBackdrop} />
        <Animated.View style={[styles.softSheet, { paddingBottom: Math.max(insets.bottom + 12, 20) }, sheetAnimatedStyle]}>
          <View style={styles.softHandle} />
          <Text style={[styles.softEyebrow, localizedFonts.bold]}>{"MEILLEURE OFFRE"}</Text>
          <Text style={[styles.softTitle, localizedFonts.bold]}>{"Débloquez Darkor Pro"}</Text>
          <Text style={[styles.softSubtitle, localizedFonts.medium]}>
            {"Créez des rendus illimités en qualité 4K avec 3 jours d'essai gratuit."}
          </Text>

          <View style={styles.softPlanStack}>
            <YearlyPlanCard
              onPress={handleSelectYearly}
            />
            <WeeklyPlanCard
              onPress={handleSelectWeekly}
            />
          </View>

          {isLoading ? (
            <View style={styles.softLoadingRow}>
              <ActivityIndicator color={theme.textPrimary} />
              <Text style={[styles.softLoadingText, localizedFonts.medium]}>{"Traitement..."}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <Text style={[styles.errorText, localizedFonts.medium, { textAlign: "center" }]}>{errorMessage}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            hitSlop={12}
            onPress={handleSkipPostWowPaywall}
            style={styles.softSkipLink}
          >
            <Text style={[styles.softSkipText, localizedFonts.medium]}>{"Continuer sans Pro"}</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          presentation: "fullScreenModal",
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: PAYWALL_BLACK },
          gestureEnabled: false,
        }}
      />
      <StatusBar style="light" />
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, overlayAnimatedStyle]}
      />

      <Animated.View style={[styles.sheet, { minHeight: sheetHeight }, sheetAnimatedStyle]}>
        <PaywallCloseButton
          canClose={canClose}
          onPress={handleClose}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          hitSlop={12}
          onPress={() => void handleRestore()}
          style={[styles.restoreTopButton, { top: Math.max(insets.top + 10, 40) }]}
        >
          <Text style={[styles.restoreText, localizedFonts.medium]}>{"Restaurer"}</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 }]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroClip, { height: heroRowHeight }]}>
            <HeroFanCarousel
              activeIndex={heroIndex}
              centerWidth={heroCenterWidth}
              sideWidth={heroSideWidth}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", PAYWALL_BLACK]}
              pointerEvents="none"
              style={styles.heroBottomFade}
            />
          </View>

          <View style={[styles.titleSection, { alignItems: getDirectionalAlignment(isRTL) }]}>
            <Text style={[styles.titleText, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{paywallTitle}</Text>
            <Text style={[styles.subtitleText, hasPersonalizedBackground ? styles.personalizedSubtitleText : null, localizedFonts.regular, { textAlign: getDirectionalTextAlign(isRTL) }]}>{paywallSubtitle}</Text>
          </View>

          <FeatureComparisonTable />

          <TrialIncludedText />

          <View style={styles.yearlyWrapper}>
            <YearlyPlanCard
              onPress={handleSelectYearly}
            />
          </View>

          <View style={styles.weeklyWrapper}>
            <WeeklyPlanCard
              onPress={handleSelectWeekly}
            />
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{errorMessage}</Text>
          ) : null}

          <Pressable accessibilityRole="button" disabled={ctaDisabled} onPress={() => void handlePurchase()} style={[styles.ctaButton, ctaDisabled ? styles.ctaButtonDisabled : null]}>
            <LinearGradient
              colors={[PAYWALL_ACCENT, PAYWALL_ACCENT_DARK]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.ctaGradient}
            >
            {isLoading ? (
              <View style={styles.ctaLoadingRow}>
                <ActivityIndicator color={theme.textInverse} />
              </View>
            ) : (
              <FadeSwap swapKey={ctaButtonText} style={styles.ctaContent}>
                <View style={styles.ctaLabelRow}>
                  <Text style={[styles.ctaText, localizedFonts.bold]}>{ctaButtonText}</Text>
                </View>
              </FadeSwap>
            )}
            </LinearGradient>
          </Pressable>
          <Text style={[styles.ctaFinePrintText, localizedFonts.regular]}>
            {"Aucun frais pendant 3 jours · Annulez à tout moment"}
          </Text>

          <View style={[styles.legalFooter, { paddingBottom: Math.max(insets.bottom, 4) }]}>
            <View style={styles.legalLinksRow}>
              <LegalLink label="Conditions" onPress={handleOpenTerms} />
              <LegalLink label="Confidentialité" onPress={handleOpenPrivacy} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAYWALL_BLACK,
  },
  softScreen: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  softBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  softSheet: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    paddingTop: 10,
    paddingHorizontal: 18,
    gap: 12,
  },
  softHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    marginBottom: 6,
  },
  softEyebrow: {
    alignSelf: "center",
    color: theme.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  softTitle: {
    color: theme.textPrimary,
    fontSize: 26,
    lineHeight: 31,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  softSubtitle: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  softPlanStack: {
    gap: 10,
    paddingTop: 4,
  },
  softLoadingRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  softLoadingText: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 18,
  },
  softSkipLink: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  softSkipText: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  personalizedBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  personalizedBackgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PAYWALL_BLACK,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PAYWALL_BLACK,
  },
  personalizedAnimatedOverlay: {
    backgroundColor: PAYWALL_BLACK,
  },
  sheet: {
    flex: 1,
    position: "relative",
    backgroundColor: PAYWALL_BLACK,
  },
  personalizedSheet: {
    backgroundColor: PAYWALL_BLACK,
  },
  restoreTopButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    minHeight: 30,
    justifyContent: "center",
  },
  restoreText: {
    color: PAYWALL_TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  closeSlot: {
    position: "absolute",
    top: 44,
    right: 20,
    zIndex: 10,
    width: CLOSE_VISUAL_SIZE,
    height: CLOSE_VISUAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBubble: {
    width: CLOSE_VISUAL_SIZE,
    height: CLOSE_VISUAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CLOSE_VISUAL_SIZE / 2,
    backgroundColor: "rgba(0, 0, 0, 0.50)",
  },
  closeButtonInner: {
    width: CLOSE_VISUAL_SIZE,
    height: CLOSE_VISUAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CLOSE_VISUAL_SIZE / 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    backgroundColor: PAYWALL_BLACK,
  },
  heroClip: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
    backgroundColor: PAYWALL_BLACK,
  },
  heroFan: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: PAYWALL_CARD_BG,
    boxShadow: `0px 8px 18px ${theme.shadow}`,
  },
  heroFanSideCard: {
    position: "absolute",
    top: 18,
    zIndex: 1,
  },
  heroFanLeftCard: {
    transform: [{ rotate: "-5deg" }],
  },
  heroFanRightCard: {
    transform: [{ rotate: "5deg" }],
  },
  heroFanCenterCard: {
    zIndex: 2,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroBottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  titleSection: {
    marginHorizontal: 20,
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  subtitleText: {
    maxWidth: 390,
    color: PAYWALL_TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "left",
    letterSpacing: 0,
    ...fonts.regular,
  },
  personalizedSubtitleText: {
    maxWidth: 390,
    color: PAYWALL_TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 20,
  },
  titleText: {
    color: PAYWALL_TEXT_PRIMARY,
    fontSize: 23,
    lineHeight: 27,
    textAlign: "left",
    flexShrink: 1,
    letterSpacing: 0,
    ...fonts.bold,
    fontWeight: "800",
  },
  featureTable: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: PAYWALL_BORDER,
    backgroundColor: PAYWALL_CARD_BG,
    overflow: "hidden",
  },
  featureTableHeader: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  featureTableRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  featureTableRowAlt: {
    backgroundColor: PAYWALL_CARD_BG_ALT,
  },
  featureTableFeatureCell: {
    flex: 1.42,
    minWidth: 0,
    paddingRight: 8,
  },
  featureTablePlanCell: {
    flex: 0.72,
    minWidth: 0,
    textAlign: "center",
  },
  featureTableHeaderText: {
    color: PAYWALL_TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  featureTableProHeader: {
    color: PAYWALL_ACCENT,
    fontWeight: "700",
  },
  featureTableFeatureText: {
    color: PAYWALL_TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
  },
  featureTableValueText: {
    color: PAYWALL_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  featureTableProText: {
    color: PAYWALL_TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  featureTableNoText: {
    color: PAYWALL_TEXT_MUTED,
  },
  featureTableYesText: {
    color: PAYWALL_ACCENT,
  },
  yearlyWrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  weeklyWrapper: {
    marginTop: 0,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  diamondStoreButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceMuted,
  },
  diamondStoreText: {
    color: theme.textPrimary,
    fontSize: 15,
    lineHeight: 18,
  },
  planCard: {
    minHeight: 70,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: PAYWALL_CARD_BG,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "center",
  },
  planGradientBorder: {
    borderRadius: 18,
    padding: 1.5,
  },
  planCardSurface: {
    borderWidth: 0,
  },
  yearlyCard: {
    minHeight: 90,
    paddingTop: 18,
    paddingBottom: 10,
  },
  weeklyCard: {
    minHeight: 66,
  },
  yearlyCardHighlighted: {
    borderWidth: 1.5,
    borderColor: PAYWALL_ACCENT,
    backgroundColor: PAYWALL_CARD_BG,
  },
  weeklyCardSecondary: {
    borderWidth: 0.5,
    borderColor: PAYWALL_BORDER,
    backgroundColor: PAYWALL_CARD_BG,
  },
  bestOfferBadge: {
    position: "absolute",
    top: 8,
    right: 14,
    borderRadius: 999,
    backgroundColor: PAYWALL_ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestOfferText: {
    color: theme.textInverse,
    fontSize: 10,
    lineHeight: 12,
    textTransform: "uppercase",
    ...fonts.bold,
    fontWeight: "700",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  forcedLtrRow: {
    direction: "ltr",
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  planPriceColumn: {
    width: 112,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 12,
  },
  forcedLtrPriceColumn: {
    alignItems: "flex-start",
    marginLeft: 12,
    direction: "ltr",
    width: 132,
  },
  planLabel: {
    color: PAYWALL_TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    ...fonts.bold,
    fontWeight: "700",
  },
  weeklyPlanLabel: {
    color: PAYWALL_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    ...fonts.bold,
    fontWeight: "700",
  },
  planSubtext: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    ...fonts.regular,
  },
  planPriceText: {
    marginTop: 5,
    color: PAYWALL_TEXT_PRIMARY,
    fontSize: 17,
    lineHeight: 21,
    ...fonts.bold,
    fontWeight: "700",
  },
  yearlyPerWeekPriceText: {
    marginTop: 6,
    color: PAYWALL_TEXT_PRIMARY,
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
    fontWeight: "800",
  },
  yearlyTotalText: {
    marginTop: 3,
    color: PAYWALL_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  yearlySavingsText: {
    marginTop: 3,
    color: "#4CAF50",
    fontSize: 11,
    lineHeight: 14,
    ...fonts.medium,
  },
  yearlyPrice: {
    color: theme.textPrimary,
    fontSize: 17,
    lineHeight: 21,
    ...fonts.bold,
  },
  weeklyTrialPrice: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 17,
    flexShrink: 1,
    ...fonts.bold,
  },
  weeklyPrice: {
    color: theme.textPrimary,
    fontSize: 15,
    lineHeight: 18,
    ...fonts.bold,
  },
  trialBadge: {
    minHeight: 24,
    marginTop: 6,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: PAYWALL_ACCENT,
  },
  trialBadgeText: {
    color: theme.textInverse,
    fontSize: 12,
    lineHeight: 14,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  weeklyTrialText: {
    marginTop: 4,
    alignSelf: "flex-start",
    color: PAYWALL_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 14,
    ...fonts.medium,
  },
  noPaymentRow: {
    marginTop: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 6,
  },
  cancelAnytimeRow: {
    marginTop: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 6,
  },
  noticeText: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    textAlign: "left",
    color: theme.error,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  trialIncludedRow: {
    minHeight: 18,
    marginTop: 0,
    marginBottom: 12,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  trialIncludedCheck: {
    color: "#4CAF50",
    fontSize: 12,
    lineHeight: 16,
    ...fonts.bold,
  },
  trialIncludedText: {
    color: "#4CAF50",
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
    fontWeight: "500",
  },
  ctaButton: {
    height: 46,
    marginTop: 0,
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: `0px 5px 14px ${PAYWALL_ACCENT_SHADOW}`,
    overflow: "visible",
  },
  ctaGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  ctaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  ctaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  ctaText: {
    color: theme.textInverse,
    fontSize: 15,
    lineHeight: 19,
    ...fonts.bold,
    fontWeight: "700",
  },
  ctaFinePrintText: {
    marginHorizontal: 20,
    marginBottom: 12,
    color: PAYWALL_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    ...fonts.regular,
  },
  ctaArrow: {
    marginHorizontal: 8,
    color: "transparent",
    fontSize: 1,
    lineHeight: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
    width: 0,
    display: "none",
    ...fonts.bold,
  },
  ctaArrowVisual: {
    marginLeft: 8,
    color: theme.textInverse,
    fontSize: 18,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
    ...fonts.bold,
    display: "none",
  },
  ctaAnimatedArrow: {
    marginLeft: 10,
    fontSize: 22,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: "center",
    display: "none",
    ...fonts.bold,
  },
  legalFooter: {
    marginTop: 0,
    marginHorizontal: 20,
    paddingTop: 0,
    alignItems: "center",
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  legalLinkButton: {
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  legalLinkText: {
    color: PAYWALL_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: "underline",
    ...fonts.medium,
  },
  });
}


