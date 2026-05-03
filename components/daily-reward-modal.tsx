import {useMutation} from "convex/react";
import {Check} from "@/components/material-icons";
import * as Haptics from "expo-haptics";
import {useEffect, useMemo, useRef, useState} from "react";
import {Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {Circle, Defs, RadialGradient, Stop} from "react-native-svg";

import {scheduleOrUpdateDiamondReminder} from "../lib/notifications";
import {fonts} from "../styles/typography";
import {DiamondRewardIcon, DayNode, type DayNodeState} from "./elitepass/DayNode";
import {ProgressPath} from "./elitepass/ProgressPath";
import {ElitePassFlameIcon} from "./diamond-credit-pill";
import {useElitePassModal} from "./elite-pass-context";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const ELITE_PASS_DAYS = 7;
const STANDARD_REWARD_DIAMONDS = 1;
const DAY_SEVEN_REWARD_DIAMONDS = 3;
const BLUE = "#00B4FF";
const GOLD = "#FFD700";
const PATH_SLOT_HEIGHT = 176;
const NODE_OFFSETS = [0, 0, 0, 0, 0, 0, 0];
const CLAIM_CONFETTI_COLORS = [BLUE, GOLD, "#2ECC71", "#FFFFFF"];
const REVEAL_CONFETTI_COLORS = [GOLD, "#FFF4A3", BLUE, "#FFFFFF"];

const CLAIM_CONFETTI_PIECES = Array.from({length: 76}, (_, index) => {
  const angle = (index / 76) * Math.PI * 2;
  const distance = 150 + (index % 8) * 24;

  return {
    color: CLAIM_CONFETTI_COLORS[index % CLAIM_CONFETTI_COLORS.length],
    delay: (index % 12) * 28,
    rotate: index % 2 === 0 ? 174 : -138,
    size: 7 + (index % 4) * 2,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance + 170,
  };
});

const DAY_SEVEN_CLAIM_CONFETTI_PIECES = Array.from({length: 164}, (_, index) => {
  const angle = (index / 164) * Math.PI * 2;
  const distance = 190 + (index % 12) * 28;

  return {
    color: REVEAL_CONFETTI_COLORS[index % REVEAL_CONFETTI_COLORS.length],
    delay: (index % 18) * 18,
    rotate: index % 2 === 0 ? 260 : -220,
    size: 8 + (index % 5) * 2,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance + 190,
  };
});

const DAY_SEVEN_CONFETTI = Array.from({length: 34}, (_, index) => {
  const angle = -Math.PI / 2 + (index / 33) * Math.PI;
  const distance = 72 + (index % 7) * 13;

  return {
    color: REVEAL_CONFETTI_COLORS[index % REVEAL_CONFETTI_COLORS.length],
    delay: (index % 8) * 45,
    rotate: index % 2 === 0 ? 220 : -180,
    size: 5 + (index % 4),
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 8,
  };
});

type ClaimRewardResult = {
  granted?: boolean;
  credits?: number;
  creditsAdded?: number;
  diamondBalance?: number;
  streakCount?: number;
  streak_count?: number;
  elitePassActivated?: boolean;
  eliteProUntil?: number;
  hasProAccess?: boolean;
  nextDiamondClaimAt?: number;
  nextEligibleAt?: number;
};

function getCycleProgress(streakCount: number) {
  return ((Math.max(1, streakCount) - 1) % ELITE_PASS_DAYS) + 1;
}

function getDayReward(day: number) {
  if (day === ELITE_PASS_DAYS) {
    return {
      diamonds: DAY_SEVEN_REWARD_DIAMONDS,
      label: "3 Diamonds + Pro Access Trial",
    };
  }

  return {
    diamonds: STANDARD_REWARD_DIAMONDS,
    label: "1 Diamond",
  };
}

function CosmicGlow({width}: {width: number}) {
  const glowSize = Math.max(260, width * 0.6);

  return (
    <Svg
      pointerEvents="none"
      style={[styles.cosmicGlow, {height: glowSize, width: glowSize, left: (width - glowSize) / 2}]}
      viewBox={`0 0 ${glowSize} ${glowSize}`}
    >
      <Defs>
        <RadialGradient id="elitePassGlow" cx="50%" cy="35%" r="60%">
          <Stop offset="0" stopColor="#1A1040" stopOpacity="0.95" />
          <Stop offset="0.55" stopColor="#1A1040" stopOpacity="0.34" />
          <Stop offset="1" stopColor="#0A0A0F" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={glowSize / 2} cy={glowSize / 2} fill="url(#elitePassGlow)" r={glowSize / 2} />
    </Svg>
  );
}

function ClaimParticle({
  burstKey,
  color,
  delay,
  rotate,
  size,
  x,
  y,
}: {
  burstKey: number;
  color: string;
  delay: number;
  rotate: number;
  size: number;
  x: number;
  y: number;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(delay, withTiming(x, {duration: 1450, easing: Easing.out(Easing.cubic)}));
    translateY.value = withDelay(delay, withTiming(y, {duration: 1450, easing: Easing.out(Easing.cubic)}));
    scale.value = withDelay(delay, withSequence(
      withTiming(1, {duration: 260, easing: Easing.out(Easing.quad)}),
      withTiming(0.72, {duration: 1190, easing: Easing.out(Easing.cubic)}),
    ));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, {duration: 160}),
      withTiming(0, {duration: 1290, easing: Easing.out(Easing.cubic)}),
    ));
    rotation.value = withDelay(delay, withTiming(rotate, {duration: 1450, easing: Easing.out(Easing.cubic)}));
  }, [burstKey, delay, opacity, rotate, rotation, scale, translateX, translateY, x, y]);

  const particleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {rotate: `${rotation.value}deg`},
      {scale: scale.value},
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          height: size * 1.7,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          width: size,
        },
        particleStyle,
      ]}
    />
  );
}

