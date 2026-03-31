import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Check, Sparkles, X } from "lucide-react-native";

import { LuxPressable } from "../components/lux-pressable";
import { useProSuccess } from "../components/pro-success-context";
import { useViewerSession } from "../components/viewer-session-context";
import { triggerHaptic } from "../lib/haptics";
import { dismissLaunchPaywall } from "../lib/launch-paywall";
import {
  configureRevenueCat,
  findRevenueCatPackage,
  getRevenueCatClient,
  hasActiveSubscription,
  inferBillingDurationFromPackage,
  resolveRevenueCatSubscription,
  type BillingDuration,
  type BillingPlan,
  type RevenueCatEntitlement,
  type RevenueCatPackage,
  type RevenueCatPurchases,
} from "../lib/revenuecat";
import { fonts } from "../styles/typography";

const SCREEN_BG = "#09090B";
const CARD_BG = "rgba(20, 20, 24, 0.88)";
const CARD_BORDER = "rgba(255, 255, 255, 0.1)";
const CARD_BORDER_SELECTED = "rgba(255, 105, 97, 0.72)";
const TEXT_PRIMARY = "#FAFAFA";
const TEXT_SECONDARY = "#B6B7C0";
const TEXT_TERTIARY = "#7C7D86";
const BRAND_RED = "#EB3B3B";
const BRAND_RED_DEEP = "#8F1111";
const BRAND_RED_SOFT = "rgba(235, 59, 59, 0.18)";
const CLOSE_BG = "rgba(255, 255, 255, 0.08)";
const CLOSE_BG_DISABLED = "rgba(255, 255, 255, 0.04)";

const FEATURE_ITEMS = [
  "Remove Ads",
  "High Definition (4K) Exports",
  "Unlock All Architectural Styles",
  "Priority AI Processing",
] as const;

const SHOWCASE_SLIDES = [
  {
    id: "luxury-lounge",
    title: "Turn an empty shell into a cinematic lounge",
    caption: "Before",
    styleLabel: "Luxury Minimalist",
    beforeSource: require("../assets/media/before-empty-room.png"),
    afterSource: require("../assets/media/paywall/paywall-luxury-lounge.png"),
  },
  {
    id: "staged-living",
    title: "Make every room look listing-ready in seconds",
    caption: "Before",
    styleLabel: "Premium Staging",
    beforeSource: require("../assets/media/staging-before.jpg"),
    afterSource: require("../assets/media/staging-after.jpg"),
  },
  {
    id: "rendered-concept",
    title: "Go from rough concept to polished visual",
    caption: "Before",
    styleLabel: "Architect Render",
    beforeSource: require("../assets/media/sketch-before.png"),
    afterSource: require("../assets/media/render-after.png"),
  },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  caption: string;
  styleLabel: string;
  beforeSource: ImageSource;
  afterSource: ImageSource;
}>;

type PlanCardProps = {
  badge?: string;
  description: string;
  onPress: () => void;
  periodLabel: string;
  priceLabel: string;
  selected: boolean;
  title: string;
  unavailable?: boolean;
};

function formatPriceLabel(pkg?: RevenueCatPackage | null) {
  const product = pkg?.product as
    | {
        currencyCode?: string | null;
        price?: number | null;
        priceString?: string | null;
      }
    | undefined;

  if (typeof product?.priceString === "string" && product.priceString.trim().length > 0) {
    return product.priceString.trim();
  }

  if (typeof product?.price === "number" && Number.isFinite(product.price)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: product.currencyCode ?? "USD",
      }).format(product.price);
    } catch {
      return `$${product.price.toFixed(2)}`;
    }
  }

  return null;
}

