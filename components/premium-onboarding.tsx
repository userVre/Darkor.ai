import {Image} from "expo-image";
import {LinearGradient} from "expo-linear-gradient";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {MotiView} from "moti";
import {Home, PenTool, Sparkles} from "lucide-react-native";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useMemo, useRef, useState, type ComponentType} from "react";
import {useTranslation} from "react-i18next";
import {Pressable, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {Circle, Defs, Line, LinearGradient as SvgLinearGradient, Polygon, Stop} from "react-native-svg";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {
  ANALYTICS_EVENTS,
  captureAnalytics,
  identifyAnalytics,
} from "../lib/analytics";
import {persistHasFinishedOnboarding, readHasFinishedOnboarding} from "../lib/onboarding-storage";
import {triggerHaptic} from "../lib/haptics";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon} from "./diamond-credit-pill";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const INTRO_IMAGE = require("../assets/media/onboarding/intro-diamond.png");
const ROLE_IMAGE = require("../assets/media/onboarding/role-neon-scan.png");
const DEMO_IMAGE = require("../assets/media/onboarding/demo-render.png");
const FINAL_IMAGE = require("../assets/media/onboarding/final-villa.png");

const NEON_BLUE = "#00A3FF";
const NEON_BLUE_LIGHT = "#7DD3FF";
const GOLD = "#F5B544";
const STEP_COUNT = 4;

type SegmentId = "renovating_home" | "interior_designer";

type RoleOption = {
  id: SegmentId;
  labelKey: string;
  fallback: string;
  Icon: ComponentType<{color?: string; size?: number; strokeWidth?: number}>;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "renovating_home",
    labelKey: "onboarding.step2.options.homeowner",
    fallback: "Homeowner",
    Icon: Home,
  },
  {
    id: "interior_designer",
    labelKey: "onboarding.step2.options.designer",
    fallback: "Designer",
    Icon: PenTool,
  },
];

const STEP_IMAGES = [INTRO_IMAGE, ROLE_IMAGE, DEMO_IMAGE, FINAL_IMAGE];

function FadeInUpHeadline({
  children,
  variant = "headline",
}: {
  children: string;
  variant?: "headline" | "question";
}) {
  return (
    <MotiView
      from={{opacity: 0, translateY: 18}}
      animate={{opacity: 1, translateY: 0}}
      transition={{type: "timing", duration: 360, delay: 80}}
    >
      <Text style={variant === "question" ? styles.question : styles.headline}>{children}</Text>
    </MotiView>
  );
}

function NeonArrowGuide({visible}: {visible: boolean}) {
  const pulse = useSharedValue(0);
  const comet = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      pulse.value = 0;
      comet.value = 0;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 720, easing: Easing.out(Easing.cubic)}),
        withTiming(0, {duration: 520, easing: Easing.in(Easing.cubic)}),
      ),
      -1,
      false,
    );
    comet.value = withRepeat(
      withTiming(1, {duration: 1240, easing: Easing.inOut(Easing.cubic)}),
      -1,
      false,
    );
  }, [comet, pulse, visible]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: visible ? 0.58 + pulse.value * 0.42 : 0,
    transform: [
      {translateY: -18 + pulse.value * 18},
      {scale: 0.96 + pulse.value * 0.08},
    ],
  }));

  const cometStyle = useAnimatedStyle(() => ({
    opacity: visible ? 0.15 + (1 - Math.abs(comet.value - 0.65)) * 0.85 : 0,
    transform: [{translateY: -24 + comet.value * 56}],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.neonGuide, pulseStyle]}>
      <Svg width={82} height={90} viewBox="0 0 82 90">
        <Defs>
          <SvgLinearGradient id="guideStroke" x1="41" y1="0" x2="41" y2="90">
            <Stop offset="0" stopColor={NEON_BLUE_LIGHT} stopOpacity="0" />
            <Stop offset="0.18" stopColor={NEON_BLUE_LIGHT} stopOpacity="0.78" />
            <Stop offset="0.78" stopColor={NEON_BLUE} stopOpacity="1" />
            <Stop offset="1" stopColor={NEON_BLUE_LIGHT} stopOpacity="0.3" />
          </SvgLinearGradient>
        </Defs>
        <Line x1="41" y1="8" x2="41" y2="58" stroke={NEON_BLUE} strokeWidth={18} strokeLinecap="round" opacity={0.12} />
        <Line x1="41" y1="8" x2="41" y2="58" stroke={NEON_BLUE_LIGHT} strokeWidth={9} strokeLinecap="round" opacity={0.2} />
        <Line x1="41" y1="8" x2="41" y2="58" stroke="url(#guideStroke)" strokeWidth={4.5} strokeLinecap="round" />
        <Polygon points="41,82 20,54 62,54" fill={NEON_BLUE} opacity={0.2} />
        <Polygon points="41,76 25,56 57,56" fill={NEON_BLUE_LIGHT} opacity={0.48} />
        <Polygon points="41,71 29,57 53,57" fill="#DDF6FF" opacity={0.95} />
        <Circle cx="41" cy="8" r="4.5" fill="#DDF6FF" opacity={0.9} />
      </Svg>
      <Animated.View style={[styles.neonComet, cometStyle]} />
    </Animated.View>
  );
}

