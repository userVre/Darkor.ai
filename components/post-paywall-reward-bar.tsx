import {useMutation} from "convex/react";
import {useCallback, useEffect, useState} from "react";
import {ActivityIndicator, AppState, Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {scheduleOrUpdateDiamondReminder} from "../lib/notifications";
import {readHasDismissedPaywall} from "../lib/launch-paywall";
import {readHasFinishedOnboarding} from "../lib/onboarding-storage";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon} from "./diamond-credit-pill";
import {useElitePassModal} from "./elite-pass-context";
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

export function PostPaywallRewardBar() {
  const {anonymousId} = useViewerSession();
  const {rewardBarVisible, closeRewardBar} = useElitePassModal();
  const {
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
  const [hasFinishedOnboarding, setHasFinishedOnboarding] = useState(false);
  const [hasFinishedPaywall, setHasFinishedPaywall] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

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

  const dayOneClaimed = claimed || onboardingDiamondClaimedAt > 0 || lastClaimAt > 0;
  const hasZeroBalance = credits <= 0 && diamondBalance <= 0;
  const shouldShow =
    hasFinishedOnboarding
    && hasFinishedPaywall
    && hasZeroBalance
    && !dayOneClaimed;

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

      scale.value = withSequence(
        withTiming(1.015, {duration: 90}),
        withTiming(1, {duration: 130}),
      );
    } catch {
      setClaimed(false);
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
          <Text numberOfLines={2} style={styles.headline}>
            Ready for your first magic design? ✨
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            Claim your Day 1 Reward to start generating now.
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Claim 1 Free Diamond"
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
              <Text numberOfLines={1} style={styles.actionText}>Claim 1 Free Diamond</Text>
            </View>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  bar: {
    minHeight: 92,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    boxShadow: "0px 8px 18px rgba(15, 23, 42, 0.06)",
  },
  copyColumn: {
    minWidth: 0,
    flex: 1,
    gap: 5,
  },
  headline: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 21,
    ...fonts.bold,
  },
  subtitle: {
    color: "rgba(15, 23, 42, 0.62)",
    fontSize: 12,
    lineHeight: 17,
    ...fonts.medium,
  },
  actionButton: {
    minWidth: 144,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 12,
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
    fontSize: 12,
    lineHeight: 16,
    ...fonts.bold,
  },
});
