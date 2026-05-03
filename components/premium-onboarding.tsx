import {BlurView} from "expo-blur";
import {Image} from "expo-image";
import * as Haptics from "expo-haptics";
import {LinearGradient} from "expo-linear-gradient";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {House, PencilRuler, type LucideIcon} from "lucide-react-native";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {
  ANALYTICS_EVENTS,
  captureAnalytics,
  identifyAnalytics,
} from "../lib/analytics";
import {persistHasFinishedOnboarding, readHasFinishedOnboarding} from "../lib/onboarding-storage";
import {fonts} from "../styles/typography";
import {useOnboardingDemoRender} from "./onboarding-demo-render-context";
import {NeonArrowDown} from "./ui/NeonArrowDown";
import {useViewerSession} from "./viewer-session-context";

const INTRO_IMAGE = require("../assets/media/onboarding/intro-diamond.png");
const ROLE_IMAGE = require("../assets/media/onboarding/role-neon-scan.png");
const DEMO_IMAGE = require("../assets/media/onboarding/demo-render.png");
const FINAL_IMAGE = require("../assets/media/onboarding/final-villa.png");
const BEFORE_IMAGE = require("../assets/media/before-empty-room.png");
const AFTER_IMAGE = require("../assets/media/render-after.png");

const NEON_BLUE = "#00B4FF";
const DEEP_BLUE = "#0066FF";
const STEP_COUNT = 4;
const PROGRESS_EASING = Easing.bezier(0.25, 0.46, 0.45, 0.94);

type SegmentId = "renovating_home" | "interior_designer";

type RoleOption = {
  id: SegmentId;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "renovating_home",
    Icon: House,
    title: "Homeowner",
    subtitle: "Visualize renovations before you commit.",
  },
  {
    id: "interior_designer",
    Icon: PencilRuler,
    title: "Interior Designer",
    subtitle: "Create client-ready concepts in minutes.",
  },
];

const STEP_IMAGES = [INTRO_IMAGE, ROLE_IMAGE, DEMO_IMAGE, FINAL_IMAGE];

function GlassPanel({
  children,
  contentStyle,
  style,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.glassPanelShell, style]}>
      <BlurView intensity={42} tint="dark" style={styles.glassPanel}>
        <View style={[styles.glassPanelInner, contentStyle]}>{children}</View>
      </BlurView>
    </View>
  );
}

function FadeInUpHeadline({children}: {children: string}) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(1, {duration: 360, easing: Easing.out(Easing.cubic)});
  }, [reveal]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{translateY: 18 - reveal.value * 18}],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.headline}>{children}</Text>
    </Animated.View>
  );
}

function FadeInUpBlock({children, style}: {children: ReactNode; style?: StyleProp<ViewStyle>}) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(1, {duration: 280, easing: Easing.out(Easing.cubic)});
  }, [reveal]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{translateY: 18 - reveal.value * 18}],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function LiquidProgressBar({step, totalSteps}: {step: number; totalSteps: number}) {
  const mountedRef = useRef(false);
  const progress = useSharedValue(step / totalSteps);

  useEffect(() => {
    const nextProgress = Math.max(0, Math.min(step / totalSteps, 1));

    if (!mountedRef.current) {
      progress.value = nextProgress;
      mountedRef.current = true;
      return;
    }

    progress.value = withTiming(nextProgress, {duration: 600, easing: PROGRESS_EASING});
  }, [progress, step, totalSteps]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      accessibilityLabel={`Progress ${Math.round((step / totalSteps) * 100)} percent`}
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round((step / totalSteps) * 100)}}
      style={styles.progressTrack}
    >
      <Animated.View style={[styles.progressFillMask, fillStyle]}>
        <LinearGradient colors={[NEON_BLUE, DEEP_BLUE]} start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}} style={styles.fillGradient} />
      </Animated.View>
    </View>
  );
}

function ParallaxBackgroundImage({
  index,
  source,
  stepProgress,
  width,
}: {
  index: number;
  source: number;
  stepProgress: SharedValue<number>;
  width: number;
}) {
  const imageOpacityStyle = useAnimatedStyle(() => {
    const distance = Math.abs(stepProgress.value - index);
    return {
      opacity: Math.max(0, 1 - distance),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.parallaxImageWrap,
        {
          left: index * width * 0.3 - width * 0.05,
          width: width * 1.1,
        },
        imageOpacityStyle,
      ]}
    >
      <Image source={source} style={styles.backgroundImage} contentFit="cover" />
    </Animated.View>
  );
}