function ShowcaseSlide({
  item,
  slideWidth,
}: {
  item: (typeof SHOWCASE_SLIDES)[number];
  slideWidth: number;
}) {
  const heroHeight = Math.min(Math.max(slideWidth * 0.74, 332), 392);
  const beforeWidth = Math.max(108, slideWidth * 0.34);
  const afterWidth = Math.max(172, slideWidth - beforeWidth - 58);

  return (
    <LinearGradient
      colors={["rgba(242, 242, 244, 0.06)", "rgba(38, 38, 45, 0.88)", "rgba(14, 14, 18, 0.96)"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.showcaseCard, { height: heroHeight, width: slideWidth }]}
    >
      <View style={styles.showcaseTopRow}>
        <View style={styles.kickerPill}>
          <Sparkles color="#FFD6D1" size={12} strokeWidth={2.2} />
          <Text style={styles.kickerPillText}>Darkor Pro</Text>
        </View>
        <Text style={styles.showcaseStyleLabel}>{item.styleLabel}</Text>
      </View>

      <View style={styles.showcaseFrameRow}>
        <View style={[styles.showcaseBeforeFrame, { height: heroHeight - 98, width: beforeWidth }]}>
          <Image contentFit="cover" source={item.beforeSource} style={styles.showcaseImage} transition={220} />
          <BlurView intensity={20} tint="dark" style={styles.showcaseTag}>
            <Text style={styles.showcaseTagText}>{item.caption}</Text>
          </BlurView>
        </View>

        <View style={styles.showcaseArrowWrap}>
          <View style={styles.showcaseArrowShell}>
            <ArrowRight color={TEXT_PRIMARY} size={16} strokeWidth={2.4} />
          </View>
        </View>

        <View style={[styles.showcaseAfterFrame, { height: heroHeight - 64, width: afterWidth }]}>
          <Image contentFit="cover" source={item.afterSource} style={styles.showcaseImage} transition={220} />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.58)"]}
            end={{ x: 0.5, y: 1 }}
            start={{ x: 0.5, y: 0.25 }}
            style={styles.showcaseAfterOverlay}
          />
          <BlurView intensity={18} tint="dark" style={styles.showcaseResultPill}>
            <Text style={styles.showcaseTagText}>Pro Result</Text>
          </BlurView>
        </View>
      </View>

      <Text style={styles.showcaseTitle}>{item.title}</Text>
    </LinearGradient>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <LinearGradient
        colors={["rgba(255,255,255,0.12)", "rgba(235,59,59,0.18)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.featureIconWrap}
      >
        <Check color={TEXT_PRIMARY} size={12} strokeWidth={3} />
      </LinearGradient>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function PlanCard({
  badge,
  description,
  onPress,
  periodLabel,
  priceLabel,
  selected,
  title,
  unavailable = false,
}: PlanCardProps) {
  return (
    <LuxPressable
      accessibilityRole="button"
      disabled={unavailable}
      glowColor={selected ? BRAND_RED : undefined}
      onPress={onPress}
      scale={0.985}
      style={[
        styles.planCard,
        selected ? styles.planCardSelected : styles.planCardIdle,
        unavailable ? styles.planCardUnavailable : null,
      ]}
    >
      <LinearGradient
        colors={
          selected
            ? ["rgba(235,59,59,0.18)", "rgba(27,27,32,0.96)"]
            : ["rgba(255,255,255,0.04)", "rgba(18,18,23,0.96)"]
        }
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.planCardInner}
      >
        {badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}

        <View style={styles.planSelectionDot}>
          {selected ? <View style={styles.planSelectionDotInner} /> : null}
        </View>

        <View style={styles.planCopyBlock}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planDescription}>{description}</Text>
        </View>

        <View style={styles.planPriceBlock}>
          <Text style={styles.planPrice}>{priceLabel}</Text>
          <Text style={styles.planPeriod}>{periodLabel}</Text>
        </View>
      </LinearGradient>
    </LuxPressable>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { source, redirectTo } = useLocalSearchParams<{
    source?: "launch" | "design-flow" | "generate";
    redirectTo?: string;
  }>();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const setPlan = useMutation("users:setViewerPlanFromRevenueCat" as any);
  const { showSuccess, showToast } = useProSuccess();
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>("yearly");
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery(
    "users:me" as any,
    viewerReady ? viewerArgs : "skip",
  ) as {
    credits?: number;
    subscriptionType?: "free" | "weekly" | "yearly";
    hasPaidAccess?: boolean;
  } | null | undefined;

  const weeklyPackage = useMemo(() => findRevenueCatPackage(packages, "weekly"), [packages]);
  const yearlyPackage = useMemo(() => findRevenueCatPackage(packages, "yearly"), [packages]);
  const selectedPackage = useMemo(() => {
    const picked = selectedDuration === "yearly" ? yearlyPackage : weeklyPackage;
    return picked ?? yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
  }, [packages, selectedDuration, weeklyPackage, yearlyPackage]);

  const remainingGenerationCredits =
    typeof me?.credits === "number" ? Math.max(me.credits, 0) : null;
  const hasPaidAccess = Boolean(me?.hasPaidAccess);
  const hasRemainingFreeCredits =
    !hasPaidAccess && typeof remainingGenerationCredits === "number" && remainingGenerationCredits > 0;
  const canDismissPaywall = hasPaidAccess || hasRemainingFreeCredits;

  const accessSummary = useMemo(() => {
    if (!viewerReady || me === undefined) {
      return {
        title: "Checking your current access",
        body: "We're loading your credits and subscription status.",
      };
    }

    if (hasPaidAccess) {
      return {
        title: me?.subscriptionType === "yearly" ? "Yearly Pro is already active" : "Weekly Pro is already active",
        body: "Restore purchases any time or switch plans from your account settings.",
      };
    }

    if (hasRemainingFreeCredits) {
      return {
        title: `${remainingGenerationCredits} free ${remainingGenerationCredits === 1 ? "credit" : "credits"} remaining`,
        body: "You can still close this paywall and keep designing on the free tier.",
      };
    }

    return {
      title: "Free credits exhausted",
      body: "Upgrade to continue generating premium interior concepts without waiting.",
    };
  }, [hasPaidAccess, hasRemainingFreeCredits, me, remainingGenerationCredits, viewerReady]);

  const weeklyPriceLabel = formatPriceLabel(weeklyPackage) ?? "Loading price";
  const yearlyPriceLabel = formatPriceLabel(yearlyPackage) ?? "Loading price";
  const carouselWidth = Math.min(width - 32, 430);
  const ctaDisabled = isLoading || !selectedPackage;

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
    if (packages.length === 0) {
      return;
    }

    if (selectedDuration === "yearly" && yearlyPackage) {
      return;
    }

    if (selectedDuration === "weekly" && weeklyPackage) {
      return;
    }

    const fallback = yearlyPackage ?? weeklyPackage ?? packages[0] ?? null;
    if (!fallback) {
      return;
    }

    setSelectedDuration(inferBillingDurationFromPackage(fallback));
  }, [packages, selectedDuration, weeklyPackage, yearlyPackage]);

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
      });
    },
    [anonymousId, setPlan],
  );

  const exitPaywall = useCallback(() => {
    dismissLaunchPaywall();

    if (typeof redirectTo === "string" && redirectTo.length > 0) {
      router.replace(redirectTo as any);
      return;
    }

    if (source === "generate" && router.canGoBack()) {
      router.back();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [redirectTo, router, source]);

  const handleClose = useCallback(() => {
    if (!canDismissPaywall) {
      return;
    }

    triggerHaptic();
    exitPaywall();
  }, [canDismissPaywall, exitPaywall]);

  const handleSelectDuration = useCallback((duration: BillingDuration) => {
    triggerHaptic();
    setErrorMessage(null);
    setSelectedDuration(duration);
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

      const subscriptionState = resolveRevenueCatSubscription(info);

      if (subscriptionState.plan !== "pro" || subscriptionState.subscriptionType === "free") {
        Alert.alert("Restored", "No active subscriptions were found.");
        return;
      }

      await persistPurchasedPlan(
        subscriptionState.plan,
        subscriptionState.subscriptionType,
        subscriptionState.entitlement,
        subscriptionState.purchasedAt,
        subscriptionState.subscriptionEnd,
      );
      showSuccess();

      exitPaywall();
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [exitPaywall, persistPurchasedPlan, showSuccess, showToast]);

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

      const subscriptionState = resolveRevenueCatSubscription(result.customerInfo);
      if (subscriptionState.plan !== "pro" || subscriptionState.subscriptionType === "free") {
        throw new Error("We could not confirm your subscription. Please try again.");
      }

      await persistPurchasedPlan(
        subscriptionState.plan,
        subscriptionState.subscriptionType,
        subscriptionState.entitlement,
        subscriptionState.purchasedAt,
        subscriptionState.subscriptionEnd,
      );
      showSuccess();

      exitPaywall();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase cancelled.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
    } finally {
      setIsLoading(false);
    }
  }, [exitPaywall, persistPurchasedPlan, selectedPackage, showSuccess, showToast]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#060608", "#101014", "#171018"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0.15, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.topGlow} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 28, 28),
            paddingTop: Math.max(insets.top + 14, 22),
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: -12 }}
          style={styles.headerRow}
          transition={{ type: "timing", duration: 360 }}
        >
          <View>
            <Text style={styles.headerEyebrow}>Darkor AI Premium</Text>
            <Text style={styles.headerMeta}>Premium design generation</Text>
          </View>

          <LuxPressable
            accessibilityLabel={canDismissPaywall ? "Close paywall" : "Paywall cannot be dismissed"}
            accessibilityRole="button"
            disabled={!canDismissPaywall}
            onPress={handleClose}
            scale={0.94}
            style={[
              styles.closeButton,
              canDismissPaywall ? styles.closeButtonEnabled : styles.closeButtonDisabled,
            ]}
          >
            <X color={TEXT_PRIMARY} size={15} strokeWidth={2.5} />
          </LuxPressable>
        </MotiView>

        <MotiView
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          from={{ opacity: 0, scale: 0.96, translateY: 20 }}
          transition={{ type: "timing", duration: 420, delay: 80 }}
        >
          <Carousel<(typeof SHOWCASE_SLIDES)[number]>
            autoPlay
            autoPlayInterval={3200}
            data={[...SHOWCASE_SLIDES]}
            height={392}
            loop
            mode="parallax"
            modeConfig={{
              parallaxAdjacentItemScale: 0.88,
              parallaxScrollingOffset: 54,
              parallaxScrollingScale: 0.93,
            }}
            onSnapToItem={setActiveSlide}
            pagingEnabled
            renderItem={({ item }) => <ShowcaseSlide item={item} slideWidth={carouselWidth} />}
            snapEnabled
            style={styles.carousel}
            width={carouselWidth}
          />

          <View style={styles.carouselDots}>
            {SHOWCASE_SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={[styles.carouselDot, index === activeSlide ? styles.carouselDotActive : null]}
              />
            ))}
          </View>
        </MotiView>

        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 18 }}
          transition={{ type: "timing", duration: 380, delay: 130 }}
        >
          <Text style={styles.title}>Unlock Unlimited Creativity</Text>
          <Text style={styles.subtitle}>
            Create more polished spaces, export at premium quality, and get faster AI results with Darkor Pro.
          </Text>
        </MotiView>

        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 18 }}
          style={styles.featurePanel}
          transition={{ type: "timing", duration: 380, delay: 180 }}
        >
          {FEATURE_ITEMS.map((feature) => (
            <FeatureRow key={feature} label={feature} />
          ))}
        </MotiView>

        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 18 }}
          style={styles.statusPanel}
          transition={{ type: "timing", duration: 380, delay: 220 }}
        >
          <Text style={styles.statusEyebrow}>Current Access</Text>
          <Text style={styles.statusTitle}>{accessSummary.title}</Text>
          <Text style={styles.statusBody}>{accessSummary.body}</Text>
        </MotiView>

        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 18 }}
          transition={{ type: "timing", duration: 380, delay: 260 }}
        >
          <PlanCard
            description="Up to 20 designs/week"
            onPress={() => handleSelectDuration("weekly")}
            periodLabel="per week"
            priceLabel={weeklyPriceLabel}
            selected={selectedDuration === "weekly"}
            title="Weekly Access"
            unavailable={Boolean(packages.length) && !weeklyPackage}
          />
        </MotiView>

        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 18 }}
          transition={{ type: "timing", duration: 380, delay: 310 }}
        >
          <PlanCard
            badge="Most Popular"
            description="Best Value: 80 designs/month"
            onPress={() => handleSelectDuration("yearly")}
            periodLabel="per year"
            priceLabel={yearlyPriceLabel}
            selected={selectedDuration === "yearly"}
            title="Yearly Pro"
            unavailable={Boolean(packages.length) && !yearlyPackage}
          />
        </MotiView>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 18 }}
          transition={{ type: "timing", duration: 380, delay: 360 }}
        >
          <LuxPressable
            accessibilityRole="button"
            disabled={ctaDisabled}
            glowColor={BRAND_RED}
            onPress={handlePurchase}
            scale={0.985}
            style={styles.ctaButton}
          >
            <LinearGradient
              colors={[BRAND_RED, "#D61B1B", BRAND_RED_DEEP]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.ctaGradient}
            >
              {isLoading ? (
                <View style={styles.ctaContent}>
                  <ActivityIndicator color={TEXT_PRIMARY} />
                  <Text style={styles.ctaText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaText}>Start Pro Access</Text>
                  <ArrowRight color={TEXT_PRIMARY} size={18} strokeWidth={2.6} />
                </View>
              )}
            </LinearGradient>
          </LuxPressable>
        </MotiView>

        <Text style={styles.ctaCaption}>
          {selectedPackage
            ? `Unlock premium generation with ${formatPriceLabel(selectedPackage) ?? "your selected plan"}.`
            : "Price will appear as soon as RevenueCat finishes loading your offering."}
        </Text>

        <View style={styles.footerLinks}>
          <Pressable disabled={isLoading} onPress={() => void handleRestore()}>
            <Text style={styles.footerLinkText}>Restore Purchase</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/terms-of-service")}>
            <Text style={styles.footerLinkText}>Terms of Service</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/privacy-policy")}>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    gap: 18,
  },
  topGlow: {
    position: "absolute",
    top: -96,
    right: -44,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: BRAND_RED_SOFT,
    opacity: 0.8,
    transform: [{ scale: 1.08 }],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerEyebrow: {
    color: "#F8D4CF",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  headerMeta: {
    marginTop: 4,
    color: TEXT_TERTIARY,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  closeButtonEnabled: {
    backgroundColor: CLOSE_BG,
    borderColor: CARD_BORDER,
  },
  closeButtonDisabled: {
    backgroundColor: CLOSE_BG_DISABLED,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  carousel: {
    alignSelf: "center",
  },
  carouselDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  carouselDotActive: {
    width: 24,
    backgroundColor: BRAND_RED,
  },
  showcaseCard: {
    alignSelf: "center",
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    boxShadow: "0px 24px 64px rgba(0, 0, 0, 0.35)",
  },
  showcaseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  kickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  kickerPillText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  showcaseStyleLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  showcaseFrameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  showcaseBeforeFrame: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#16161B",
  },
  showcaseAfterFrame: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#1C1C22",
  },
  showcaseImage: {
    width: "100%",
    height: "100%",
  },
  showcaseTag: {
    position: "absolute",
    left: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  showcaseResultPill: {
    position: "absolute",
    left: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  showcaseTagText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  showcaseAfterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  showcaseArrowWrap: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  showcaseArrowShell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  showcaseTitle: {
    marginTop: 16,
    color: TEXT_PRIMARY,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.35,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  title: {
    color: TEXT_PRIMARY,
    textAlign: "center",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.15,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  subtitle: {
    marginTop: 10,
    color: TEXT_SECONDARY,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 10,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  featurePanel: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 12,
    boxShadow: "0px 20px 44px rgba(0, 0, 0, 0.22)",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  statusPanel: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 6,
  },
  statusEyebrow: {
    color: "#F5C5BE",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  statusTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  statusBody: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  planCard: {
    borderRadius: 28,
    overflow: "hidden",
  },
  planCardIdle: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  planCardSelected: {
    borderWidth: 1.5,
    borderColor: CARD_BORDER_SELECTED,
    boxShadow: "0px 22px 56px rgba(235, 59, 59, 0.18)",
  },
  planCardUnavailable: {
    opacity: 0.55,
  },
  planCardInner: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 104,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  planBadge: {
    position: "absolute",
    right: 16,
    top: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: BRAND_RED,
  },
  planBadgeText: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.85,
    textTransform: "uppercase",
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  planSelectionDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  planSelectionDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BRAND_RED,
  },
  planCopyBlock: {
    flex: 1,
    paddingRight: 12,
  },
  planTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  planDescription: {
    marginTop: 6,
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  planPriceBlock: {
    alignItems: "flex-end",
  },
  planPrice: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  planPeriod: {
    marginTop: 4,
    color: TEXT_TERTIARY,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  errorText: {
    color: "#FF9D9D",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 8,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
  ctaButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  ctaGradient: {
    minHeight: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 18px 44px rgba(235, 59, 59, 0.38)",
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
  ctaCaption: {
    color: TEXT_TERTIARY,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: fonts.regular.fontWeight,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 2,
  },
  footerLinkText: {
    color: "#8F9098",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: fonts.medium.fontWeight,
  },
});
