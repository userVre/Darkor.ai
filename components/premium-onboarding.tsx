import * as Haptics from "expo-haptics";
import {useMutation} from "convex/react";
import {LinearGradient} from "expo-linear-gradient";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {ArrowRight, DraftingCompass, Gem, Gift, Settings, UserRound, type LucideIcon} from "lucide-react-native";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useRef, useState, type ReactNode} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import {
  ANALYTICS_EVENTS,
  captureAnalytics,
  identifyAnalytics,
} from "../lib/analytics";
import {persistHasFinishedOnboarding, readHasFinishedOnboarding} from "../lib/onboarding-storage";
import {fonts} from "../styles/typography";
import {useOnboardingDemoRender} from "./onboarding-demo-render-context";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const STEP_COUNT = 3;
const PURE_WHITE = "#FFFFFF";
const BLACK = "#000000";
const TEXT_MUTED = "#404653";
const SOFT_GRAY = "#F7F7F7";
const TRACK_GRAY = "#EAEAEA";
const DOT_GRAY = "#ECECF1";
const BORDER_SOFT = "#EEE8FF";
const ACCENT_PURPLE = "#7B61FF";
const ACCENT_BLUE = "#5AC8FA";
const TITLE_SIZE = 39;
const TITLE_LINE_HEIGHT = 46;

type SegmentId = "renovating_home" | "interior_designer";

type RoleOption = {
  description: string;
  icon: LucideIcon;
  id: SegmentId;
  title: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    description: "Je crée mon espace\nde rêve.",
    icon: UserRound,
    id: "renovating_home",
    title: "Propriétaire",
  },
  {
    description: "Je conçois des espaces\npour mes clients.",
    icon: DraftingCompass,
    id: "interior_designer",
    title: "Architecte d’intérieur",
  },
];

function ProgressDots({step}: {step: number}) {
  return (
    <View accessibilityLabel={`Étape ${step} / ${STEP_COUNT}`} style={styles.dots}>
      {Array.from({length: STEP_COUNT}).map((_, index) => (
        <View
          key={`onboarding-dot-${index}`}
          style={[styles.dot, index + 1 === step ? styles.dotActive : null]}
        />
      ))}
    </View>
  );
}

function GradientWord({
  gradientId,
  width,
  word,
}: {
  gradientId: string;
  width: number;
  word: string;
}) {
  return (
    <Svg height={TITLE_LINE_HEIGHT} width={width} style={styles.gradientWordSvg}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={ACCENT_PURPLE} />
          <Stop offset="1" stopColor={ACCENT_BLUE} />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        fill={`url(#${gradientId})`}
        fontFamily={fonts.bold.fontFamily}
        fontSize={TITLE_SIZE}
        fontWeight="700"
        letterSpacing={0}
        x="0"
        y="38"
      >
        {word}
      </SvgText>
    </Svg>
  );
}

function ScreenTitle({children, label}: {children: ReactNode; label: string}) {
  return (
    <View accessibilityLabel={label} accessibilityRole="header" style={styles.titleBlock}>
      {children}
    </View>
  );
}

function TitleLine({children}: {children: ReactNode}) {
  return <View style={styles.titleLine}>{children}</View>;
}

function TitleText({children}: {children: ReactNode}) {
  return <Text style={styles.titleText}>{children}</Text>;
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled ? styles.primaryButtonDisabled : null]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      <ArrowRight color={PURE_WHITE} size={22} strokeWidth={1.9} />
    </Pressable>
  );
}

function SettingsShortcut({bottom}: {bottom: number}) {
  return (
    <Pressable
      accessibilityLabel="Réglages"
      accessibilityRole="button"
      onPress={() => void Haptics.selectionAsync().catch(() => undefined)}
      style={[styles.settingsShortcut, {bottom}]}
    >
      <Settings color="#717480" size={21} strokeWidth={2.6} />
    </Pressable>
  );
}

function FloatingView({children, distance = 8}: {children: ReactNode; distance?: number}) {
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    floatProgress.value = withRepeat(
      withTiming(1, {duration: 3600, easing: Easing.inOut(Easing.sin)}),
      -1,
      true,
    );
  }, [floatProgress]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(floatProgress.value, [0, 1], [distance, -distance]),
      },
    ],
  }));

  return <Animated.View style={floatingStyle}>{children}</Animated.View>;
}