function ParallaxBackground({stepIndex, width}: {stepIndex: number; width: number}) {
  const stepProgress = useSharedValue(stepIndex);

  useEffect(() => {
    stepProgress.value = withSpring(stepIndex, {
      damping: 20,
      stiffness: 95,
      mass: 0.9,
    });
  }, [stepIndex, stepProgress]);

  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{translateX: stepProgress.value * width * -0.3}],
  }));

  return (
    <View style={styles.backgroundLayer}>
      <Animated.View pointerEvents="none" style={[styles.parallaxStrip, parallaxStyle]}>
        {STEP_IMAGES.map((source, index) => (
          <ParallaxBackgroundImage
            index={index}
            key={`onboarding-background-${index}`}
            source={source}
            stepProgress={stepProgress}
            width={width}
          />
        ))}
      </Animated.View>
      <LinearGradient
        colors={["rgba(2,13,30,0.12)", "rgba(1,8,20,0.62)", "rgba(0,0,0,0.94)"]}
        locations={[0, 0.5, 1]}
        style={styles.darkOverlay}
      />
      <LinearGradient
        colors={["rgba(0,180,255,0.24)", "rgba(0,102,255,0.08)", "rgba(0,0,0,0)"]}
        end={{x: 0.92, y: 1}}
        start={{x: 0.08, y: 0}}
        style={styles.brandWash}
      />
    </View>
  );
}

function RoleOptionCard({
  Icon,
  onPress,
  selected,
  shouldDim,
  subtitle,
  title,
}: {
  Icon: LucideIcon;
  onPress: () => void;
  selected: boolean;
  shouldDim: boolean;
  subtitle: string;
  title: string;
}) {
  const selectProgress = useSharedValue(selected ? 1 : 0);
  const opacity = useSharedValue(shouldDim ? 0.55 : 1);

  useEffect(() => {
    selectProgress.value = withSpring(selected ? 1 : 0, {
      damping: 14,
      stiffness: 180,
      mass: 0.75,
    });
  }, [selectProgress, selected]);

  useEffect(() => {
    opacity.value = withTiming(shouldDim ? 0.55 : 1, {duration: 220, easing: Easing.out(Easing.cubic)});
  }, [opacity, shouldDim]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{scale: 1 + selectProgress.value * 0.02}],
  }));

  return (
    <Animated.View
      style={[
        styles.optionFrame,
        selected ? styles.optionFrameSelected : null,
        cardStyle,
      ]}
    >
      <BlurView intensity={38} tint="dark" style={styles.optionBlur}>
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.optionPressable}>
          <View style={[styles.optionIconFrame, selected ? styles.optionIconFrameSelected : null]}>
            <Icon color={selected ? NEON_BLUE : "rgba(255,255,255,0.82)"} size={26} strokeWidth={2.5} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionSubtitle}>{subtitle}</Text>
          </View>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

function DemoSplitPreview() {
  return (
    <View style={styles.demoPreview}>
      <View style={styles.demoPreviewHalf}>
        <Image contentFit="cover" source={BEFORE_IMAGE} style={styles.demoPreviewImage} />
      </View>
      <View style={[styles.demoPreviewHalf, styles.demoPreviewAfter]}>
        <Image contentFit="cover" source={AFTER_IMAGE} style={styles.demoPreviewImage} />
      </View>
      <View pointerEvents="none" style={styles.splitDivider}>
        <View style={styles.splitLine} />
        <View style={styles.splitHandle}>
          <Text style={styles.splitHandleText}>||</Text>
        </View>
      </View>
    </View>
  );
}