function DemoRenderOverlay({
  stepIndex,
  screenHeight,
}: {
  stepIndex: number;
  screenHeight: number;
}) {
  const scanProgress = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    if (stepIndex !== 2) {
      scanProgress.value = 0;
      reveal.value = 0;
      return;
    }

    scanProgress.value = 0;
    reveal.value = 0;
    scanProgress.value = withRepeat(
      withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.cubic)}),
      -1,
      false,
    );
    reveal.value = withDelay(520, withTiming(1, {duration: 620, easing: Easing.out(Easing.cubic)}));
  }, [reveal, scanProgress, stepIndex]);

  const scanStyle = useAnimatedStyle(() => ({
    opacity: stepIndex === 2 ? 1 : 0,
    transform: [{translateY: -80 + scanProgress.value * (screenHeight + 120)}],
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{translateY: 10 - reveal.value * 10}],
  }));

  if (stepIndex !== 2) {
    return null;
  }

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.renderSweep, scanStyle]} />
      <Animated.View pointerEvents="none" style={[styles.demoHud, revealStyle]}>
        <View style={styles.demoHudHeader}>
          <Sparkles color={NEON_BLUE_LIGHT} size={16} strokeWidth={2.4} />
          <Text style={styles.demoHudTitle}>Fast render</Text>
        </View>
        <View style={styles.demoProgressTrack}>
          <View style={styles.demoProgressFill} />
        </View>
        <Text style={styles.demoHudMeta}>4K concept ready</Text>
      </Animated.View>
    </>
  );
}

type PremiumOnboardingProps = {
  forceVisible?: boolean;
};