function InteriorHeroPlaceholder() {
  return (
    <Animated.View entering={FadeInUp.duration(720).delay(180).easing(Easing.out(Easing.cubic))} style={styles.heroWrap}>
      <FloatingView distance={5}>
        <View style={styles.heroArt}>
          {/* TODO: Replace this code-rendered placeholder with the final soft 3D chair + arch asset. */}
          <Svg height="280" width="280" viewBox="0 0 280 280">
            <Defs>
              <SvgLinearGradient id="heroArch" x1="0.04" y1="0.08" x2="0.93" y2="0.96">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.46" stopColor="#EEF1FF" />
                <Stop offset="1" stopColor="#DCD8FF" />
              </SvgLinearGradient>
              <SvgLinearGradient id="heroChair" x1="0.08" y1="0.1" x2="0.92" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.62" stopColor="#F4F1F8" />
                <Stop offset="1" stopColor="#E2E7FF" />
              </SvgLinearGradient>
              <SvgLinearGradient id="heroBlue" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FDFDFF" />
                <Stop offset="1" stopColor="#BFCBFF" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="142" cy="239" rx="112" ry="20" fill="#E8E4FF" opacity="0.74" />
            <Path
              d="M65 227V112C65 59 101 28 145 28C190 28 221 60 221 112V227Z"
              fill="url(#heroArch)"
              opacity="0.96"
            />
            <Path
              d="M79 216V119C79 74 107 48 145 48C183 48 207 75 207 119V216Z"
              fill="#FFFFFF"
              opacity="0.55"
            />
            <Path d="M96 125L118 100L144 86L174 96L195 122" fill="none" stroke="#CDD2DF" strokeWidth="1" />
            <Path d="M104 176L126 143L160 130L188 153" fill="none" stroke="#CDD2DF" strokeWidth="1" />
            <Path d="M116 101L126 142M144 87L160 130M174 96L188 153" stroke="#E0E2EA" strokeWidth="1" />
            <Ellipse cx="141" cy="222" rx="82" ry="17" fill="#F3F1FF" />
            <Path
              d="M72 205C75 180 91 161 115 158H168C194 161 208 181 210 205C208 216 200 224 188 225H94C82 224 74 216 72 205Z"
              fill="url(#heroChair)"
            />
            <Path
              d="M99 177C103 160 117 151 136 151H153C174 151 188 161 190 178C177 186 114 186 99 177Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
            <Path d="M109 224L104 249M179 224L185 249" stroke="#B39D83" strokeWidth="5" strokeLinecap="round" />
            <Path d="M65 202C63 176 77 158 100 155C96 179 91 198 82 213C74 212 68 208 65 202Z" fill="#F2F1F9" />
            <Path d="M216 202C216 176 202 158 180 155C184 179 190 198 199 213C207 212 213 208 216 202Z" fill="#ECEEFF" />
            <Rect x="20" y="195" width="54" height="58" rx="22" fill="#FFFFFF" />
            <Path d="M40 195C40 174 53 159 72 159C90 159 101 171 101 190" fill="none" stroke="#D8D8F4" strokeWidth="4" />
            <Path d="M33 188C48 180 66 182 78 193" stroke="#D6C8A7" strokeWidth="1.4" />
            <Path d="M33 188C30 175 27 169 22 163M39 185C35 173 34 166 34 158" stroke="#CBBEA4" strokeWidth="1.2" />
            <Circle cx="226" cy="56" r="20" fill="url(#heroBlue)" opacity="0.9" />
            <Circle cx="238" cy="246" r="14" fill="url(#heroBlue)" opacity="0.7" />
          </Svg>
        </View>
      </FloatingView>
    </Animated.View>
  );
}

