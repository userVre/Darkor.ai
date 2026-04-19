import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { usePricingContext, createLocalizedPrice, type LocalizedPrice } from "../lib/dynamic-pricing";
import { StatusBar } from "expo-status-bar";
import { AnimatePresence, MotiView } from "moti";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated as NativeAnimated,
  Alert,
  I18nManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Shield, X } from "@/components/material-icons";
import { useTranslation } from "react-i18next";

import { useProSuccess } from "../components/pro-success-context";
import { useViewerCredits } from "../components/viewer-credits-context";
import { useViewerSession } from "../components/viewer-session-context";
import { getGenerationLimit } from "../convex/subscriptions";
import { triggerHaptic } from "../lib/haptics";
import { useLocalizedAppFonts } from "../lib/i18n";
import {
  getDirectionalAlignment,
  getDirectionalArrowScale,
  getDirectionalOppositeAlignment,
  getDirectionalRow,
  getDirectionalTextAlign,
} from "../lib/i18n/rtl";
import { dismissLaunchPaywall } from "../lib/launch-paywall";
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
import { radix } from "../styles/theme";
import { fonts } from "../styles/typography";

const SCREEN_BG = "#0D0D0D";
const PANEL_BG = SCREEN_BG;
const PANEL_BG_ALT = SCREEN_BG;
const PANEL_BORDER = radix.dark.slate.slate6;
const ACCENT = "#FFFFFF";
const BRAND_RED = radix.dark.ruby.ruby9;
const BRAND_RED_ACTIVE = radix.dark.ruby.ruby10;
const TOGGLE_OFF = radix.dark.slate.slate5;
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.72)";
const TEXT_RESTORE = "#FFFFFF";
const TEXT_ACCENT = "#FFFFFF";
const CTA_TEXT = "#FFFFFF";
const ERROR_TEXT = radix.dark.ruby.ruby11;
const RUBY_BADGE = radix.dark.ruby.ruby9;
const RUBY_BADGE_BORDER = radix.dark.ruby.ruby10;
const TRANSITION_DURATION_MS = 200;
const CAROUSEL_INTERVAL_MS = 2500;
const CLOSE_DELAY_MS = 5000;
const CLOSE_VISUAL_SIZE = 40;
const CLOSE_RING_RADIUS = 15;
const CLOSE_RING_STROKE_WIDTH = 2.5;
const CLOSE_RING_CIRCUMFERENCE = 2 * Math.PI * CLOSE_RING_RADIUS;
const HERO_CENTER_SIZE_MAX = 200;
const HERO_CENTER_SIZE_MIN = 180;
const HERO_SIDE_SCALE = 0.76;
const HERO_SIDE_TRANSLATE_Y = 18;
const HERO_CAROUSEL_REPEAT_MULTIPLIER = 7;
const HERO_IMAGES = [
  require("../assets/media/paywall/paywall-soft-lounge.png"),
  require("../assets/media/paywall/paywall-luxury-lounge.png"),
  require("../assets/media/paywall/paywall-marble-kitchen.png"),
] as const;
const HERO_CAROUSEL_DATA = Array.from({ length: HERO_IMAGES.length * HERO_CAROUSEL_REPEAT_MULTIPLIER }, (_, index) => ({
  id: `hero-${index}`,
  image: HERO_IMAGES[index % HERO_IMAGES.length],
}));
const HERO_CAROUSEL_INITIAL_INDEX = HERO_IMAGES.length * Math.floor(HERO_CAROUSEL_REPEAT_MULTIPLIER / 2);
const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
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