export function PremiumOnboarding({forceVisible = false}: PremiumOnboardingProps) {
  const {t} = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {height, width} = useWindowDimensions();
  const posthog = usePostHog();
  const {anonymousId, isReady: viewerReady} = useViewerSession();
  const {credits, setOptimisticCredits} = useViewerCredits();
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [segment, setSegment] = useState<SegmentId | null>(null);
  const startedRef = useRef(false);
  const previousStepIndexRef = useRef(stepIndex);
  const overlayOpacity = useSharedValue(1);

  const stepNumber = stepIndex + 1;
  const isLastStep = stepIndex === STEP_COUNT - 1;
  const isCompact = height < 740;
  const canContinue = (stepIndex !== 1 || Boolean(segment)) && (!isLastStep || viewerReady);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (forceVisible) {
        if (!active) {
          return;
        }

        setVisible(true);
        setIsCheckingStorage(false);
        if (!startedRef.current) {
          startedRef.current = true;
          captureAnalytics(posthog, ANALYTICS_EVENTS.onboardingStarted);
        }
        return;
      }

      const shouldShow = !(await readHasFinishedOnboarding());
      if (!active) {
        return;
      }

      setVisible(shouldShow);
      setIsCheckingStorage(false);
      if (shouldShow && !startedRef.current) {
        startedRef.current = true;
        captureAnalytics(posthog, ANALYTICS_EVENTS.onboardingStarted);
      }
    })();

    return () => {
      active = false;
    };
  }, [forceVisible, posthog]);

  useEffect(() => {
    if (!visible) {
      previousStepIndexRef.current = stepIndex;
      return;
    }

    if (previousStepIndexRef.current === stepIndex) {
      return;
    }

    previousStepIndexRef.current = stepIndex;
    triggerHaptic();
  }, [stepIndex, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleSelectSegment = useCallback(
    (nextSegment: SegmentId) => {
      triggerHaptic();
      setSegment(nextSegment);
      identifyAnalytics(posthog, anonymousId, {
        onboarding_use_case: nextSegment,
      });
      captureAnalytics(posthog, "onboarding_segment_selected", {
        onboarding_use_case: nextSegment,
      });
    },
    [anonymousId, posthog],
  );

  useEffect(() => {
    if (!segment || !anonymousId) {
      return;
    }

    identifyAnalytics(posthog, anonymousId, {
      onboarding_use_case: segment,
    });
  }, [anonymousId, posthog, segment]);

  const dismissOnboarding = useCallback(() => {
    overlayOpacity.value = withTiming(0, {duration: 360, easing: Easing.out(Easing.cubic)});
    setTimeout(() => {
      setVisible(false);
      setIsExiting(false);
    }, 360);
  }, [overlayOpacity]);

  const finishOnboarding = useCallback(async (skipped: boolean) => {
    if (isExiting) {
      return;
    }

    triggerHaptic();
    setIsExiting(true);
    try {
      if (!skipped) {
        setOptimisticCredits(Math.max(credits, 1));
      }
      await persistHasFinishedOnboarding();
      captureAnalytics(posthog, ANALYTICS_EVENTS.onboardingCompleted, {
        onboarding_use_case: segment,
        skipped,
      });
      router.replace("/(tabs)" as any);
      dismissOnboarding();
    } catch {
      setIsExiting(false);
    }
  }, [
    credits,
    dismissOnboarding,
    isExiting,
    posthog,
    router,
    segment,
    setOptimisticCredits,
  ]);

  const handleContinue = useCallback(async () => {
    if (!canContinue || isExiting) {
      return;
    }

    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, STEP_COUNT - 1));
      return;
    }

    await finishOnboarding(false);
  }, [canContinue, finishOnboarding, isExiting, isLastStep]);

  const primaryLabel = stepIndex === 0
    ? t("onboarding.actions.tryThis", {defaultValue: "Try This"})
    : stepIndex === 2
      ? t("onboarding.actions.generate", {defaultValue: "Generate"})
      : isLastStep
        ? t("onboarding.step4.button", {defaultValue: "Claim My Diamond"})
        : t("onboarding.actions.continue", {defaultValue: "Continue"});

  const body = useMemo(() => {
    if (stepIndex === 0) {
      return (
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>{t("onboarding.stepLabel", {current: stepNumber})}</Text>
          <FadeInUpHeadline>{t("onboarding.step1.headline", {defaultValue: "Design faster than imagination."})}</FadeInUpHeadline>
          <Text style={styles.subtext}>
            {t("onboarding.step1.body", {
              defaultValue: "Turn rooms, gardens, facades, and concepts into premium AI renders with one guided flow.",
            })}
          </Text>
        </View>
      );
    }

    if (stepIndex === 1) {
      return (
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>{t("onboarding.stepLabel", {current: stepNumber})}</Text>
          <FadeInUpHeadline variant="question">
            {t("onboarding.step2.question", {defaultValue: "Which studio mode fits you?"})}
          </FadeInUpHeadline>
          <View style={styles.optionStack}>
            {ROLE_OPTIONS.map((option) => {
              const selected = segment === option.id;
              const Icon = option.Icon;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => handleSelectSegment(option.id)}
                  style={[styles.optionButton, selected ? styles.optionButtonSelected : null]}
                >
                  <View style={[styles.optionIcon, selected ? styles.optionIconSelected : null]}>
                    <Icon color={selected ? "#FFFFFF" : NEON_BLUE_LIGHT} size={21} strokeWidth={2.3} />
                  </View>
                  <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
                    {t(option.labelKey, {defaultValue: option.fallback})}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (stepIndex === 2) {
      return (
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>{t("onboarding.stepLabel", {current: stepNumber})}</Text>
          <FadeInUpHeadline variant="question">
            {t("onboarding.step3.headline", {defaultValue: "Preview a fast premium render."})}
          </FadeInUpHeadline>
          <Text style={styles.subtext}>
            {t("onboarding.step3.body", {
              defaultValue: "Tap Generate to watch the guided render flow and move into your first claim.",
            })}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.copyBlock}>
        <Text style={styles.eyebrow}>{t("onboarding.stepLabel", {current: stepNumber})}</Text>
        <View style={styles.claimBadge}>
          <DiamondCreditIcon primaryColor={GOLD} size={22} />
          <Text style={styles.claimBadgeText}>Daily Diamond</Text>
        </View>
        <FadeInUpHeadline>{t("onboarding.step4.headline", {defaultValue: "Claim 1 Diamond every 24h."})}</FadeInUpHeadline>
        <Text style={styles.subtext}>
          {t("onboarding.step4.body", {
            defaultValue: "You can claim 1 free Diamond every 24h. Each premium generation uses 1 Diamond, and your next one unlocks after the timer resets.",
          })}
        </Text>
      </View>
    );
  }, [handleSelectSegment, segment, stepIndex, stepNumber, t]);

  if (isCheckingStorage || !visible) {
    return null;
  }

  return (
    <Animated.View pointerEvents="auto" style={[styles.overlay, overlayStyle]}>
      <StatusBar style="light" />
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + (isCompact ? 18 : 28),
            paddingBottom: Math.max(insets.bottom + (isCompact ? 18 : 28), 28),
          },
        ]}
      >
        <View style={styles.backgroundLayer}>
          <Image source={STEP_IMAGES[stepIndex]} style={styles.backgroundImage} contentFit="cover" transition={280} />
          <LinearGradient
            colors={["rgba(0,0,0,0.16)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.88)"]}
            locations={[0, 0.48, 1]}
            style={styles.darkOverlay}
          />
          <DemoRenderOverlay stepIndex={stepIndex} screenHeight={height} />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isExiting}
          onPress={() => void finishOnboarding(true)}
          style={[styles.skipButton, {top: insets.top + 16}, isExiting ? styles.skipButtonDisabled : null]}
        >
          <Text style={styles.skipButtonText}>{t("onboarding.actions.skip", {defaultValue: "Skip"})}</Text>
        </Pressable>

        <View style={styles.topBar}>
          <View style={styles.progressRow}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {width: Math.max((width - 108) / STEP_COUNT, 42)},
                  index <= stepIndex ? styles.progressDotActive : null,
                ]}
              />
            ))}
          </View>
        </View>

        <MotiView
          key={stepIndex}
          from={{opacity: 0, translateY: 18}}
          animate={{opacity: 1, translateY: 0}}
          transition={{type: "timing", duration: 280}}
          style={[styles.content, isCompact ? styles.contentCompact : null]}
        >
          {body}
        </MotiView>

        <View style={styles.footer}>
          <NeonArrowGuide visible={canContinue && !isExiting} />
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue || isExiting}
            onPress={() => void handleContinue()}
            style={[styles.primaryButton, !canContinue || isExiting ? styles.primaryButtonDisabled : null]}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "#000000",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: "#000000",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  skipButton: {
    position: "absolute",
    right: 20,
    zIndex: 4,
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  skipButtonDisabled: {
    opacity: 0.45,
  },
  skipButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  topBar: {
    zIndex: 2,
    paddingRight: 68,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  progressDot: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  progressDotActive: {
    backgroundColor: NEON_BLUE_LIGHT,
  },
  content: {
    zIndex: 2,
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  contentCompact: {
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  copyBlock: {
    width: "100%",
    maxWidth: 430,
    alignItems: "flex-start",
    alignSelf: "flex-start",
    gap: 16,
  },
  eyebrow: {
    color: "rgba(221, 246, 255, 0.86)",
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 0,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 35,
    lineHeight: 40,
    letterSpacing: 0,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
    textAlign: "left",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 18,
  },
  question: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
    textAlign: "left",
    textShadowColor: "rgba(0, 0, 0, 0.48)",
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 18,
  },
  subtext: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 17,
    lineHeight: 25,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
    textAlign: "left",
    maxWidth: 390,
  },
  optionStack: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 255, 0.28)",
    backgroundColor: "rgba(2, 12, 24, 0.58)",
    paddingHorizontal: 16,
    boxShadow: "0px 0px 18px rgba(0, 163, 255, 0.1)",
  },
  optionButtonSelected: {
    borderColor: "rgba(125, 211, 255, 0.96)",
    backgroundColor: "rgba(0, 122, 255, 0.32)",
    boxShadow: "0px 0px 28px rgba(0, 163, 255, 0.34)",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125, 211, 255, 0.12)",
  },
  optionIconSelected: {
    backgroundColor: "rgba(125, 211, 255, 0.32)",
  },
  optionText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 23,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
    textAlign: "left",
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  footer: {
    zIndex: 2,
    alignItems: "center",
    gap: 0,
  },
  primaryButton: {
    minHeight: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NEON_BLUE,
    alignSelf: "center",
    width: "100%",
    maxWidth: 390,
    borderWidth: 1,
    borderColor: "rgba(221, 246, 255, 0.76)",
    boxShadow: "0px 0px 28px rgba(0, 163, 255, 0.45)",
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 23,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  neonGuide: {
    width: 82,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -8,
  },
  neonComet: {
    position: "absolute",
    top: 16,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DDF6FF",
    boxShadow: "0px 0px 22px rgba(0, 163, 255, 0.9)",
  },
  renderSweep: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 86,
    backgroundColor: "rgba(0, 163, 255, 0.14)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(125, 211, 255, 0.88)",
    boxShadow: "0px 0px 34px rgba(0, 163, 255, 0.72)",
  },
  demoHud: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 154,
    zIndex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 255, 0.24)",
    backgroundColor: "rgba(2, 12, 24, 0.62)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  demoHudHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoHudTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  demoProgressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  demoProgressFill: {
    width: "78%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: NEON_BLUE_LIGHT,
  },
  demoHudMeta: {
    color: "rgba(221, 246, 255, 0.86)",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
  claimBadge: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 19,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 181, 68, 0.44)",
    backgroundColor: "rgba(36, 22, 6, 0.58)",
  },
  claimBadgeText: {
    color: "#FFE6A8",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: fonts.bold.fontWeight,
  },
});