function ClaimSuccessAnimation({burstKey, isJackpot, visible}: {burstKey: number; isJackpot: boolean; visible: boolean}) {
  const opacity = useSharedValue(0);
  const messageScale = useSharedValue(0.88);
  const messageY = useSharedValue(12);
  const confettiPieces = isJackpot ? DAY_SEVEN_CLAIM_CONFETTI_PIECES : CLAIM_CONFETTI_PIECES;

  useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(0, {duration: 160});
      messageScale.value = 0.88;
      messageY.value = 12;
      return;
    }

    opacity.value = withTiming(1, {duration: 180});
    messageScale.value = withTiming(1, {duration: 280, easing: Easing.out(Easing.back(1.4))});
    messageY.value = withTiming(0, {duration: 280, easing: Easing.out(Easing.cubic)});
  }, [messageScale, messageY, opacity, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const messageStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: messageY.value},
      {scale: messageScale.value},
    ],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.successOverlay, overlayStyle]}>
      <View style={styles.successMessageWrap}>
        <Animated.View style={[styles.successMessage, messageStyle]}>
          <Text style={styles.successTitle}>{isJackpot ? "Pro Access Unlocked!" : "Claimed!"}</Text>
        </Animated.View>
      </View>

      {confettiPieces.map((piece, index) => (
        <ClaimParticle key={`${burstKey}-${index}`} burstKey={burstKey} {...piece} />
      ))}
    </Animated.View>
  );
}

function DaySevenRevealBurst({burstKey}: {burstKey: number}) {
  if (burstKey <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.daySevenBurst}>
      {DAY_SEVEN_CONFETTI.map((piece, index) => (
        <ClaimParticle key={`day-seven-${burstKey}-${index}`} burstKey={burstKey} {...piece} />
      ))}
    </View>
  );
}

function getNodeState(day: number, currentDay: number): DayNodeState {
  if (day < currentDay) {
    return "completed";
  }

  if (day === currentDay) {
    return "current";
  }

  return "locked";
}