function FeatureRow({ label, isLast }: { label: string; isLast: boolean }) {
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  return (
    <View style={[styles.featureRow, !isLast ? styles.featureRowGap : null, { flexDirection: getDirectionalRow(isRTL) }]}>
      <View style={styles.featureIcon}>
        <Check color={TEXT_PRIMARY} size={12} strokeWidth={3} />
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
      accessibilityRole="button"
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
  centerSize,
  sideScale,
  snapInterval,
}: {
  image: (typeof HERO_IMAGES)[number];
  index: number;
  scrollX: NativeAnimated.Value;
  centerSize: number;
  sideScale: number;
  snapInterval: number;
}) {
  const inputRange = [
    (index - 1) * snapInterval,
    index * snapInterval,
    (index + 1) * snapInterval,
  ];
  const animatedStyle = {
    opacity: scrollX.interpolate({
      inputRange,
      outputRange: [0.52, 1, 0.52],
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
          outputRange: [sideScale, 1, sideScale],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  return (
    <View style={[styles.heroItemSlot, { width: snapInterval, height: centerSize + HERO_SIDE_TRANSLATE_Y }]}>
      <NativeAnimated.View style={[styles.heroImageWrap, { width: centerSize, height: centerSize }, animatedStyle]}>
        <Image contentFit="cover" source={image} style={styles.heroImage} transition={0} />
      </NativeAnimated.View>
    </View>
  );
}

function YearlyPlanCard({
  pricePerYearText,
  pricePerWeekText,
  selected,
  onPress,
}: {
  pricePerYearText: string;
  pricePerWeekText: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, selected ? styles.planCardSelected : styles.planCardIdle, styles.yearlyCard]}>
      <View style={styles.bestOfferBadge}>
        <Text style={[styles.bestOfferText, localizedFonts.bold]}>{t("paywall.bestOffer").toUpperCase()}</Text>
      </View>

      <View style={[styles.planRow, { flexDirection: getDirectionalRow(isRTL) }]}>
        <View style={styles.planCopy}>
          <Text style={[styles.planLabel, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("paywall.yearlyAccess").toUpperCase()}</Text>
          <Text style={[styles.planSubtext, localizedFonts.regular, { textAlign: getDirectionalTextAlign(isRTL) }]}>{pricePerYearText}</Text>
        </View>

        <View style={[styles.planPriceColumn, { alignItems: getDirectionalOppositeAlignment(isRTL) }]}>
          <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={[styles.yearlyPrice, localizedFonts.bold]}>
            {pricePerWeekText}
          </Text>
          <Text style={[styles.planSubtext, localizedFonts.regular]}>{t("paywall.perWeek")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function WeeklyPlanCard({
  freeTrialEnabled,
  pricePerWeekText,
  trialThenPriceText,
  selected,
  onPress,
}: {
  freeTrialEnabled: boolean;
  pricePerWeekText: string;
  trialThenPriceText: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  if (freeTrialEnabled) {
    return (
      <FadeSwap swapKey="weekly-trial-on">
        <View>
          <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, styles.planCardSelected, styles.weeklyCard]}>
            <View style={[styles.planRow, { flexDirection: getDirectionalRow(isRTL) }]}>
                <View style={styles.planCopy}>
                  <View style={styles.trialBadge}>
                    <Text style={[styles.trialBadgeText, localizedFonts.bold]}>{t("paywall.freeTrial").toUpperCase()}</Text>
                  </View>
                </View>

              <View style={[styles.planPriceColumn, { alignItems: getDirectionalOppositeAlignment(isRTL) }]}>
                <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.weeklyTrialPrice, localizedFonts.bold]}>
                  {trialThenPriceText}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={[styles.noPaymentRow, { flexDirection: getDirectionalRow(isRTL), justifyContent: getDirectionalAlignment(isRTL) }]}>
            <Shield color={TEXT_MUTED} size={14} strokeWidth={2.1} />
            <Text style={[styles.noticeText, localizedFonts.medium]}>{t("paywall.noPaymentNow")}</Text>
          </View>
        </View>
      </FadeSwap>
    );
  }

  return (
    <FadeSwap swapKey="weekly-trial-off">
      <View>
        <Pressable accessibilityRole="button" onPress={onPress} style={[styles.planCard, selected ? styles.planCardSelected : styles.planCardIdle, styles.weeklyCard]}>
          <View style={[styles.planRow, { flexDirection: getDirectionalRow(isRTL) }]}>
            <View style={styles.planCopy}>
              <Text style={[styles.planLabel, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("paywall.weeklyAccess").toUpperCase()}</Text>
            </View>

            <View style={[styles.planPriceColumn, { alignItems: getDirectionalOppositeAlignment(isRTL) }]}>
              <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.weeklyPrice, localizedFonts.bold]}>
                {pricePerWeekText}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={[styles.cancelAnytimeRow, { flexDirection: getDirectionalRow(isRTL), justifyContent: getDirectionalAlignment(isRTL) }]}>
          <Shield color={TEXT_MUTED} size={14} strokeWidth={2.1} />
          <Text style={[styles.noticeText, localizedFonts.medium]}>{t("paywall.cancelAnytime")}</Text>
        </View>
      </View>
    </FadeSwap>
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
  const shouldPreferFallback = preferredCurrencyCode != null && fallbackPrice.currencyCode === preferredCurrencyCode;

  if (shouldPreferFallback) {
    return fallbackPrice;
  }

  if (localizedPriceString.length > 0) {
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
  fallbackPrice: LocalizedPrice,
  locale: string,
  yearlyPrice: LocalizedPrice,
  preferredCurrencyCode?: string,
  pkg?: RevenueCatPackage | null,
) {
  const productPricePerWeek = pkg?.product?.pricePerWeek;
  const productCurrencyCode = pkg?.product?.currencyCode ?? yearlyPrice.currencyCode;
  const shouldPreferFallback = preferredCurrencyCode != null && yearlyPrice.currencyCode === preferredCurrencyCode;

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
  const { t, i18n } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = PAYWALL_FORCE_LTR ? false : I18nManager.isRTL;
  const pricingContext = usePricingContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { source, redirectTo } = useLocalSearchParams<{
    source?: "launch" | "design-flow" | "generate";
    redirectTo?: string;
  }>();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { anonymousId } = useViewerSession();
  const { setOptimisticAccess } = useViewerCredits();
  const setPlan = useMutation("users:setViewerPlanFromRevenueCat" as any);
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
  const heroCenterSize = Math.min(HERO_CENTER_SIZE_MAX, Math.max(HERO_CENTER_SIZE_MIN, width * 0.5));
  const heroSnapInterval = width / 2;
  const heroTrackPadding = Math.max((width - heroSnapInterval) / 2, 0);
  const heroRowHeight = heroCenterSize + HERO_SIDE_TRANSLATE_Y + 56;
  const yearlyPackage = useMemo(() => findRevenueCatPackage(packages, "yearly"), [packages]);
  const weeklyPackage = useMemo(() => findRevenueCatPackage(packages, "weekly"), [packages]);
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
        pricingContext.derived.yearlyPerWeek,
        pricingContext.locale,
        displayedYearlyPrice,
        pricingContext.currencyCode,
        yearlyPackage,
      ),
    [displayedYearlyPrice, pricingContext.currencyCode, pricingContext.derived.yearlyPerWeek, pricingContext.locale, yearlyPackage],
  );
  const yearlyPriceText = useMemo(
    () => t("paywall.pricePerYear", { price: displayedYearlyPrice.formatted }),
    [displayedYearlyPrice.formatted, i18n.language, t],
  );
  const weeklyPriceText = useMemo(
    () => t("paywall.pricePerWeek", { price: displayedWeeklyPrice.formatted }),
    [displayedWeeklyPrice.formatted, i18n.language, t],
  );
  const thenWeeklyPriceText = useMemo(
    () => t("paywall.thenPricePerWeek", { price: displayedWeeklyPrice.formatted }),
    [displayedWeeklyPrice.formatted, i18n.language, t],
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
    if (freeTrialEnabled) {
      return weeklyPackage ?? yearlyPackage ?? packages[0] ?? null;
    }

    const nextPackage = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
    return nextPackage ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
  }, [freeTrialEnabled, packages, selectedDuration, weeklyPackage, yearlyPackage]);

  const ctaDisabled = isLoading || !selectedPackage;
  const isYearlySelected = !freeTrialEnabled && selectedDuration === "yearly";
  const isWeeklySelected = freeTrialEnabled || selectedDuration === "weekly";
  const sheetHeight = Math.max(height - 12, 0);

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
          offeringResult.packages,
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

  const closePaywall = useCallback(() => {
    if (source === "launch") {
      dismissLaunchPaywall();
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(redirectTo as any);
      return;
    }

    router.replace("/(tabs)");
  }, [redirectTo, router, source]);

  const completePaywall = useCallback(() => {
    if (source === "launch") {
      dismissLaunchPaywall();
    }

    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(redirectTo as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [redirectTo, router, source]);

  const handleClose = useCallback(() => {
    if (!canClose || isLoading) {
      return;
    }

    triggerHaptic();
    closePaywall();
  }, [canClose, closePaywall, isLoading]);

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
      if (!hasActiveSubscription(info)) {
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
      showSuccess();
      completePaywall();
    } catch (error) {
      Alert.alert(t("paywall.restoreFailed"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    } finally {
      setIsLoading(false);
    }
  }, [completePaywall, persistPurchasedPlan, setOptimisticAccess, showSuccess]);

  const handlePurchase = useCallback(async () => {
    triggerHaptic();
    setErrorMessage(null);

    if (!selectedPackage) {
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
      const result = await purchasesRef.current.purchasePackage(selectedPackage);
      if (!hasActiveSubscription(result.customerInfo)) {
        throw new Error(t("paywall.subscriptionConfirmFailed"));
      }

      const subscriptionState = resolveRevenueCatSubscription(result.customerInfo);
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
      showSuccess();
      completePaywall();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("paywall.purchaseCancelled");
      setErrorMessage(message);
      Alert.alert(t("paywall.purchaseError"), message);
    } finally {
      setIsLoading(false);
    }
  }, [completePaywall, persistPurchasedPlan, selectedPackage, setOptimisticAccess, showSuccess, t]);

  const handleToggleTrial = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setFreeTrialEnabled((current) => {
      const next = !current;
      if (!next) {
        setSelectedDuration("yearly");
      }
      return next;
    });
  }, [isLoading]);

  const handleSelectYearly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("yearly");
  }, [isLoading]);

  const handleSelectWeekly = useCallback(() => {
    if (isLoading) {
      return;
    }

    triggerHaptic();
    setSelectedDuration("weekly");
  }, [isLoading]);

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
        { useNativeDriver: true },
      ),
    [carouselScrollX],
  );

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
      <Animated.View pointerEvents="none" style={[styles.overlay, overlayAnimatedStyle]} />

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
                  centerSize={heroCenterSize}
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
            <Text style={[styles.titleText, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("paywall.title")}</Text>
            <Text style={[styles.subtitleText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("paywall.subtitle")}</Text>
          </View>

          <View style={styles.featuresSection}>
            {[t("paywall.features.fasterRendering"), t("paywall.features.adFree"), t("paywall.features.unlimitedRenders")].map((feature, index) => (
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
              {freeTrialEnabled ? t("paywall.trialEnabled") : t("paywall.enableTrial")}
            </Text>
            <ToggleSwitch value={freeTrialEnabled} />
          </Pressable>

          <View style={styles.yearlyWrapper}>
            <YearlyPlanCard
              onPress={handleSelectYearly}
              pricePerWeekText={displayedYearlyPerWeekPrice.formatted}
              pricePerYearText={yearlyPriceText}
              selected={isYearlySelected}
            />
          </View>

          <View style={styles.weeklyWrapper}>
            <WeeklyPlanCard
              freeTrialEnabled={freeTrialEnabled}
              onPress={handleSelectWeekly}
              pricePerWeekText={weeklyPriceText}
              selected={isWeeklySelected}
              trialThenPriceText={thenWeeklyPriceText}
            />
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{errorMessage}</Text>
          ) : null}

          <Pressable accessibilityRole="button" disabled={ctaDisabled} onPress={() => void handlePurchase()} style={[styles.ctaButton, ctaDisabled ? styles.ctaButtonDisabled : null]}>
            {isLoading ? (
              <View style={styles.ctaLoadingRow}>
                <ActivityIndicator color={CTA_TEXT} />
                <Text style={[styles.ctaText, localizedFonts.bold]}>{t("paywall.processing")}</Text>
              </View>
            ) : (
              <FadeSwap swapKey={freeTrialEnabled ? "cta-trial" : "cta-continue"} style={styles.ctaContent}>
                <View style={[styles.ctaLabelRow, { flexDirection: getDirectionalRow(isRTL) }]}>
                  <Text style={[styles.ctaText, localizedFonts.bold]}>{freeTrialEnabled ? t("paywall.tryForFree") : t("paywall.continue")}</Text>
                  <Text
                    style={[
                      styles.ctaArrow,
                      localizedFonts.bold,
                      { transform: [{ scaleX: getDirectionalArrowScale(isRTL) }] },
                    ]}
                  >
                    {">"}
                  </Text>
                </View>
              </FadeSwap>
            )}
          </Pressable>

          <View style={[styles.legalFooter, { paddingBottom: Math.max(insets.bottom + 12, 12) }]}>
            <View style={[styles.legalLinksRow, { flexDirection: getDirectionalRow(isRTL), justifyContent: getDirectionalAlignment(isRTL) }]}>
              <LegalLink label={t("paywall.terms")} onPress={handleOpenTerms} />
              <Text style={[styles.legalDivider, localizedFonts.regular]}>|</Text>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCREEN_BG,
  },
  sheet: {
    flex: 1,
    position: "relative",
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
    paddingTop: 0,
  },
  heroClip: {
    width: "100%",
    height: 256,
    overflow: "hidden",
    backgroundColor: SCREEN_BG,
  },
  heroTrack: {
    alignItems: "center",
    paddingVertical: 28,
  },
  heroItemSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: PANEL_BG_ALT,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  featuresSection: {
    marginHorizontal: 20,
    marginBottom: 36,
  },
  titleSection: {
    marginHorizontal: 20,
    alignItems: "flex-start",
    marginBottom: 40,
    gap: 10,
  },
  subtitleText: {
    maxWidth: 360,
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
    letterSpacing: 0.3,
    ...fonts.medium,
  },
  titleText: {
    color: TEXT_PRIMARY,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "left",
    flexShrink: 1,
    ...fonts.bold,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureRowGap: {
    marginBottom: 24,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: BRAND_RED,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  featureText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    ...fonts.medium,
  },
  trialBar: {
    minHeight: 56,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: SCREEN_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  trialLabel: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
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
    marginTop: 20,
    marginHorizontal: 20,
  },
  weeklyWrapper: {
    marginTop: 12,
    marginHorizontal: 20,
  },
  planCard: {
    minHeight: 78,
    borderRadius: 14,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    justifyContent: "center",
  },
  yearlyCard: {},
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
  },
  bestOfferBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    borderRadius: 14,
    backgroundColor: RUBY_BADGE,
    borderWidth: 1,
    borderColor: RUBY_BADGE_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  planPriceColumn: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  planLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 14,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  planSubtext: {
    marginTop: 6,
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.regular,
  },
  yearlyPrice: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  weeklyTrialPrice: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
    ...fonts.bold,
  },
  weeklyPrice: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
    ...fonts.bold,
  },
  trialBadge: {
    minHeight: 32,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 12,
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
    marginTop: 16,
    marginBottom: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 6,
  },
  cancelAnytimeRow: {
    marginTop: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 6,
  },
  noticeText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    ...fonts.medium,
  },
  errorText: {
    marginTop: 4,
    marginHorizontal: 20,
    marginBottom: 12,
    textAlign: "left",
    color: ERROR_TEXT,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  ctaButton: {
    minHeight: 58,
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: BRAND_RED,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaContent: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  ctaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    width: "100%",
  },
  ctaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  ctaText: {
    color: CTA_TEXT,
    fontSize: 17,
    lineHeight: 22,
    ...fonts.bold,
  },
  ctaArrow: {
    marginHorizontal: 8,
    color: CTA_TEXT,
    fontSize: 20,
    lineHeight: 22,
    ...fonts.bold,
  },
  legalFooter: {
    marginHorizontal: 20,
    paddingTop: 16,
    alignItems: "flex-start",
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  legalLinkButton: {
    minWidth: 40,
    minHeight: 24,
    justifyContent: "center",
  },
  legalLinkText: {
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 14,
    ...fonts.regular,
  },
  legalDivider: {
    marginHorizontal: 6,
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 14,
    ...fonts.regular,
  },
});