function DemoRenderProgressPanel() {
  const [statusText, setStatusText] = useState("Analyzing room...");
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {duration: 2000, easing: Easing.inOut(Easing.cubic)});

    const styleTimer = setTimeout(() => setStatusText("Applying style..."), 720);
    const readyTimer = setTimeout(() => setStatusText("4K concept ready ✓"), 1480);

    return () => {
      clearTimeout(styleTimer);
      clearTimeout(readyTimer);
    };
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <GlassPanel contentStyle={styles.demoProgressContent} style={styles.demoProgressPanel}>
      <View style={styles.demoProgressHeader}>
        <Text style={styles.demoProgressTitle}>Fast render</Text>
        <Text style={styles.demoProgressPercent}>100%</Text>
      </View>
      <View style={styles.demoProgressTrack}>
        <Animated.View style={[styles.demoProgressFillMask, progressStyle]}>
          <LinearGradient colors={[NEON_BLUE, DEEP_BLUE]} start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}} style={styles.fillGradient} />
        </Animated.View>
      </View>
      <Text style={styles.demoStatusText}>{statusText}</Text>
    </GlassPanel>
  );
}

function DiamondClaimPanel() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 900, easing: Easing.out(Easing.cubic)}),
        withTiming(0, {duration: 900, easing: Easing.in(Easing.cubic)}),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.62 + pulse.value * 0.24,
    transform: [{scale: 0.96 + pulse.value * 0.08}],
  }));

  return (
    <GlassPanel contentStyle={styles.claimContent}>
      <Text style={styles.eyebrow}>STEP 4 OF 4</Text>
      <View style={styles.diamondWrap}>
        <Animated.View style={[styles.diamondGlow, glowStyle]} />
        <Text style={styles.diamondIcon}>💎</Text>
      </View>
      <FadeInUpHeadline>Your first Diamond is waiting.</FadeInUpHeadline>
      <Text style={[styles.subtext, styles.centerText]}>
        Every day you open the app, a new Diamond is added to your vault. Each one unlocks a premium AI render.
      </Text>
      <View accessibilityRole="button" style={styles.claimButton}>
        <Text style={styles.primaryButtonText}>Claim My Diamond ✦</Text>
      </View>
    </GlassPanel>
  );
}

type PremiumOnboardingProps = {
  forceVisible?: boolean;
};

