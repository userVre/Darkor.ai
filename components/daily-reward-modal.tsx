import {useMutation} from "convex/react";
import {X} from "@/components/material-icons";
import * as Haptics from "expo-haptics";
import {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
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

import {scheduleOrUpdateDiamondReminder} from "../lib/notifications";
import {fonts} from "../styles/typography";
import {DiamondRewardIcon, DayNode, type DayNodeState} from "./elitepass/DayNode";
import {ProgressPath} from "./elitepass/ProgressPath";
import {ElitePassFlameIcon} from "./diamond-credit-pill";
import {useElitePassModal} from "./elite-pass-context";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const ELITE_PASS_DAYS = 7;
const BLUE = "#2F80FF";
const BLUE_LIGHT = "#8FD3FF";
const RED = "#FF4D5E";
const STANDARD_SLOT_HEIGHT = 64;
const JACKPOT_SLOT_HEIGHT = 118;
const NODE_OFFSETS = [0, 0, 0, 0, 0, 0, 0];
const CLAIM_CONFETTI_COLORS = [BLUE_LIGHT, BLUE, "#2ECC71", "#FFFFFF"];
const REVEAL_CONFETTI_COLORS = [RED, BLUE, BLUE_LIGHT, "#FFFFFF"];

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

function BattlePassBackdrop() {
  return (
    <View
      pointerEvents="none"
      style={styles.backdrop}
    >
      <View style={[styles.archPanel, styles.archPanelTop]} />
      <View style={[styles.archPanel, styles.archPanelMid]} />
      <View style={[styles.archPanel, styles.archPanelBottom]} />
      <View style={styles.blueWash} />
      <View style={styles.gridLineA} />
      <View style={styles.gridLineB} />
    </View>
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
    opacity: typeof opacity.value === "number" ? opacity.value : 0,
    transform: [
      {translateX: typeof translateX.value === "number" ? translateX.value : 0},
      {translateY: typeof translateY.value === "number" ? translateY.value : 0},
      {rotate: `${typeof rotation.value === "number" ? rotation.value : 0}deg`},
      {scale: typeof scale.value === "number" ? scale.value : 1},
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
      {translateY: typeof messageY.value === "number" ? messageY.value : 0},
      {scale: typeof messageScale.value === "number" ? messageScale.value : 1},
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

function getNodeState(day: number, currentDay: number, currentDayClaimed: boolean): DayNodeState {
  if (day < currentDay) {
    return "completed";
  }

  if (day === currentDay) {
    if (currentDayClaimed) {
      return "completed";
    }

    return "current";
  }

  return "locked";
}

function AnimatedDaySlot({children, height, isFocused}: {children: ReactNode; height: number; isFocused: boolean}) {
  const slotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.68, {duration: 240}),
    transform: [{scale: withTiming(isFocused ? 1 : 0.94, {duration: 240})}],
  }), [isFocused]);

  return (
    <Animated.View style={[styles.nodeSlot, {height}, slotStyle]}>
      {children}
    </Animated.View>
  );
}