export function DailyRewardModal() {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const {anonymousId, isReady: viewerReady} = useViewerSession();
  const {
    canClaimDiamond,
    credits,
    eliteProUntil,
    isReady,
    setOptimisticRewardState,
    streakCount,
  } = useViewerCredits();
  const {closeElitePass, openElitePass, visible} = useElitePassModal();
  const claimDailyDiamond = useMutation("users:claimDailyDiamond" as any);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimRewardResult | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successKey, setSuccessKey] = useState(0);
  const [successIsJackpot, setSuccessIsJackpot] = useState(false);
  const [daySevenRevealKey, setDaySevenRevealKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasShownDaySevenRevealRef = useRef(false);
  const sheetOpacity = useSharedValue(0);
  const sheetY = useSharedValue(18);
  const sheetScale = useSharedValue(0.97);

  const resolvedStreakCount = claimResult?.streakCount ?? claimResult?.streak_count ?? streakCount;
  const currentDay = getCycleProgress(resolvedStreakCount);
  const rewardDiamonds = claimResult?.creditsAdded ?? getDayReward(currentDay).diamonds;
  const displayedCredits = claimResult?.credits ?? credits;
  const hasVerifiedClaim = claimResult?.granted === true;
  const canClaimNow = canClaimDiamond && !hasVerifiedClaim;
  const currentProgress = canClaimNow || hasVerifiedClaim ? 100 : 38;

  const days = useMemo(
    () => Array.from({length: ELITE_PASS_DAYS}, (_, index) => index + 1),
    [],
  );
  const pathWidth = Math.min(Math.max(width - 32, 288), 430);

  useEffect(() => {
    if (viewerReady && isReady && canClaimDiamond) {
      setClaimResult(null);
      setErrorMessage(null);
      openElitePass();
    }
  }, [canClaimDiamond, isReady, openElitePass, viewerReady]);

  useEffect(() => {
    if (!visible) {
      sheetOpacity.value = 0;
      sheetY.value = 18;
      sheetScale.value = 0.97;
      return;
    }

    sheetOpacity.value = withTiming(1, {duration: 220});
    sheetY.value = withTiming(0, {duration: 260, easing: Easing.out(Easing.cubic)});
    sheetScale.value = withTiming(1, {duration: 260, easing: Easing.out(Easing.cubic)});
  }, [sheetOpacity, sheetScale, sheetY, visible]);

  useEffect(() => {
    if (visible && currentDay === ELITE_PASS_DAYS && !hasShownDaySevenRevealRef.current) {
      hasShownDaySevenRevealRef.current = true;
      setDaySevenRevealKey((current) => current + 1);
    }
  }, [currentDay, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [
      {translateY: sheetY.value},
      {scale: sheetScale.value},
    ],
  }));

  const handleClose = () => {
    if (isClaiming || successVisible) {
      return;
    }

    closeElitePass();
  };

  const handleClaim = async () => {
    if (isClaiming || !canClaimNow) {
      return;
    }

    setIsClaiming(true);
    setErrorMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);

    try {
      const claimedDay = currentDay;
      const result = await claimDailyDiamond({anonymousId: anonymousId ?? undefined}) as ClaimRewardResult;
      const nextStreakCount = result.streakCount ?? result.streak_count ?? resolvedStreakCount;
      const nextEliteProUntil = result.eliteProUntil ?? eliteProUntil;

      setClaimResult(result);
      setOptimisticRewardState({
        credits: typeof result.credits === "number" ? result.credits : credits,
        diamondBalance: typeof result.diamondBalance === "number" ? result.diamondBalance : undefined,
        streakCount: nextStreakCount,
        canClaimDiamond: false,
        nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? 0,
        hasProAccess: result.elitePassActivated || result.hasProAccess ? true : undefined,
        hasPaidAccess: result.elitePassActivated || result.hasProAccess ? true : undefined,
        eliteProUntil: nextEliteProUntil,
      });

      if (result.granted) {
        void scheduleOrUpdateDiamondReminder({
          diamondBalance: result.diamondBalance,
          lastDiamondClaimAt: Date.now(),
          nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? 0,
        });
        setSuccessKey((current) => current + 1);
        setSuccessIsJackpot(claimedDay === ELITE_PASS_DAYS);
        setSuccessVisible(true);
        setIsClaiming(false);
        setTimeout(() => {
          setSuccessVisible(false);
          closeElitePass();
        }, 1900);
        return;
      }

      setErrorMessage("This Elite Pass reward has already been claimed.");
      setIsClaiming(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to claim your reward right now.");
      setIsClaiming(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={handleClose} visible={visible}>
      <View style={styles.screen}>
        <CosmicGlow width={width} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + 24,
              paddingTop: insets.top + 18,
            },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, sheetStyle]}>
            <View style={styles.headerRow}>
              <View style={styles.titleLockup}>
                <View style={styles.flameBadge}>
                  <ElitePassFlameIcon color="#FF7A00" size={23} />
                </View>
                <View style={styles.titleCopy}>
                  <Text style={styles.title}>ELITE PASS</Text>
                  <Text style={styles.subtitle}>7-Day Streak Reward Path</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <View style={styles.balancePill}>
                  <DiamondRewardIcon size={18} />
                  <Text style={styles.balanceText}>{displayedCredits} Diamonds</Text>
                </View>
                <Pressable accessibilityLabel="Close Elite Pass" accessibilityRole="button" onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>x</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.pathWrap, {height: PATH_SLOT_HEIGHT * days.length, width: pathWidth}]}>
              <ProgressPath currentDay={currentDay} nodeOffsets={NODE_OFFSETS} slotHeight={PATH_SLOT_HEIGHT} width={pathWidth} />
              {days.map((day) => {
                const state = getNodeState(day, currentDay);

                return (
                  <View
                    key={day}
                    style={[
                      styles.nodeSlot,
                      {
                        height: PATH_SLOT_HEIGHT,
                      },
                    ]}
                  >
                    <DayNode
                      day={day}
                      isJackpot={day === ELITE_PASS_DAYS}
                      onPress={state === "current" && canClaimNow ? () => void handleClaim() : undefined}
                      progress={state === "current" ? currentProgress : 100}
                      state={state}
                    />
                    {day === ELITE_PASS_DAYS && state === "current" ? <DaySevenRevealBurst burstKey={daySevenRevealKey} /> : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.claimSummary}>
              <DiamondRewardIcon size={20} />
              <Text style={styles.claimSummaryText}>
                {canClaimNow
                  ? `Claim +${rewardDiamonds} Diamond${rewardDiamonds === 1 ? "" : "s"} now`
                  : hasVerifiedClaim
                    ? "Verified for today"
                    : "Your next Elite Pass reward is waiting on the path"}
              </Text>
            </View>

            {errorMessage ? <Text selectable style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isClaiming || !canClaimNow || hasVerifiedClaim}
              onPress={() => void handleClaim()}
              style={({pressed}) => [
                styles.claimButton,
                hasVerifiedClaim ? styles.claimButtonVerified : null,
                !canClaimNow && !hasVerifiedClaim ? styles.claimButtonDisabled : null,
                pressed || isClaiming ? styles.claimButtonPressed : null,
              ]}
            >
              <View style={styles.claimButtonContent}>
                {hasVerifiedClaim ? <Check color="#FFFFFF" size={18} strokeWidth={2.5} /> : null}
                <Text style={styles.claimButtonText}>
                  {hasVerifiedClaim ? "Verified" : isClaiming ? "Claiming..." : "Claim Reward"}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </ScrollView>

        <ClaimSuccessAnimation burstKey={successKey} isJackpot={successIsJackpot} visible={successVisible} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  cosmicGlow: {
    position: "absolute",
    top: -56,
  },
  scrollContent: {
    minHeight: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  content: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    gap: 18,
  },
  headerRow: {
    width: "100%",
    minHeight: 62,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleLockup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flameBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 122, 0, 0.56)",
    backgroundColor: "rgba(255, 122, 0, 0.13)",
    boxShadow: "0px 0px 20px rgba(255, 122, 0, 0.34)",
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 30,
    ...fonts.bold,
  },
  subtitle: {
    color: "#AEB7D8",
    fontSize: 12,
    lineHeight: 15,
    ...fonts.medium,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  balancePill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLUE,
    backgroundColor: "rgba(0, 180, 255, 0.1)",
    boxShadow: `0px 0px 18px ${BLUE}30`,
  },
  balanceText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 15,
    fontVariant: ["tabular-nums"],
    ...fonts.bold,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 20,
    ...fonts.bold,
  },
  pathWrap: {
    alignSelf: "center",
    alignItems: "stretch",
  },
  nodeSlot: {
    width: "100%",
    alignItems: "stretch",
    justifyContent: "center",
  },
  claimSummary: {
    width: "100%",
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0, 180, 255, 0.42)",
    backgroundColor: "rgba(13, 31, 60, 0.64)",
  },
  claimSummaryText: {
    flex: 1,
    color: "#DCEEFF",
    fontSize: 13,
    lineHeight: 17,
    ...fonts.bold,
  },
  errorText: {
    color: "#FF9AA5",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.medium,
  },
  claimButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
    boxShadow: `0px 14px 30px ${BLUE}45`,
  },
  claimButtonDisabled: {
    backgroundColor: "#1A1A2E",
    borderWidth: 1,
    borderColor: "#2A2A4A",
    boxShadow: "0px 0px 0px rgba(0, 0, 0, 0)",
  },
  claimButtonVerified: {
    backgroundColor: "#2ECC71",
    boxShadow: "0px 12px 24px rgba(46, 204, 113, 0.3)",
  },
  claimButtonPressed: {
    opacity: 0.82,
    transform: [{scale: 0.99}],
  },
  claimButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    ...fonts.bold,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "rgba(10, 10, 15, 0.26)",
  },
  successMessageWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  successMessage: {
    minHeight: 78,
    minWidth: 210,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: BLUE,
    backgroundColor: "#0D1F3C",
    boxShadow: `0px 0px 28px ${BLUE}60`,
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
    ...fonts.bold,
  },
  confettiPiece: {
    position: "absolute",
    left: "50%",
    top: "36%",
    borderRadius: 2,
  },
  daySevenBurst: {
    position: "absolute",
    left: "50%",
    top: 76,
    width: 1,
    height: 1,
    overflow: "visible",
  },
});