function RoleOptionCard({
  description,
  icon: Icon,
  onPress,
  selected,
  title,
}: {
  description: string;
  icon: LucideIcon;
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  const scale = useSharedValue(selected ? 1.015 : 1);

  useEffect(() => {
    scale.value = withTiming(selected ? 1.015 : 1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [scale, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const cardContent = (
    <View
      style={[
        styles.optionCard,
        selected ? styles.optionCardSelected : styles.optionCardPlain,
        selected ? styles.optionCardSelectedSize : styles.optionCardPlainSize,
      ]}
    >
      <LinearGradient
        colors={selected ? ["#F2EAFF", "#EAF8FF"] : ["#ECEBFF", "#EAF8FF"]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.optionIconWrap}
      >
        <Icon color={selected ? ACCENT_PURPLE : "#5270FF"} size={27} strokeWidth={2.1} />
      </LinearGradient>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={styles.optionPressable}
    >
      <Animated.View style={[styles.optionAnimated, animatedStyle]}>
        {selected ? (
          <LinearGradient
            colors={[ACCENT_PURPLE, ACCENT_BLUE]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.optionGradientBorder}
          >
            {cardContent}
          </LinearGradient>
        ) : (
          cardContent
        )}
      </Animated.View>
    </Pressable>
  );
}

function DiamondIllustration() {
  return (
    <Animated.View entering={FadeIn.duration(800).delay(80)} style={styles.diamondScene}>
      <FloatingView distance={11}>
        <View style={styles.diamondWrap}>
          {/* TODO: Replace this code-rendered placeholder with the final 3D diamond image asset if one is supplied. */}
          <Svg height="236" width="236" viewBox="0 0 252 252">
            <Defs>
              <SvgLinearGradient id="diamondTop" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.42" stopColor="#EFDFFF" />
                <Stop offset="1" stopColor="#D1ECFF" />
              </SvgLinearGradient>
              <SvgLinearGradient id="diamondBody" x1="0.06" y1="0.08" x2="0.95" y2="0.95">
                <Stop offset="0" stopColor="#DC81FF" />
                <Stop offset="0.52" stopColor={ACCENT_PURPLE} />
                <Stop offset="1" stopColor={ACCENT_BLUE} />
              </SvgLinearGradient>
              <SvgLinearGradient id="diamondFacet" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.08" />
              </SvgLinearGradient>
            </Defs>
            <G opacity="0.55">
              <Path d="M54 41L58 52L69 56L58 60L54 72L50 60L39 56L50 52Z" fill="#BFA8FF" />
              <Path d="M209 48L216 68L236 75L216 82L209 104L202 82L182 75L202 68Z" fill="#A996FF" />
              <Path d="M30 112L35 126L49 131L35 136L30 151L25 136L11 131L25 126Z" fill="#887DDE" />
              <Path d="M221 147L225 158L237 162L225 166L221 178L217 166L205 162L217 158Z" fill="#998BEB" />
              <Path d="M54 205L58 216L69 220L58 224L54 236L50 224L39 220L50 216Z" fill="#B89CFF" />
            </G>
            <Ellipse cx="128" cy="183" rx="76" ry="30" fill="#DCCEFF" opacity="0.34" />
            <Polygon points="50,102 84,60 167,60 204,102 128,215" fill="url(#diamondBody)" />
            <Polygon points="50,102 84,60 106,102" fill="#EBA8FF" opacity="0.94" />
            <Polygon points="84,60 126,52 106,102" fill="#F6DFFF" opacity="0.88" />
            <Polygon points="126,52 167,60 148,102 106,102" fill="url(#diamondTop)" />
            <Polygon points="167,60 204,102 148,102" fill="#D6F1FF" opacity="0.9" />
            <Polygon points="50,102 106,102 128,215" fill="#BD74FF" opacity="0.78" />
            <Polygon points="106,102 148,102 128,215" fill="#675BFF" opacity="0.92" />
            <Polygon points="148,102 204,102 128,215" fill="#77CEFF" opacity="0.78" />
            <Path d="M84 60L128 215M167 60L128 215M50 102H204M106 102L126 52L148 102" stroke="#FFFFFF" strokeOpacity="0.34" strokeWidth="2" />
            <Path d="M70 91L101 68L91 101L128 215Z" fill="url(#diamondFacet)" opacity="0.68" />
            <Path d="M151 101L178 70L190 101L128 215Z" fill="#FFFFFF" opacity="0.18" />
          </Svg>
        </View>
      </FloatingView>
    </Animated.View>
  );
}

function DiamondProgress() {
  return (
    <View style={styles.diamondProgressWrap}>
      <View style={styles.diamondProgressHeader}>
        <View style={styles.diamondProgressLabelWrap}>
          <Gem color={ACCENT_PURPLE} fill="#8E79FF" size={20} strokeWidth={1.5} />
          <Text style={styles.diamondProgressLabel}>1 diamant gratuit</Text>
        </View>
        <Text style={styles.diamondProgressValue}>100%</Text>
      </View>
      <View
        accessibilityLabel="Progression du diamant gratuit"
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max: 100, now: 100}}
        style={styles.diamondProgressTrack}
      >
        <LinearGradient
          colors={[ACCENT_PURPLE, ACCENT_BLUE]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.diamondProgressFill}
        />
      </View>
    </View>
  );
}

type PremiumOnboardingProps = {
  forceVisible?: boolean;
};

type ClaimOnboardingDiamondResult = {
  canClaimDiamond?: boolean;
  claimedAt?: number;
  credits?: number;
  creditsAdded?: number;
  diamondBalance?: number;
  granted?: boolean;
  nextDiamondClaimAt?: number;
  nextEligibleAt?: number;
  onboardingDiamondClaimedAt?: number;
};

export function PremiumOnboarding({forceVisible = false}: PremiumOnboardingProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const {anonymousId, isReady: viewerReady} = useViewerSession();
  const {
    credits,
    diamondBalance,
    nextDiamondClaimAt,
    setOptimisticRewardState,
  } = useViewerCredits();
  const {imageUrl: demoImageUrl, startDemoRender, status: demoRenderStatus} = useOnboardingDemoRender();
  const claimOnboardingDiamond = useMutation("users:claimOnboardingDiamond" as any);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isClaimingDiamond, setIsClaimingDiamond] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [segment, setSegment] = useState<SegmentId | null>("renovating_home");
  const startedRef = useRef(false);
  const previousStepIndexRef = useRef(stepIndex);
  const overlayOpacity = useSharedValue(1);

  const stepNumber = stepIndex + 1;
  const isLastStep = stepIndex === STEP_COUNT - 1;
  const canContinue = stepIndex !== 1 || Boolean(segment);

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

  const handleClaimDiamond = useCallback(async () => {
    if (isExiting || isClaimingDiamond || !viewerReady) {
      return;
    }

    setIsClaimingDiamond(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    try {
      const result = (await claimOnboardingDiamond({
        anonymousId: anonymousId ?? undefined,
      })) as ClaimOnboardingDiamondResult;
      const claimedAt = result.claimedAt ?? result.onboardingDiamondClaimedAt ?? Date.now();
      const nextCredits = typeof result.credits === "number"
        ? result.credits
        : Math.max(credits + (result.creditsAdded ?? 1), 1);
      const nextDiamondBalance = typeof result.diamondBalance === "number"
        ? result.diamondBalance
        : Math.max(diamondBalance + (result.creditsAdded ?? 1), 1);

      setOptimisticRewardState({
        credits: nextCredits,
        diamondBalance: nextDiamondBalance,
        canClaimDiamond: result.canClaimDiamond ?? false,
        nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? nextDiamondClaimAt,
        lastClaimAt: claimedAt,
        onboardingDiamondClaimedAt: claimedAt,
      });
    } catch {
      setIsClaimingDiamond(false);
      return;
    }

    const destination = demoRenderStatus === "success" && demoImageUrl
      ? "wow"
      : demoRenderStatus === "failed"
        ? "paywall"
        : "tabs";

    await finishOnboarding(false, destination);
    setIsClaimingDiamond(false);
  }, [
    anonymousId,
    claimOnboardingDiamond,
    credits,
    demoImageUrl,
    demoRenderStatus,
    diamondBalance,
    finishOnboarding,
    isClaimingDiamond,
    isExiting,
    nextDiamondClaimAt,
    setOptimisticRewardState,
    viewerReady,
  ]);

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
            paddingTop: insets.top + 112,
            paddingBottom: Math.max(insets.bottom + 14, 24),
          },
        ]}
      >
        <View style={[styles.topControls, {top: insets.top + 56}]}>
          <ProgressDots step={stepNumber} />
          <Pressable
            accessibilityRole="button"
            disabled={isExiting}
            onPress={() => void finishOnboarding(true, "tabs")}
            style={[styles.skipButton, isExiting ? styles.skipButtonDisabled : null]}
          >
            <Text style={styles.skipButtonText}>Ignorer</Text>
          </Pressable>
        </View>

        <Animated.View
          key={`premium-onboarding-step-${stepIndex}`}
          entering={FadeIn.duration(240)}
          style={[styles.content, stepIndex === 2 ? styles.contentFinal : null]}
        >
          {stepIndex === 0 ? (
            <View style={styles.screenOne}>
              <Animated.View entering={FadeInUp.duration(620).delay(70).easing(Easing.out(Easing.cubic))}>
                <ScreenTitle label="Concevez en quelques secondes">
                  <TitleLine>
                    <TitleText>Concevez</TitleText>
                  </TitleLine>
                  <TitleLine>
                    <TitleText>en quelques</TitleText>
                  </TitleLine>
                  <TitleLine>
                    <GradientWord gradientId="title-seconds" width={178} word="secondes" />
                  </TitleLine>
                </ScreenTitle>
                <Text style={styles.stepBody}>
                  Importez une photo, choisissez une direction et obtenez rapidement un concept soigné.
                </Text>
              </Animated.View>
              <InteriorHeroPlaceholder />
            </View>
          ) : null}

          {stepIndex === 1 ? (
            <View style={styles.screenTwo}>
              <Animated.View entering={FadeInUp.duration(620).delay(70).easing(Easing.out(Easing.cubic))}>
                <ScreenTitle label="Choisissez votre profil">
                  <TitleLine>
                    <TitleText>Choisissez</TitleText>
                  </TitleLine>
                  <TitleLine>
                    <TitleText>votre </TitleText>
                    <GradientWord gradientId="title-profile" width={100} word="profil" />
                  </TitleLine>
                </ScreenTitle>
                <Text style={styles.stepBody}>
                  Cela nous aide à personnaliser votre expérience et vos inspirations.
                </Text>
              </Animated.View>

              <View style={styles.optionStack}>
                {ROLE_OPTIONS.map((option, index) => (
                  <Animated.View
                    entering={FadeInUp.duration(520).delay(160 + index * 90).easing(Easing.out(Easing.cubic))}
                    key={option.id}
                  >
                    <RoleOptionCard
                      description={option.description}
                      icon={option.icon}
                      onPress={() => handleSelectSegment(option.id)}
                      selected={segment === option.id}
                      title={option.title}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : null}

          {stepIndex === 2 ? (
            <View style={styles.screenThree}>
              <DiamondIllustration />
              <Animated.View entering={FadeInUp.duration(620).delay(130).easing(Easing.out(Easing.cubic))}>
                <ScreenTitle label="Commencez à créer">
                  <TitleLine>
                    <TitleText>Commencez</TitleText>
                  </TitleLine>
                  <TitleLine>
                    <TitleText>à </TitleText>
                    <GradientWord gradientId="title-create" width={98} word="créer" />
                  </TitleLine>
                </ScreenTitle>
              </Animated.View>
              <Animated.View entering={FadeInUp.duration(620).delay(220).easing(Easing.out(Easing.cubic))}>
                <DiamondProgress />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{busy: isClaimingDiamond, disabled: isExiting || isClaimingDiamond || !viewerReady}}
                  disabled={isExiting || isClaimingDiamond || !viewerReady}
                  onPress={() => void handleClaimDiamond()}
                  style={[styles.finalButton, isExiting || isClaimingDiamond || !viewerReady ? styles.finalButtonDisabled : null]}
                >
                  <Text style={styles.finalButtonText}>
                    {isClaimingDiamond ? "Réclamation..." : "Réclamer 1 diamant gratuit"}
                  </Text>
                  <Gift color={PURE_WHITE} size={21} strokeWidth={1.9} />
                </Pressable>
              </Animated.View>
            </View>
          ) : null}
        </Animated.View>

        {!isLastStep ? (
          <PrimaryButton disabled={!canContinue || isExiting} label="Continuer" onPress={handleContinue} />
        ) : null}

        <SettingsShortcut bottom={isLastStep ? Math.max(insets.bottom + 58, 70) : Math.max(insets.bottom + 104, 116)} />
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
  topControls: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 5,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    position: "absolute",
    right: -8,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipButtonDisabled: {
    opacity: 0.45,
  },
  skipButtonText: {
    color: BLACK,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
  },
  dots: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: DOT_GRAY,
  },
  dotActive: {
    backgroundColor: BLACK,
  },
  content: {
    flex: 1,
    width: "100%",
  },
  contentFinal: {
    justifyContent: "flex-start",
  },
  screenOne: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 76,
  },
  screenTwo: {
    flex: 1,
    gap: 28,
  },
  screenThree: {
    flex: 1,
    paddingTop: 12,
  },
  titleBlock: {
    alignSelf: "stretch",
    gap: 0,
  },
  titleLine: {
    minHeight: TITLE_LINE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    color: BLACK,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: "700",
    letterSpacing: 0,
  },
  gradientWordSvg: {
    marginTop: 1,
  },
  stepBody: {
    maxWidth: 286,
    paddingTop: 22,
    color: TEXT_MUTED,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
  },
  heroWrap: {
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  heroArt: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  optionStack: {
    width: "100%",
    gap: 20,
    paddingTop: 16,
  },
  optionPressable: {
    width: "100%",
  },
  optionAnimated: {
    width: "100%",
  },
  optionGradientBorder: {
    height: 120,
    borderRadius: 20,
    borderCurve: "continuous",
    padding: 2,
  },
  optionCard: {
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  optionCardSelected: {
    borderRadius: 18,
    backgroundColor: PURE_WHITE,
  },
  optionCardSelectedSize: {
    height: 116,
  },
  optionCardPlain: {
    borderRadius: 20,
    backgroundColor: SOFT_GRAY,
    boxShadow: "0px 16px 38px rgba(19, 22, 31, 0.05)",
  },
  optionCardPlainSize: {
    height: 120,
  },
  optionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    boxShadow: "0px 10px 24px rgba(123, 97, 255, 0.16)",
  },
  optionTitle: {
    color: BLACK,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fonts.bold.fontFamily,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  optionDescription: {
    paddingTop: 6,
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
    textAlign: "center",
  },
  diamondScene: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 42,
  },
  diamondWrap: {
    width: 236,
    height: 236,
    alignItems: "center",
    justifyContent: "center",
  },
  diamondProgressWrap: {
    width: "100%",
    gap: 11,
    paddingTop: 26,
  },
  diamondProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  diamondProgressLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  diamondProgressLabel: {
    color: TEXT_MUTED,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
  },
  diamondProgressValue: {
    color: TEXT_MUTED,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
    letterSpacing: 0,
  },
  diamondProgressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: TRACK_GRAY,
  },
  diamondProgressFill: {
    width: "100%",
    height: "100%",
    borderRadius: 3,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 58,
    backgroundColor: BLACK,
    boxShadow: "0px 12px 26px rgba(0, 0, 0, 0.18)",
  },
  primaryButtonDisabled: {
    opacity: 0.3,
  },
  primaryButtonText: {
    color: PURE_WHITE,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: "500",
    letterSpacing: 0,
  },
  finalButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    backgroundColor: BLACK,
    marginTop: 30,
    boxShadow: "0px 12px 26px rgba(0, 0, 0, 0.18)",
  },
  finalButtonDisabled: {
    backgroundColor: BLACK,
    opacity: 0.68,
  },
  finalButtonText: {
    color: PURE_WHITE,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.medium.fontFamily,
    fontWeight: "500",
    letterSpacing: 0,
  },
  settingsShortcut: {
    position: "absolute",
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PURE_WHITE,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    boxShadow: "0px 8px 18px rgba(17, 19, 24, 0.08)",
  },
});
