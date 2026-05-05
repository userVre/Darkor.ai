import {useMutation} from "convex/react";
import * as Haptics from "expo-haptics";
import {useCallback, useEffect, useRef, useState} from "react";
import {ActivityIndicator, AppState, Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {readHasDismissedPaywall} from "../lib/launch-paywall";
import {scheduleOrUpdateDiamondReminder} from "../lib/notifications";
import {readHasFinishedOnboarding} from "../lib/onboarding-storage";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon} from "./diamond-credit-pill";
import {useElitePassModal} from "./elite-pass-context";
import {DiamondParticleBurst, type DiamondParticleBurstHandle} from "./onboarding/DiamondParticleBurst";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

type ClaimResult = {
  granted?: boolean;
  credits?: number;
  creditsAdded?: number;
  diamondBalance?: number;
  claimedAt?: number;
  onboardingDiamondClaimedAt?: number;
  streakCount?: number;
  streak_count?: number;
  nextDiamondClaimAt?: number;
  nextEligibleAt?: number;
};

const REWARD_BAR_HEADLINE = "C'est parti ! R\u00e9clamez votre 1er diamant gratuit \u2728";
const REWARD_BAR_CTA = "R\u00c9CUP\u00c9RER";

export function PostPaywallRewardBar() {
  const {anonymousId} = useViewerSession();
  const {rewardBarVisible, closeRewardBar} = useElitePassModal();
  const {
    canClaimDiamond,
    credits,
    diamondBalance,
    lastClaimAt,
    nextDiamondClaimAt,
    onboardingDiamondClaimedAt,
    setOptimisticRewardState,
    streakCount,
  } = useViewerCredits();
  const claimOnboardingDiamond = useMutation("users:claimOnboardingDiamond" as any);

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState(false);
  const [hasFinishedPaywall, setHasFinishedPaywall] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const burstRef = useRef<DiamondParticleBurstHandle | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    let active = true;

    const refreshEligibility = async () => {
      const [finishedOnboarding, finishedPaywall] = await Promise.all([
        readHasFinishedOnboarding(),
        readHasDismissedPaywall(),
      ]);

      if (!active) {
        return;
      }

      setHasFinishedOnboarding(finishedOnboarding);
      setHasFinishedPaywall(finishedPaywall);
    };

    void refreshEligibility();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshEligibility();
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [rewardBarVisible]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const dayOneClaimed = claimed || onboardingDiamondClaimedAt > 0 || lastClaimAt > 0;
  const hasZeroBalance = credits <= 0 && diamondBalance <= 0;
  const isEligible =
    hasFinishedOnboarding
    && hasFinishedPaywall
    && canClaimDiamond
    && hasZeroBalance
    && !dayOneClaimed;
  const shouldShow = isEligible || isCelebrating;

  useEffect(() => {
    if (shouldShow) {
      setIsRendered(true);
      opacity.value = withTiming(1, {duration: 220});
      translateY.value = withTiming(0, {duration: 260, easing: Easing.out(Easing.cubic)});
      scale.value = withTiming(1, {duration: 260, easing: Easing.out(Easing.cubic)});
      return;
    }

    opacity.value = withTiming(0, {duration: 160});
    translateY.value = withTiming(-8, {duration: 160});
    scale.value = withTiming(0.98, {duration: 160});

    const timeout = setTimeout(() => {
      setIsRendered(false);
      if (rewardBarVisible) {
        closeRewardBar();
      }
    }, 190);

    return () => clearTimeout(timeout);
  }, [closeRewardBar, opacity, rewardBarVisible, scale, shouldShow, translateY]);

  const handleClaim = useCallback(async () => {
    if (isClaiming || claimed) {
      return;
    }

    setIsClaiming(true);

    try {
      setClaimed(true);
      setIsCelebrating(true);

      const result = await claimOnboardingDiamond({anonymousId: anonymousId ?? undefined}) as ClaimResult;
      const creditsAdded = result.creditsAdded ?? (result.granted ? 1 : 0);
      const nextStreakCount = result.streakCount ?? result.streak_count ?? streakCount;
      const nextDiamondBalance = result.diamondBalance ?? Math.max(diamondBalance + creditsAdded, 0);
      const nextClaimedAt = result.claimedAt ?? result.onboardingDiamondClaimedAt ?? Date.now();

      setOptimisticRewardState({
        credits: typeof result.credits === "number" ? result.credits : credits + creditsAdded,
        diamondBalance: nextDiamondBalance,
        streakCount: nextStreakCount,
        canClaimDiamond: false,
        nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? nextDiamondClaimAt,
        lastClaimAt: nextClaimedAt,
        onboardingDiamondClaimedAt: nextClaimedAt,
      });

      if (result.granted) {
        void scheduleOrUpdateDiamondReminder({
          diamondBalance: nextDiamondBalance,
          lastDiamondClaimAt: nextClaimedAt,
          nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? nextDiamondClaimAt,
        });
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      burstRef.current?.burst();
      scale.value = withSequence(
        withTiming(1.015, {duration: 90}),
        withTiming(1, {duration: 130}),
      );

      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
      celebrationTimerRef.current = setTimeout(() => {
        setIsCelebrating(false);
        setIsClaiming(false);
      }, 720);
    } catch {
      setClaimed(false);
      setIsCelebrating(false);
      setIsClaiming(false);
    }
  }, [
    anonymousId,
    claimOnboardingDiamond,
    claimed,
    credits,
    diamondBalance,
    isClaiming,
    nextDiamondClaimAt,
    scale,
    setOptimisticRewardState,
    streakCount,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: typeof opacity.value === "number" ? opacity.value : 0,
    transform: [
      {translateY: typeof translateY.value === "number" ? translateY.value : 0},
      {scale: typeof scale.value === "number" ? scale.value : 1},
    ],
  }));

  if (!isRendered) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={styles.bar}>
        <View style={styles.copyColumn}>
          <Text adjustsFontSizeToFit minimumFontScale={0.84} numberOfLines={2} style={styles.headline}>
            {REWARD_BAR_HEADLINE}
          </Text>
        </View>

        <View style={styles.actionWrap}>
          <Pressable
            accessibilityLabel={REWARD_BAR_CTA}
            accessibilityRole="button"
            disabled={isClaiming || claimed}
            onPress={() => void handleClaim()}
            style={({pressed}) => [
              styles.actionButton,
              pressed && !isClaiming && !claimed ? styles.actionButtonPressed : null,
            ]}
          >
            {isClaiming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.actionContent}>
                <DiamondCreditIcon primaryColor="#FFFFFF" size={15} />
                <Text numberOfLines={1} style={styles.actionText}>{REWARD_BAR_CTA}</Text>
              </View>
            )}
          </Pressable>
          <DiamondParticleBurst ref={burstRef} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  bar: {
    minHeight: 66,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.24)",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    boxShadow: "0px 12px 30px rgba(15, 23, 42, 0.1)",
    overflow: "visible",
  },
  copyColumn: {
    minWidth: 0,
    flex: 1,
  },
  headline: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 20,
    ...fonts.bold,
  },
  actionWrap: {
    minWidth: 112,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  actionButton: {
    minWidth: 112,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 13,
    borderCurve: "continuous",
    backgroundColor: "#007AFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    boxShadow: "0px 0px 18px rgba(0, 122, 255, 0.28)",
  },
  actionButtonPressed: {
    opacity: 0.86,
    transform: [{scale: 0.98}],
  },
  actionContent: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.bold,
  },
});
