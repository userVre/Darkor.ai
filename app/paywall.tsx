import {Check, X} from "@/components/material-icons";
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
Animated as NativeAnimated,
Pressable,
ScrollView,
StyleSheet,
Text,
View,
useWindowDimensions,
type NativeScrollEvent,
type NativeSyntheticEvent,
type StyleProp,
type ViewStyle,
} from "react-native";
import Animated, {
Easing,
useAnimatedProps,
useAnimatedStyle,
useSharedValue,
withTiming,
type SharedValue,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {Circle as SvgCircle} from "react-native-svg";
import {createLocalizedPrice, usePricingContext, type LocalizedPrice} from "../lib/dynamic-pricing";
import {ANALYTICS_EVENTS, captureAnalytics} from "../lib/analytics";

import {useProSuccess} from "../components/pro-success-context";
import {useDiamondStore} from "../components/diamond-store-context";
import {NeonArrowDown} from "../components/paywall/AnimatedArrow";
import {useElitePassModal} from "../components/elite-pass-context";
import {useViewerCredits} from "../components/viewer-credits-context";
import {useViewerSession} from "../components/viewer-session-context";
import {getGenerationLimit} from "../convex/subscriptions";
import {triggerHaptic} from "../lib/haptics";
import {useLocalizedAppFonts} from "../lib/i18n";
import {scheduleOrUpdateProTip} from "../lib/notifications";
import {
getDirectionalAlignment,
getDirectionalRow,
getDirectionalTextAlign,
} from "../lib/i18n/rtl";
import {dismissLaunchPaywall} from "../lib/launch-paywall";
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
import {fonts} from "../styles/typography";

const SCREEN_BG = "#0D0D0D";
const PANEL_BG_ALT = "#1C1C1C";
const PANEL_BORDER = "#323232";
const BRAND_RED = "#E83A5A";
const BRAND_RED_ACTIVE = "#FF6B9D";
const CTA_DEEP_RED = "#C0254A";
const TOGGLE_OFF = "#3A3A3A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.72)";
const TEXT_RESTORE = "rgba(255,255,255,0.88)";
const TEXT_ACCENT = "#FFFFFF";
const CTA_TEXT = "#FFFFFF";
const ERROR_TEXT = "#FF6B66";
const RUBY_BADGE = "#E83A5A";
const RUBY_BADGE_BORDER = "#FF6B9D";
const TRANSITION_DURATION_MS = 200;
const CAROUSEL_INTERVAL_MS = 3000;
const CLOSE_DELAY_MS = 5000;
const CLOSE_VISUAL_SIZE = 40;
const CLOSE_RING_RADIUS = 15;
const CLOSE_RING_STROKE_WIDTH = 2.5;
const CLOSE_RING_CIRCUMFERENCE = 2 * Math.PI * CLOSE_RING_RADIUS;
const HERO_CENTER_SIZE = 196;
const HERO_SIDE_WIDTH = 184;
const HERO_SIDE_HEIGHT = 188;
const HERO_SIDE_RENDERED_WIDTH = 174;
const HERO_IMAGE_GAP = 10;
const HERO_SIDE_SCALE = 0.92;
const HERO_ACTIVE_SCALE = 1.05;
const HERO_SIDE_TRANSLATE_Y = 12;
const HERO_SNAP_INTERVAL = HERO_CENTER_SIZE / 2 + HERO_IMAGE_GAP + HERO_SIDE_RENDERED_WIDTH / 2;
const HERO_CAROUSEL_REPEAT_MULTIPLIER = 7;
const HERO_IMAGES = [
  require("../assets/media/paywall/carousel-gaming-led.png"),
  require("../assets/media/paywall/carousel-luxury-marble.png"),
  require("../assets/media/paywall/carousel-japandi-bedroom.png"),
] as const;
const HERO_CAROUSEL_DATA = Array.from({ length: HERO_IMAGES.length * HERO_CAROUSEL_REPEAT_MULTIPLIER }, (_, index) => ({
  id: `hero-${index}`,
  image: HERO_IMAGES[index % HERO_IMAGES.length],
}));
const HERO_CAROUSEL_INITIAL_INDEX = HERO_IMAGES.length * Math.floor(HERO_CAROUSEL_REPEAT_MULTIPLIER / 2);
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
const PAYWALL_FORCE_LTR = true;
const FORCED_LTR_TEXT_STYLE = {
  textAlign: "left" as const,
  writingDirection: "ltr" as const,
};

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

function FeatureRow({ label, isLast }: { label: string; isLast: boolean }) {
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  return (
    <View style={[styles.featureRow, !isLast ? styles.featureRowGap : null, { flexDirection: getDirectionalRow(isRTL) }]}>
      <View style={styles.featureIcon}>
        <Check color={BRAND_RED} size={18} strokeWidth={3} />
      </View>
      <Text style={[styles.featureText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{label}</Text>
    </View>
  );
}

function ToggleSwitch({ value }: { value: boolean }) {
  return (
    <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : styles.toggleTrackOff]}>
      <MotiView
        animate={{ translateX: value ? 18 : 0 }}
        style={styles.toggleThumb}
        transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
      />
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
  const localizedFonts = useLocalizedAppFonts();
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

function HeroCarouselItem({
  image,
  index,
  scrollX,
  sideScale,
  snapInterval,
}: {
  image: (typeof HERO_IMAGES)[number];
  index: number;
  scrollX: NativeAnimated.Value;
  sideScale: number;
  snapInterval: number;
}) {
  const inputRange = [
    (index - 1) * snapInterval,
    index * snapInterval,
    (index + 1) * snapInterval,
  ];
  const animatedStyle = {
    width: scrollX.interpolate({
      inputRange,
      outputRange: [HERO_SIDE_WIDTH, HERO_CENTER_SIZE, HERO_SIDE_WIDTH],
      extrapolate: "clamp",
    }),
    height: scrollX.interpolate({
      inputRange,
      outputRange: [HERO_SIDE_HEIGHT, HERO_CENTER_SIZE, HERO_SIDE_HEIGHT],
      extrapolate: "clamp",
    }),
    opacity: scrollX.interpolate({
      inputRange,
      outputRange: [0.68, 1, 0.68],
      extrapolate: "clamp",
    }),
    transform: [
      {
        translateY: scrollX.interpolate({
          inputRange,
          outputRange: [HERO_SIDE_TRANSLATE_Y, 0, HERO_SIDE_TRANSLATE_Y],
          extrapolate: "clamp",
        }),
      },
      {
        scale: scrollX.interpolate({
          inputRange,
          outputRange: [sideScale, HERO_ACTIVE_SCALE, sideScale],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  return (
    <View style={[styles.heroItemSlot, { width: snapInterval, height: HERO_SIDE_HEIGHT + HERO_SIDE_TRANSLATE_Y }]}>
      <NativeAnimated.View style={[styles.heroImageWrap, animatedStyle]}>
        <Image contentFit="cover" source={image} style={styles.heroImage} transition={0} />
      </NativeAnimated.View>
    </View>
  );
}

function YearlyPlanCard({
  priceText,
  selected,
  onPress,
}: {
  priceText: string;
  selected: boolean;
  onPress: () => void;
}) {
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  return (
    <LinearGradient
      colors={[BRAND_RED, BRAND_RED_ACTIVE]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.planGradientBorder, selected ? styles.planCardGlow : null]}
    >
      <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, styles.planCardSurface, styles.yearlyCard]}>
        <View style={styles.bestOfferBadge}>
          <Text style={[styles.bestOfferText, localizedFonts.bold]}>BEST OFFER</Text>
        </View>

        <View style={[styles.planRow, styles.forcedLtrRow, { flexDirection: getDirectionalRow(isRTL) }]}>
          <View style={styles.planCopy}>
            <Text style={[styles.planLabel, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>YEARLY ACCESS</Text>
            <Text style={[styles.planPriceText, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{priceText}</Text>
          </View>
        </View>
      </Pressable>
    </LinearGradient>
  );
}

function WeeklyPlanCard({
  priceText,
  selected,
  onPress,
}: {
  priceText: string;
  selected: boolean;
  onPress: () => void;
}) {
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  return (
    <LinearGradient
      colors={selected ? [BRAND_RED, BRAND_RED_ACTIVE] : ["rgba(232, 58, 90, 0.62)", "rgba(0, 180, 255, 0.32)"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.planGradientBorder, selected ? styles.planCardGlow : styles.planCardQuietGlow]}
    >
      <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, styles.planCardSurface, styles.weeklyCard]}>
        <View style={[styles.planRow, styles.forcedLtrRow, { flexDirection: getDirectionalRow(isRTL) }]}>
          <View style={styles.planCopy}>
            <Text style={[styles.planLabel, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>WEEKLY ACCESS</Text>
            <Text style={[styles.planPriceText, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{priceText}</Text>
          </View>
        </View>
      </Pressable>
    </LinearGradient>
  );
}

function CountdownCloseButton({
  canClose,
  onPress,
  progress,
  secondsLeft,
}: {
  canClose: boolean;
  onPress: () => void;
  progress: SharedValue<number>;
  secondsLeft: number;
}) {
  const { t } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: CLOSE_RING_CIRCUMFERENCE * progress.value,
  }));

  return (
    <View pointerEvents="box-none" style={styles.closeSlot}>
      <AnimatePresence exitBeforeEnter>
        <MotiView
          key={canClose ? "close-ready" : "close-countdown"}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          from={{ opacity: 0 }}
          style={styles.closeBubble}
          transition={{ type: "timing", duration: TRANSITION_DURATION_MS }}
        >
          {canClose ? (
            <Pressable accessibilityLabel={t("paywall.closeA11y")} accessibilityRole="button" hitSlop={10} onPress={onPress} style={styles.closeButtonInner}>
              <X color={TEXT_PRIMARY} size={20} strokeWidth={2.4} />
            </Pressable>
          ) : (
            <View pointerEvents="none" style={styles.countdownWrap}>
              <Svg height={CLOSE_VISUAL_SIZE} style={styles.countdownRing} width={CLOSE_VISUAL_SIZE}>
                <SvgCircle
                  cx={CLOSE_VISUAL_SIZE / 2}
                  cy={CLOSE_VISUAL_SIZE / 2}
                  fill="none"
                  r={CLOSE_RING_RADIUS}
                  stroke={PANEL_BORDER}
                  strokeWidth={CLOSE_RING_STROKE_WIDTH}
                />
                <AnimatedSvgCircle
                  animatedProps={animatedRingProps}
                  cx={CLOSE_VISUAL_SIZE / 2}
                  cy={CLOSE_VISUAL_SIZE / 2}
                  fill="none"
                  r={CLOSE_RING_RADIUS}
                  rotation="-90"
                  originX={CLOSE_VISUAL_SIZE / 2}
                  originY={CLOSE_VISUAL_SIZE / 2}
                  stroke={TEXT_PRIMARY}
                  strokeDasharray={CLOSE_RING_CIRCUMFERENCE}
                  strokeLinecap="round"
                  strokeWidth={CLOSE_RING_STROKE_WIDTH}
                />
              </Svg>
              <Text style={[styles.countdownText, localizedFonts.bold]}>{Math.max(secondsLeft, 1)}</Text>
            </View>
          )}
        </MotiView>
      </AnimatePresence>
    </View>
  );
}

function normalizeCarouselIndex(index: number) {
  const cycleIndex = ((index % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length;
  return HERO_CAROUSEL_INITIAL_INDEX + cycleIndex;
}

function getDisplayedPrice(
  fallbackPrice: LocalizedPrice,
  locale: string,
  preferredCurrencyCode?: string,
  pkg?: RevenueCatPackage | null,
) {
  const productPrice = pkg?.product?.price;
  const productCurrencyCode = pkg?.product?.currencyCode;
  const localizedPriceString = String((pkg?.product as { localizedPriceString?: string } | undefined)?.localizedPriceString ?? "").trim();
  const forcePreferredCurrencyFormatting = preferredCurrencyCode === "MAD";
  const storeCurrencyMatches = !preferredCurrencyCode || productCurrencyCode === preferredCurrencyCode;

  if (localizedPriceString.length > 0 && storeCurrencyMatches && !forcePreferredCurrencyFormatting) {
    return {
      amount:
        typeof productPrice === "number" && Number.isFinite(productPrice)
          ? Number(productPrice.toFixed(fallbackPrice.fractionDigits))
          : fallbackPrice.amount,
      currencyCode: productCurrencyCode || fallbackPrice.currencyCode,
      formatted: localizedPriceString.replace(/\s+/g, " ").trim(),
      fractionDigits: fallbackPrice.fractionDigits,
      source: "store" as const,
    };
  }

  if (
    typeof productPrice !== "number"
    || !Number.isFinite(productPrice)
    || !productCurrencyCode
    || (preferredCurrencyCode != null && productCurrencyCode !== preferredCurrencyCode)
  ) {
    return fallbackPrice;
  }

  return createLocalizedPrice({
    amount: productPrice,
    currencyCode: productCurrencyCode,
    locale,
    source: "store",
  });
}

function getDisplayedYearlyPerWeekPrice(
  locale: string,
  yearlyPrice: LocalizedPrice,
  preferredCurrencyCode?: string,
  pkg?: RevenueCatPackage | null,
) {
  const productPricePerWeek = pkg?.product?.pricePerWeek;
  const productCurrencyCode = pkg?.product?.currencyCode ?? yearlyPrice.currencyCode;
  const shouldPreferFallback =
    (preferredCurrencyCode != null && yearlyPrice.currencyCode === preferredCurrencyCode)
    || preferredCurrencyCode === "MAD";

  if (!shouldPreferFallback && typeof productPricePerWeek === "number" && Number.isFinite(productPricePerWeek) && productCurrencyCode) {
    return createLocalizedPrice({
      amount: productPricePerWeek,
      currencyCode: productCurrencyCode,
      locale,
      source: "store",
    });
  }

  return createLocalizedPrice({
    amount: yearlyPrice.amount / 52,
    currencyCode: yearlyPrice.currencyCode,
    locale,
    source: yearlyPrice.source,
  });
}

function filterPackagesByCurrency(
  packages: RevenueCatPackage[],
  currencyCode: string,
) {
  const matchingPackages = packages.filter((pkg) => pkg.product.currencyCode === currencyCode);
  return matchingPackages.length > 0 ? matchingPackages : packages;
}

export default function PaywallScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
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
  const { credits, hasPaidAccess, notificationsDeclined, proTipNotificationIndex, setOptimisticAccess } = useViewerCredits();
  const { openStore } = useDiamondStore();
  const { openElitePass } = useElitePassModal();
  const setPlan = useMutation("users:setViewerPlanFromRevenueCat" as any);
  const setProTipNotificationIndex = useMutation("users:setProTipNotificationIndex" as any);
  const { showSuccess } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);
  const carouselRef = useRef<ScrollView | null>(null);
  const carouselIndexRef = useRef(HERO_CAROUSEL_INITIAL_INDEX);
  const isCarouselDraggingRef = useRef(false);
  const entranceProgress = useSharedValue(0);
  const carouselScrollX = useRef(new NativeAnimated.Value(0)).current;
  const closeCountdownProgress = useSharedValue(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [canClose, setCanClose] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const personalizedImageUrl = typeof lastImageUrl === "string" && lastImageUrl.length > 0 ? lastImageUrl : null;
  const hasPersonalizedBackground = Boolean(personalizedImageUrl);
  const isPostWowPaywall = source === "post_wow" || variant === "soft";
  const paywallTitle = "Unlock Infinite Magic! ✨";
  const paywallSubtitle = "Experience the full power of AI. Limitless creations, 4K precision, and zero wait times.";
  const heroSnapInterval = HERO_SNAP_INTERVAL;
  const heroTrackPadding = Math.max((width - heroSnapInterval) / 2, 0);
  const heroRowHeight = 220;
  const yearlyPackage = useMemo(() => findRevenueCatPackage(packages, "yearly", pricingContext.revenueCat), [packages, pricingContext.revenueCat]);
  const weeklyPackage = useMemo(() => findRevenueCatPackage(packages, "weekly", pricingContext.revenueCat), [packages, pricingContext.revenueCat]);
  const displayedYearlyPrice = useMemo(
    () => getDisplayedPrice(pricingContext.prices.yearly, pricingContext.locale, pricingContext.currencyCode, yearlyPackage),
    [pricingContext.currencyCode, pricingContext.locale, pricingContext.prices.yearly, yearlyPackage],
  );
  const displayedWeeklyPrice = useMemo(
    () => getDisplayedPrice(pricingContext.prices.weekly, pricingContext.locale, pricingContext.currencyCode, weeklyPackage),
    [pricingContext.currencyCode, pricingContext.locale, pricingContext.prices.weekly, weeklyPackage],
  );
  const displayedYearlyPerWeekPrice = useMemo(
    () =>
      getDisplayedYearlyPerWeekPrice(
        pricingContext.locale,
        displayedYearlyPrice,
        pricingContext.currencyCode,
        yearlyPackage,
      ),
    [displayedYearlyPrice, pricingContext.currencyCode, pricingContext.derived.yearlyPerWeek, pricingContext.locale, yearlyPackage],
  );
  const yearlyPriceText = "Just MAD 248.65 per year";
  const weeklyPriceText = "MAD 44.68 per week";
  const displayedFreeTrialPrice = useMemo(
    () =>
      createLocalizedPrice({
        amount: 0,
        currencyCode: pricingContext.currencyCode,
        locale: pricingContext.locale,
        source: "fx_snapshot",
      }),
    [pricingContext.currencyCode, pricingContext.locale],
  );
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
    if (isPostWowPaywall) {
      const nextPackage = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
      return nextPackage ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
    }

    if (freeTrialEnabled) {
      return weeklyPackage ?? yearlyPackage ?? packages[0] ?? null;
    }

    const nextPackage = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
    return nextPackage ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
  }, [freeTrialEnabled, isPostWowPaywall, packages, selectedDuration, weeklyPackage, yearlyPackage]);

  const ctaDisabled = isLoading || !selectedPackage;
  const isYearlySelected = selectedDuration === "yearly";
  const isWeeklySelected = selectedDuration === "weekly";
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
    setCanClose(false);
    setSecondsLeft(5);
    closeCountdownProgress.value = 0;
    closeCountdownProgress.value = withTiming(1, {
      duration: CLOSE_DELAY_MS,
      easing: Easing.linear,
    });

    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCanClose(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const initialOffset = HERO_CAROUSEL_INITIAL_INDEX * heroSnapInterval;
    carouselIndexRef.current = HERO_CAROUSEL_INITIAL_INDEX;
    carouselScrollX.setValue(initialOffset);

    const frame = requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ x: initialOffset, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [carouselScrollX, heroSnapInterval]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isCarouselDraggingRef.current) {
        return;
      }

      const nextIndex = carouselIndexRef.current - 1;
      carouselIndexRef.current = nextIndex;
      carouselRef.current?.scrollTo({ x: nextIndex * heroSnapInterval, animated: true });
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [heroSnapInterval]);

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

  const closePaywall = useCallback(() => {
    if (source === "launch") {
      dismissLaunchPaywall();
    }

    router.replace(TOOLS_ROUTE as any);
  }, [router, source]);

  const completePaywall = useCallback(() => {
    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(resolveSafeRoute(redirectTo, TOOLS_ROUTE) as any);
      return;
    }

    router.replace(TOOLS_ROUTE as any);
  }, [redirectTo, router]);

  const handleClose = useCallback(() => {
    if (!canClose || isLoading) {
      return;
    }

    triggerHaptic();
    const shouldOpenDownsell = source === "launch" && !hasPaidAccess && credits <= 0;
    closePaywall();
    if (shouldOpenDownsell) {
      setTimeout(() => openStore("empty_balance"), 250);
    }
  }, [canClose, closePaywall, credits, hasPaidAccess, isLoading, openStore, source]);

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

  const handleToggleTrial = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setFreeTrialEnabled((current) => {
      const next = !current;
      if (!next) {
        setSelectedDuration("yearly");
        captureAnalytics(posthog, ANALYTICS_EVENTS.planSelected, { type: "yearly" });
      } else {
        captureAnalytics(posthog, ANALYTICS_EVENTS.planSelected, { type: "weekly_trial" });
      }
      return next;
    });
  }, [isLoading, posthog]);

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
    if (isPostWowPaywall) {
      void handlePurchase(yearlyPackage ?? selectedPackage, "yearly");
    }
  }, [handlePurchase, isLoading, isPostWowPaywall, posthog, selectedPackage, source, yearlyPackage]);

  const handleSelectWeekly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("weekly");
    captureAnalytics(posthog, ANALYTICS_EVENTS.planSelected, {
      type: freeTrialEnabled && !isPostWowPaywall ? "weekly_trial" : "weekly",
      paywall_source: isPostWowPaywall ? "post_wow" : source ?? "unknown",
    });
    if (isPostWowPaywall) {
      void handlePurchase(weeklyPackage ?? selectedPackage, "weekly");
    }
  }, [freeTrialEnabled, handlePurchase, isLoading, isPostWowPaywall, posthog, selectedPackage, source, weeklyPackage]);

  const handleSkipPostWowPaywall = useCallback(() => {
    triggerHaptic();
    captureAnalytics(posthog, "paywall_skipped", {
      paywall_source: "post_wow",
    });
    router.replace("/(tabs)" as any);
    setTimeout(() => openElitePass(), 250);
  }, [openElitePass, posthog, router]);

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

  const handleCarouselMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isCarouselDraggingRef.current = false;
    const snappedIndex = Math.round(event.nativeEvent.contentOffset.x / heroSnapInterval);
    const normalizedIndex = normalizeCarouselIndex(snappedIndex);
    carouselIndexRef.current = normalizedIndex;

    if (normalizedIndex !== snappedIndex) {
      carouselRef.current?.scrollTo({ x: normalizedIndex * heroSnapInterval, animated: false });
      carouselScrollX.setValue(normalizedIndex * heroSnapInterval);
    }
  }, [carouselScrollX, heroSnapInterval]);

  const handleCarouselScroll = useMemo(
    () =>
      NativeAnimated.event(
        [{ nativeEvent: { contentOffset: { x: carouselScrollX } } }],
        { useNativeDriver: false },
      ),
    [carouselScrollX],
  );

  if (isPostWowPaywall) {
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
        <StatusBar style="light" />
        <View style={styles.softBackdrop} />
        <Animated.View style={[styles.softSheet, { paddingBottom: Math.max(insets.bottom + 12, 20) }, sheetAnimatedStyle]}>
          <View style={styles.softHandle} />
          <Text style={[styles.softEyebrow, localizedFonts.bold]}>Best value</Text>
          <Text style={[styles.softTitle, localizedFonts.bold]}>Unlock unlimited room designs</Text>
          <Text style={[styles.softSubtitle, localizedFonts.medium]}>
            Keep going with premium renders, faster creation, and export-ready results.
          </Text>

          <View style={styles.softPlanStack}>
            <YearlyPlanCard
              onPress={handleSelectYearly}
              priceText={yearlyPriceText}
              selected={selectedDuration === "yearly"}
            />
            <WeeklyPlanCard
              onPress={handleSelectWeekly}
              priceText={weeklyPriceText}
              selected={selectedDuration === "weekly"}
            />
          </View>

          {isLoading ? (
            <View style={styles.softLoadingRow}>
              <ActivityIndicator color={TEXT_PRIMARY} />
              <Text style={[styles.softLoadingText, localizedFonts.medium]}>{t("paywall.processing")}</Text>
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
            <Text style={[styles.softSkipText, localizedFonts.medium]}>Skip — claim my free Diamond instead</Text>
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
          contentStyle: { backgroundColor: SCREEN_BG },
          gestureEnabled: false,
        }}
      />
      <StatusBar style="light" />
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, overlayAnimatedStyle]}
      />

      <Animated.View style={[styles.sheet, { minHeight: sheetHeight }, sheetAnimatedStyle]}>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => void handleRestore()}
          style={[styles.restoreButton, { [isRTL ? "right" : "left"]: 20 }]}
        >
          <Text style={[styles.restoreText, localizedFonts.medium]}>{t("paywall.restore")}</Text>
        </Pressable>

        <CountdownCloseButton
          canClose={canClose}
          onPress={handleClose}
          progress={closeCountdownProgress}
          secondsLeft={secondsLeft}
        />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroClip, { height: heroRowHeight }]}>
            <NativeAnimated.ScrollView
              ref={carouselRef}
              contentContainerStyle={[
                styles.heroTrack,
                { paddingHorizontal: heroTrackPadding },
              ]}
              contentOffset={{ x: HERO_CAROUSEL_INITIAL_INDEX * heroSnapInterval, y: 0 }}
              decelerationRate="fast"
              horizontal
              onScrollBeginDrag={() => {
                isCarouselDraggingRef.current = true;
              }}
              onScrollEndDrag={(event) => {
                if (!event.nativeEvent.velocity?.x) {
                  isCarouselDraggingRef.current = false;
                }
              }}
              onMomentumScrollEnd={handleCarouselMomentumEnd}
              onScroll={handleCarouselScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={heroSnapInterval}
            >
              {HERO_CAROUSEL_DATA.map((item, index) => (
                <HeroCarouselItem
                  key={item.id}
                  image={item.image}
                  index={index}
                  scrollX={carouselScrollX}
                  sideScale={HERO_SIDE_SCALE}
                  snapInterval={heroSnapInterval}
                />
              ))}
            </NativeAnimated.ScrollView>
          </View>

          <View style={[styles.titleSection, { alignItems: getDirectionalAlignment(isRTL) }]}>
            <Text style={[styles.titleText, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{paywallTitle}</Text>
            <Text style={[styles.subtitleText, hasPersonalizedBackground ? styles.personalizedSubtitleText : null, localizedFonts.regular, { textAlign: getDirectionalTextAlign(isRTL) }]}>{paywallSubtitle}</Text>
          </View>

          <View style={styles.featuresSection}>
            {["Instant Magical Renders", "Ultra-HD 4K Quality", "Unlimited Designs, Always"].map((feature, index) => (
              <FeatureRow
                key={feature}
                isLast={index === 2}
                label={feature}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: freeTrialEnabled }}
            onPress={handleToggleTrial}
            style={[styles.trialBar, { flexDirection: getDirectionalRow(isRTL) }]}
          >
            <Text style={[styles.trialLabel, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>
              Free trial activated
            </Text>
            <ToggleSwitch value={freeTrialEnabled} />
          </Pressable>

          <View style={styles.yearlyWrapper}>
            <YearlyPlanCard
              onPress={handleSelectYearly}
              priceText={yearlyPriceText}
              selected={isYearlySelected}
            />
          </View>

          <View style={styles.weeklyWrapper}>
            <WeeklyPlanCard
              onPress={handleSelectWeekly}
              priceText={weeklyPriceText}
              selected={isWeeklySelected}
            />
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{errorMessage}</Text>
          ) : null}

          <Pressable accessibilityRole="button" disabled={ctaDisabled} onPress={() => void handlePurchase()} style={[styles.ctaButton, ctaDisabled ? styles.ctaButtonDisabled : null]}>
            <LinearGradient
              colors={[BRAND_RED, CTA_DEEP_RED]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.ctaGradient}
            >
            {isLoading ? (
              <View style={styles.ctaLoadingRow}>
                <ActivityIndicator color={CTA_TEXT} />
                <Text style={[styles.ctaText, localizedFonts.bold]}>{t("paywall.processing")}</Text>
              </View>
            ) : (
              <FadeSwap swapKey={freeTrialEnabled ? "cta-trial" : "cta-continue"} style={styles.ctaContent}>
                <View style={[styles.ctaLabelRow, styles.forcedLtrRow, { flexDirection: getDirectionalRow(isRTL) }]}>
                  <Text style={[styles.ctaText, localizedFonts.bold, FORCED_LTR_TEXT_STYLE]}>{freeTrialEnabled ? "Try for $0" : "Subscribe Now"}</Text>
                  <Text
                    style={[
                      styles.ctaArrow,
                      localizedFonts.bold,
                      FORCED_LTR_TEXT_STYLE,
                      { transform: [{ scaleX: 1 }] },
                    ]}
                  >
                    {"→"}
                  </Text>
                  <Text
                    style={[
                      styles.ctaArrowVisual,
                      localizedFonts.bold,
                      FORCED_LTR_TEXT_STYLE,
                      { transform: [{ scaleX: 1 }] },
                    ]}
                  >
                    {String.fromCharCode(8594)}
                  </Text>
                  <NeonArrowDown
                    style={[
                      styles.ctaAnimatedArrow,
                      localizedFonts.bold,
                      FORCED_LTR_TEXT_STYLE,
                    ]}
                  />
                </View>
              </FadeSwap>
            )}
            </LinearGradient>
          </Pressable>

          <View style={[styles.legalFooter, { paddingBottom: Math.max(insets.bottom + 12, 12) }]}>
            <View style={[styles.legalLinksRow, { flexDirection: getDirectionalRow(isRTL) }]}>
              <LegalLink label={t("paywall.terms")} onPress={handleOpenTerms} />
              <LegalLink label={t("paywall.privacy")} onPress={handleOpenPrivacy} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
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
    borderColor: "rgba(255, 255, 255, 0.13)",
    backgroundColor: SCREEN_BG,
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
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  softTitle: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    lineHeight: 31,
    textAlign: "center",
    letterSpacing: 0,
  },
  softSubtitle: {
    color: TEXT_MUTED,
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
    color: TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 18,
  },
  softSkipLink: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  softSkipText: {
    color: "rgba(255, 255, 255, 0.54)",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  personalizedBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  personalizedBackgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCREEN_BG,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCREEN_BG,
  },
  personalizedAnimatedOverlay: {
    backgroundColor: SCREEN_BG,
  },
  sheet: {
    flex: 1,
    position: "relative",
    backgroundColor: SCREEN_BG,
  },
  personalizedSheet: {
    backgroundColor: SCREEN_BG,
  },
  restoreButton: {
    position: "absolute",
    top: 40,
    zIndex: 10,
  },
  restoreText: {
    color: TEXT_RESTORE,
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
  closeSlot: {
    position: "absolute",
    top: 40,
    right: 25,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBubble: {
    width: CLOSE_VISUAL_SIZE,
    height: CLOSE_VISUAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonInner: {
    width: CLOSE_VISUAL_SIZE,
    height: CLOSE_VISUAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CLOSE_VISUAL_SIZE / 2,
  },
  countdownWrap: {
    width: CLOSE_VISUAL_SIZE,
    height: CLOSE_VISUAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownRing: {
    position: "absolute",
  },
  countdownText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 11,
    ...fonts.bold,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
  },
  heroClip: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: SCREEN_BG,
  },
  heroTrack: {
    alignItems: "center",
    paddingVertical: 12,
  },
  heroItemSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: PANEL_BG_ALT,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  featuresSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 22,
    gap: 12,
  },
  titleSection: {
    marginHorizontal: 20,
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 18,
    gap: 8,
  },
  subtitleText: {
    maxWidth: 390,
    color: TEXT_MUTED,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "left",
    letterSpacing: 0,
    ...fonts.regular,
  },
  personalizedSubtitleText: {
    maxWidth: 390,
    color: TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 20,
  },
  titleText: {
    color: TEXT_PRIMARY,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "left",
    flexShrink: 1,
    letterSpacing: 0,
    ...fonts.bold,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureRowGap: {
    marginBottom: 0,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 58, 90, 0.16)",
  },
  featureText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 19,
    ...fonts.medium,
  },
  trialBar: {
    minHeight: 48,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(232, 58, 90, 0.34)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  trialLabel: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 3,
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
    backgroundColor: TEXT_ACCENT,
  },
  yearlyWrapper: {
    marginHorizontal: 20,
  },
  weeklyWrapper: {
    marginTop: 18,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  planCard: {
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: PANEL_BG_ALT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
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
    paddingTop: 24,
  },
  weeklyCard: {
    minHeight: 72,
  },
  planCardIdle: {
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: BRAND_RED_ACTIVE,
    shadowColor: BRAND_RED,
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    boxShadow: "0px 10px 24px rgba(232,58,90,0.36)",
  },
  planCardGlow: {
    shadowColor: BRAND_RED,
    shadowOpacity: 0.58,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    boxShadow: "0px 14px 34px rgba(232,58,90,0.48)",
  },
  planCardQuietGlow: {
    shadowColor: "#00B4FF",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    boxShadow: "0px 8px 18px rgba(0,180,255,0.14)",
  },
  bestOfferBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    borderRadius: 14,
    backgroundColor: RUBY_BADGE,
    borderWidth: 1,
    borderColor: RUBY_BADGE_BORDER,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  bestOfferText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 13,
    textTransform: "uppercase",
    ...fonts.bold,
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
    color: TEXT_PRIMARY,
    fontSize: 13,
    lineHeight: 16,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  planSubtext: {
    marginTop: 4,
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 15,
    ...fonts.regular,
  },
  planPriceText: {
    marginTop: 6,
    color: TEXT_PRIMARY,
    fontSize: 17,
    lineHeight: 22,
    ...fonts.bold,
  },
  yearlyPrice: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    lineHeight: 21,
    ...fonts.bold,
  },
  weeklyTrialPrice: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 17,
    flexShrink: 1,
    ...fonts.bold,
  },
  weeklyPrice: {
    color: TEXT_PRIMARY,
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
    backgroundColor: BRAND_RED,
  },
  trialBadgeText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 14,
    textTransform: "uppercase",
    ...fonts.bold,
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
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    textAlign: "left",
    color: ERROR_TEXT,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  ctaButton: {
    height: 60,
    marginTop: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: BRAND_RED,
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    boxShadow: "0px 14px 28px rgba(232,58,90,0.28)",
    overflow: "visible",
  },
  ctaGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
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
    color: CTA_TEXT,
    fontSize: 19,
    lineHeight: 24,
    ...fonts.bold,
  },
  ctaArrow: {
    marginHorizontal: 8,
    color: "transparent",
    fontSize: 1,
    lineHeight: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
    width: 0,
    ...fonts.bold,
  },
  ctaArrowVisual: {
    marginLeft: 8,
    color: CTA_TEXT,
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
    ...fonts.bold,
  },
  legalFooter: {
    marginTop: "auto",
    marginHorizontal: 20,
    paddingTop: 4,
    alignItems: "flex-start",
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 18,
  },
  legalLinkButton: {
    minHeight: 34,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  legalLinkText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    lineHeight: 17,
    textDecorationLine: "underline",
    ...fonts.medium,
  },
});