export function DailyRewardModal() {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const {anonymousId} = useViewerSession();
  const {
    canClaimDiamond,
    credits,
    eliteProUntil,
    lastClaimAt,
    setOptimisticRewardState,
    streakCount,
  } = useViewerCredits();
  const {closeElitePass, visible} = useElitePassModal();
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
  const displayedCredits = claimResult?.credits ?? credits;
  const hasVerifiedClaim = claimResult?.granted === true;
  const canClaimNow = canClaimDiamond && !hasVerifiedClaim;
  const hasClaimedCurrentDay = hasVerifiedClaim || (!canClaimDiamond && lastClaimAt > 0);

  const days = useMemo(
    () => Array.from({length: ELITE_PASS_DAYS}, (_, index) => index + 1),
    [],
  );
  const slotHeights = useMemo(
    () => days.map((day) => day === ELITE_PASS_DAYS ? JACKPOT_SLOT_HEIGHT : STANDARD_SLOT_HEIGHT),
    [days],
  );
  const pathHeight = slotHeights.reduce((total, next) => total + next, 0);
  const pathWidth = Math.min(Math.max(width - 32, 288), 430);

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
    opacity: typeof sheetOpacity.value === "number" ? sheetOpacity.value : 0,
    transform: [
      {translateY: typeof sheetY.value === "number" ? sheetY.value : 0},
      {scale: typeof sheetScale.value === "number" ? sheetScale.value : 1},
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
        <BattlePassBackdrop />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + 14,
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
                  <ElitePassFlameIcon color={BLUE_LIGHT} size={23} />
                </View>
                <View style={styles.titleCopy}>
                  <Text style={styles.title}>BATTLE PASS</Text>
                  <Text style={styles.subtitle}>Elite daily track</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <View style={styles.balancePill}>
                  <DiamondRewardIcon size={18} />
                  <Text style={styles.balanceText}>{displayedCredits} Diamonds</Text>
                </View>
                <Pressable accessibilityLabel="Close Elite Pass" accessibilityRole="button" onPress={handleClose} style={styles.closeButton}>
                  <X color="#FFFFFF" size={17} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.pathWrap, {height: pathHeight, width: pathWidth}]}>
              <ProgressPath currentDay={currentDay} nodeOffsets={NODE_OFFSETS} slotHeight={STANDARD_SLOT_HEIGHT} slotHeights={slotHeights} width={pathWidth} />
              {days.map((day) => {
                const state = getNodeState(day, currentDay, hasClaimedCurrentDay);
                const isFocused = day === currentDay || day === ELITE_PASS_DAYS;

                return (
                  <AnimatedDaySlot
                    height={slotHeights[day - 1]}
                    key={day}
                    isFocused={isFocused}
                  >
                    <DayNode
                      day={day}
                      isJackpot={day === ELITE_PASS_DAYS}
                      onPress={state === "current" && canClaimNow ? () => void handleClaim() : undefined}
                      state={state}
                    />
                    {day === ELITE_PASS_DAYS && state === "current" ? <DaySevenRevealBurst burstKey={daySevenRevealKey} /> : null}
                  </AnimatedDaySlot>
                );
              })}
            </View>

            {errorMessage ? <Text selectable style={styles.errorText}>{errorMessage}</Text> : null}
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
    backgroundColor: "#05070B",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "#05070B",
  },
  archPanel: {
    position: "absolute",
    height: 220,
    borderRadius: 8,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(255, 255, 255, 0.035)",
    transform: [{rotate: "-14deg"}],
  },
  archPanelTop: {
    top: -66,
    left: -72,
    right: 80,
  },
  archPanelMid: {
    top: 184,
    left: 78,
    right: -120,
    opacity: 0.82,
  },
  archPanelBottom: {
    bottom: -88,
    left: -42,
    right: 36,
    opacity: 0.55,
  },
  blueWash: {
    position: "absolute",
    top: -40,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "rgba(47, 128, 255, 0.1)",
    opacity: 0.68,
  },
  gridLineA: {
    position: "absolute",
    top: 118,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(143, 211, 255, 0.08)",
  },
  gridLineB: {
    position: "absolute",
    bottom: 138,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  scrollContent: {
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  content: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    gap: 12,
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
    borderColor: "rgba(47, 128, 255, 0.44)",
    backgroundColor: "rgba(47, 128, 255, 0.12)",
    boxShadow: "0px 0px 18px rgba(47, 128, 255, 0.18)",
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 29,
    ...fonts.bold,
  },
  subtitle: {
    color: "rgba(143, 211, 255, 0.78)",
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
    borderColor: "rgba(47, 128, 255, 0.3)",
    backgroundColor: "rgba(10, 18, 31, 0.86)",
    boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.18)",
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
    backgroundColor: "rgba(255, 255, 255, 0.07)",
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
  errorText: {
    color: "#FF9AA5",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.medium,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "rgba(5, 7, 11, 0.32)",
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
    borderColor: "rgba(47, 128, 255, 0.56)",
    backgroundColor: "rgba(8, 12, 20, 0.96)",
    boxShadow: "0px 16px 28px rgba(0, 0, 0, 0.34)",
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