export function PremiumOnboarding({forceVisible = false}: PremiumOnboardingProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {height, width} = useWindowDimensions();
  const posthog = usePostHog();
  const {anonymousId, isReady: viewerReady} = useViewerSession();
  const {imageUrl: demoImageUrl, startDemoRender, status: demoRenderStatus} = useOnboardingDemoRender();
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [segment, setSegment] = useState<SegmentId | null>(null);
  const startedRef = useRef(false);
  const previousStepIndexRef = useRef(stepIndex);
  const overlayOpacity = useSharedValue(1);
  const continueReveal = useSharedValue(1);

  const stepNumber = stepIndex + 1;
  const isLastStep = stepIndex === STEP_COUNT - 1;
  const isCompact = height < 740;
  const canContinue = (stepIndex !== 1 || Boolean(segment)) && !isLastStep;

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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [stepIndex, visible]);

  useEffect(() => {
    const shouldShowContinue = stepIndex !== 1 || Boolean(segment);
    continueReveal.value = shouldShowContinue
      ? withSpring(1, {stiffness: 100, damping: 16, mass: 0.85})
      : withTiming(0, {duration: 180, easing: Easing.out(Easing.cubic)});
  }, [continueReveal, segment, stepIndex]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: continueReveal.value,
    transform: [{translateY: (1 - continueReveal.value) * 40}],
  }));

  const handleSelectSegment = useCallback(
    (nextSegment: SegmentId) => {
      void Haptics.selectionAsync().catch(() => undefined);
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

  useEffect(() => {
    if (!visible || !viewerReady) {
      return;
    }

    void startDemoRender();
  }, [startDemoRender, viewerReady, visible]);

  const finishOnboarding = useCallback(async (
    skipped: boolean,
    destination: "tabs" | "wow" | "paywall",
  ) => {
    if (isExiting) {
      return;
    }

    if (skipped) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    setIsExiting(true);
    try {
      await persistHasFinishedOnboarding();
      captureAnalytics(posthog, ANALYTICS_EVENTS.onboardingCompleted, {
        onboarding_use_case: segment,
        skipped,
      });

      if (destination === "wow") {
        router.replace("/wow-reveal" as any);
      } else if (destination === "paywall") {
        router.replace({
          pathname: "/paywall",
          params: {
            source: "post_wow",
            variant: "soft",
            redirectTo: "/(tabs)",
          },
        } as never);
      } else {
        router.replace("/(tabs)" as any);
      }
      dismissOnboarding();
    } catch {
      setIsExiting(false);
    }
  }, [
    dismissOnboarding,
    isExiting,
    posthog,
    router,
    segment,
  ]);

  useEffect(() => {
    if (!visible || stepIndex !== STEP_COUNT - 1 || isExiting) {
      return;
    }

    if (demoRenderStatus === "success" && demoImageUrl) {
      void finishOnboarding(false, "wow");
      return;
    }

    if (demoRenderStatus === "failed") {
      void finishOnboarding(false, "paywall");
    }
  }, [demoImageUrl, demoRenderStatus, finishOnboarding, isExiting, stepIndex, visible]);

  const handleContinue = useCallback(async () => {
    if (!canContinue || isExiting) {
      return;
    }

    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, STEP_COUNT - 1));
      return;
    }
  }, [canContinue, isExiting, isLastStep]);

  const primaryLabel = stepIndex === 2 ? "Try This" : "Continue";

  const body = useMemo(() => {
    if (stepIndex === 0) {
      return (
        <GlassPanel>
          <Text style={styles.eyebrow}>STEP 1 OF 4</Text>
          <FadeInUpHeadline>Redefine Your Space with AI.</FadeInUpHeadline>
          <Text style={styles.subtext}>
            Turn rough concepts, empty rooms, and outdoor facades into hyper-realistic 4K renders in seconds.
          </Text>
        </GlassPanel>
      );
    }

    if (stepIndex === 1) {
      return (
        <GlassPanel>
          <Text style={styles.eyebrow}>STEP 2 OF 4</Text>
          <FadeInUpHeadline>Tailor Your AI Studio.</FadeInUpHeadline>
          <Text style={styles.subtext}>Personalize your engine. Are you redesigning your own home, or pitching to clients?</Text>
          <View style={styles.optionStack}>
            {ROLE_OPTIONS.map((option) => {
              const selected = segment === option.id;
              return (
                <RoleOptionCard
                  Icon={option.Icon}
                  key={option.id}
                  onPress={() => handleSelectSegment(option.id)}
                  selected={selected}
                  shouldDim={Boolean(segment) && !selected}
                  subtitle={option.subtitle}
                  title={option.title}
                />
              );
            })}
          </View>
        </GlassPanel>
      );
    }

    if (stepIndex === 2) {
      return (
        <GlassPanel>
          <Text style={styles.eyebrow}>STEP 3 OF 4</Text>
          <FadeInUpHeadline>Watch the magic happen.</FadeInUpHeadline>
          <Text style={styles.subtext}>
            Tap Try This and see a real AI render come to life - this is exactly what your designs will look like.
          </Text>
          <DemoSplitPreview />
          <DemoRenderProgressPanel />
        </GlassPanel>
      );
    }

    return <DiamondClaimPanel />;
  }, [handleSelectSegment, segment, stepIndex]);

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
        <ParallaxBackground stepIndex={stepIndex} width={width} />

        <Pressable
          accessibilityRole="button"
          disabled={isExiting}
          onPress={() => void finishOnboarding(true, "tabs")}
          style={[styles.skipButton, {top: insets.top + 16}, isExiting ? styles.skipButtonDisabled : null]}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>

        <View style={styles.topBar}>
          <LiquidProgressBar step={stepNumber} totalSteps={STEP_COUNT} />
        </View>

        <FadeInUpBlock
          key={stepIndex}
          style={[styles.content, isCompact ? styles.contentCompact : null]}
        >
          {body}
        </FadeInUpBlock>

        <View style={styles.footer}>
          {!isLastStep ? (
            <Animated.View style={[styles.primaryButtonWrap, continueButtonAnimatedStyle]}>
              <NeonArrowDown style={styles.ctaArrow} />
              <Pressable
                accessibilityRole="button"
                disabled={!canContinue || isExiting}
                onPress={() => void handleContinue()}
                style={[styles.primaryButton, !canContinue || isExiting ? styles.primaryButtonDisabled : null]}
              >
                <LinearGradient colors={[NEON_BLUE, DEEP_BLUE]} start={{x: 0, y: 0.5}} end={{x: 1, y: 0.5}} style={styles.primaryButtonGradient}>
                  <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : null}
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
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: "#020814",
    overflow: "hidden",
  },
  parallaxStrip: {
    ...StyleSheet.absoluteFillObject,
  },
  parallaxImageWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  brandWash: {
    ...StyleSheet.absoluteFillObject,
  },
  skipButton: {
    position: "absolute",
    right: 20,
    zIndex: 4,
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skipButtonDisabled: {
    opacity: 0.45,
  },
  skipButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    ...fonts.regular,
  },
  topBar: {
    zIndex: 2,
    paddingHorizontal: 20,
  },
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  progressFillMask: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  fillGradient: {
    flex: 1,
  },
  content: {
    zIndex: 2,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 18,
    paddingBottom: 18,
  },
  contentCompact: {
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  glassPanelShell: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 24,
    borderCurve: "continuous",
    shadowColor: "#000000",
    shadowOffset: {width: 0, height: 18},
    shadowOpacity: 0.34,
    shadowRadius: 34,
    elevation: 12,
  },
  glassPanel: {
    width: "100%",
    borderRadius: 24,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(8, 18, 34, 0.54)",
    overflow: "hidden",
  },
  glassPanelInner: {
    gap: 18,
    padding: 26,
  },
  eyebrow: {
    color: "rgba(0,180,255,0.9)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    letterSpacing: 0,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
    fontWeight: "800",
    fontFamily: fonts.bold.fontFamily,
    textAlign: "left",
  },
  subtext: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: "400",
    fontFamily: fonts.regular.fontFamily,
    textAlign: "left",
  },
  centerText: {
    textAlign: "center",
  },
  optionStack: {
    width: "100%",
    gap: 12,
    paddingTop: 2,
  },
  optionFrame: {
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(8, 18, 34, 0.5)",
    shadowColor: NEON_BLUE,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  optionFrameSelected: {
    borderColor: "rgba(0,180,255,0.96)",
    backgroundColor: "rgba(0,180,255,0.13)",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 9,
  },
  optionBlur: {
    width: "100%",
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  optionPressable: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 22,
  },
  optionIconFrame: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionIconFrameSelected: {
    borderColor: "rgba(0,180,255,0.72)",
    backgroundColor: "rgba(0,180,255,0.16)",
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: fonts.bold.fontFamily,
  },
  optionSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    fontFamily: fonts.regular.fontFamily,
  },
  demoPreview: {
    width: "100%",
    height: 178,
    borderRadius: 18,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  demoPreviewHalf: {
    width: "50%",
    height: "100%",
    overflow: "hidden",
  },
  demoPreviewAfter: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.16)",
  },
  demoPreviewImage: {
    width: "100%",
    height: "100%",
  },
  splitDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 34,
    marginLeft: -17,
    alignItems: "center",
    justifyContent: "center",
  },
  splitLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
  },
  splitHandle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(0, 0, 0, 0.44)",
  },
  splitHandleText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0,
    fontFamily: fonts.bold.fontFamily,
  },
  demoProgressPanel: {
    maxWidth: "100%",
  },
  demoProgressContent: {
    gap: 10,
    padding: 24,
  },
  demoProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  demoProgressTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: fonts.bold.fontFamily,
  },
  demoProgressPercent: {
    color: "rgba(0,180,255,0.9)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontFamily: fonts.bold.fontFamily,
  },
  demoProgressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  demoProgressFillMask: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  demoStatusText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: "400",
    fontFamily: fonts.regular.fontFamily,
  },
  claimContent: {
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  diamondWrap: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  diamondGlow: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(0, 180, 255, 0.28)",
    shadowColor: NEON_BLUE,
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 0},
  },
  diamondIcon: {
    fontSize: 72,
    lineHeight: 86,
    textAlign: "center",
  },
  claimButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NEON_BLUE,
  },
  footer: {
    zIndex: 2,
    alignItems: "center",
  },
  primaryButtonWrap: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 390,
  },
  ctaArrow: {
    alignSelf: "center",
    marginBottom: 10,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
    width: "100%",
    backgroundColor: NEON_BLUE,
    shadowColor: NEON_BLUE,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonGradient: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  primaryButtonDisabled: {
    opacity: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0,
    fontFamily: fonts.bold.fontFamily,
  },
});
