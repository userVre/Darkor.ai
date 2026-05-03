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
          <Text style={styles.headline}>Design in seconds.</Text>
          <Text style={styles.subtext}>Turn ideas into 4K renders.</Text>
        </StepShell>
      );
    }

    if (stepIndex === 1) {
      return (
        <StepShell>
          <Text style={styles.headline}>Who are you?</Text>
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
        <Text style={styles.headline}>Ready.</Text>
        <DiamondProgress />
        <Pressable
          accessibilityRole="button"
          disabled={isExiting || !isDemoReady}
          onPress={handleStartDesign}
          style={[styles.finalButton, isExiting || !isDemoReady ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.finalButtonText}>{isDemoReady ? "Start your first design" : "Preparing your demo..."}</Text>
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
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
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
    color: "#111111",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
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
    backgroundColor: "#D8D8D8",
  },
  dotActive: {
    backgroundColor: "#000000",
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
    color: "#000000",
    fontSize: 44,
    lineHeight: 50,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "left",
  },
  subtext: {
    color: "#111111",
    fontSize: 18,
    lineHeight: 26,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
    textAlign: "left",
  },
  optionStack: {
    width: "100%",
    gap: 12,
    paddingTop: 8,
  },
  optionCard: {
    minHeight: 76,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  optionCardSelected: {
    borderColor: "#000000",
    backgroundColor: "#F7F7F7",
  },
  optionTitle: {
    color: "#111111",
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0,
  },
  optionTitleSelected: {
    color: "#000000",
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
    color: "#000000",
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0,
  },
  diamondProgressValue: {
    color: "#111111",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
  },
  diamondProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#E8E8E8",
  },
  diamondProgressFill: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  primaryButtonDisabled: {
    opacity: 0.3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0,
  },
  finalButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    marginTop: 6,
  },
  finalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: "600",
    letterSpacing: 0,
  },
  footerSpacer: {
    minHeight: 56,
  },
});
