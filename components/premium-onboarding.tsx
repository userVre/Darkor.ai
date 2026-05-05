import * as Haptics from "expo-haptics";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
import {useViewerSession} from "./viewer-session-context";

const STEP_COUNT = 3;
const PURE_WHITE = "#FFFFFF";
const BLACK = "#000000";
const DARK_GRAY = "#3A3A3A";
const LIGHT_GRAY = "#F4F4F4";
const MID_GRAY = "#D8D8D8";

type SegmentId = "renovating_home" | "interior_designer";

type RoleOption = {
  id: SegmentId;
  title: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "renovating_home",
    title: "Homeowner",
  },
  {
    id: "interior_designer",
    title: "Interior Designer",
  },
];

function StepShell({children}: {children: ReactNode}) {
  return <View style={styles.stepShell}>{children}</View>;
}

function ProgressDots({step}: {step: number}) {
  return (
    <View accessibilityLabel={`Step ${step} of ${STEP_COUNT}`} style={styles.dots}>
      {Array.from({length: STEP_COUNT}).map((_, index) => (
        <View
          key={`onboarding-dot-${index}`}
          style={[styles.dot, index + 1 === step ? styles.dotActive : null]}
        />
      ))}
    </View>
  );
}

function RoleOptionCard({
  onPress,
  selected,
  title,
}: {
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={[styles.optionCard, selected ? styles.optionCardSelected : null]}
    >
      <Text style={[styles.optionTitle, selected ? styles.optionTitleSelected : null]}>{title}</Text>
    </Pressable>
  );
}

function DiamondProgress() {
  return (
    <View style={styles.diamondProgressWrap}>
      <View style={styles.diamondProgressHeader}>
        <Text style={styles.diamondProgressLabel}>1 Free Diamond</Text>
        <Text style={styles.diamondProgressValue}>100%</Text>
      </View>
      <View
        accessibilityLabel="1 Free Diamond progress"
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max: 100, now: 100}}
        style={styles.diamondProgressTrack}
      >
        <View style={styles.diamondProgressFill} />
      </View>
    </View>
  );
}

type PremiumOnboardingProps = {
  forceVisible?: boolean;
};

export function PremiumOnboarding({forceVisible = false}: PremiumOnboardingProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const stepNumber = stepIndex + 1;
  const isLastStep = stepIndex === STEP_COUNT - 1;
  const canContinue = stepIndex !== 1 || Boolean(segment);
  const isDemoReady = (demoRenderStatus === "success" && Boolean(demoImageUrl)) || demoRenderStatus === "failed";

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

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
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
    overlayOpacity.value = withTiming(0, {duration: 180, easing: Easing.out(Easing.cubic)});
    setTimeout(() => {
      setVisible(false);
      setIsExiting(false);
    }, 180);
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

  const handleContinue = useCallback(() => {
    if (!canContinue || isExiting) {
      return;
    }

    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, STEP_COUNT - 1));
    }
  }, [canContinue, isExiting, isLastStep]);

  const handleStartDesign = useCallback(() => {
    if (!isDemoReady) {
      return;
    }

    const destination = demoRenderStatus === "success" && demoImageUrl
      ? "wow"
      : demoRenderStatus === "failed"
        ? "paywall"
        : "wow";

    void finishOnboarding(false, destination);
  }, [demoImageUrl, demoRenderStatus, finishOnboarding, isDemoReady]);

  const body = useMemo(() => {
    if (stepIndex === 0) {
      return (
        <StepShell>
          <Text style={styles.headline}>Design in seconds</Text>
          <Text style={styles.subtext}>Upload. Choose. Render.</Text>
        </StepShell>
      );
    }

    if (stepIndex === 1) {
      return (
        <StepShell>
          <Text style={styles.headline}>Select your role</Text>
          <View style={styles.optionStack}>
            {ROLE_OPTIONS.map((option) => (
              <RoleOptionCard
                key={option.id}
                onPress={() => handleSelectSegment(option.id)}
                selected={segment === option.id}
                title={option.title}
              />
            ))}
          </View>
        </StepShell>
      );
    }

    return (
      <StepShell>
        <Text style={styles.headline}>Start creating</Text>
        <DiamondProgress />
        <Pressable
          accessibilityRole="button"
          disabled={isExiting || !isDemoReady}
          onPress={handleStartDesign}
          style={[styles.finalButton, isExiting || !isDemoReady ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.finalButtonText}>{isDemoReady ? "Start designing" : "Preparing"}</Text>
        </Pressable>
      </StepShell>
    );
  }, [handleSelectSegment, handleStartDesign, isDemoReady, isExiting, segment, stepIndex]);

  if (isCheckingStorage || !visible) {
    return null;
  }

  return (
    <Animated.View pointerEvents="auto" style={[styles.overlay, overlayStyle]}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={isExiting}
          onPress={() => void finishOnboarding(true, "tabs")}
          style={[styles.skipButton, {top: insets.top + 14}, isExiting ? styles.skipButtonDisabled : null]}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>

        <ProgressDots step={stepNumber} />

        <View style={styles.content}>{body}</View>

        {!isLastStep ? (
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue || isExiting}
            onPress={handleContinue}
            style={[styles.primaryButton, !canContinue || isExiting ? styles.primaryButtonDisabled : null]}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        ) : (
          <View style={styles.footerSpacer} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: PURE_WHITE,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: PURE_WHITE,
  },
  skipButton: {
    position: "absolute",
    right: 20,
    zIndex: 4,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipButtonDisabled: {
    opacity: 0.45,
  },
  skipButtonText: {
    color: DARK_GRAY,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  dots: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MID_GRAY,
  },
  dotActive: {
    backgroundColor: BLACK,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepShell: {
    width: "100%",
    maxWidth: 390,
    alignItems: "stretch",
    gap: 18,
  },
  headline: {
    color: BLACK,
    fontSize: 42,
    lineHeight: 48,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "left",
  },
  subtext: {
    color: DARK_GRAY,
    fontSize: 18,
    lineHeight: 26,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0.3,
    textAlign: "left",
  },
  optionStack: {
    width: "100%",
    gap: 12,
    paddingTop: 8,
  },
  optionCard: {
    minHeight: 64,
    justifyContent: "center",
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: LIGHT_GRAY,
    paddingHorizontal: 20,
  },
  optionCardSelected: {
    backgroundColor: BLACK,
  },
  optionTitle: {
    color: DARK_GRAY,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  optionTitleSelected: {
    color: PURE_WHITE,
  },
  diamondProgressWrap: {
    width: "100%",
    gap: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  diamondProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  diamondProgressLabel: {
    color: BLACK,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  diamondProgressValue: {
    color: DARK_GRAY,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  diamondProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: LIGHT_GRAY,
  },
  diamondProgressFill: {
    width: "100%",
    height: "100%",
    backgroundColor: BLACK,
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 999,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLACK,
  },
  primaryButtonDisabled: {
    opacity: 0.3,
  },
  primaryButtonText: {
    color: PURE_WHITE,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  finalButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 999,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLACK,
    marginTop: 6,
  },
  finalButtonText: {
    color: PURE_WHITE,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footerSpacer: {
    minHeight: 56,
  },
});
