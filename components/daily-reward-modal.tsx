import {useMutation} from "convex/react";
import {X} from "@/components/material-icons";
import * as Haptics from "expo-haptics";
import {LinearGradient} from "expo-linear-gradient";
import {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
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
import {DayNode, type DayNodeState} from "./elitepass/DayNode";
import {ProgressPath} from "./elitepass/ProgressPath";
import {ElitePassLineIcon} from "./diamond-credit-pill";
import {useElitePassModal} from "./elite-pass-context";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const ELITE_PASS_DAYS = 7;
const WHITE = "#FFFFFF";
const TEXT = "#000000";
const SECONDARY = "#6B7280";
const ACCENT_PURPLE = "#7B61FF";
const ACCENT_BLUE = "#5AC8FA";
const STANDARD_SLOT_HEIGHT = 82;
const JACKPOT_SLOT_HEIGHT = 100;
const NODE_OFFSETS = [0, 0, 0, 0, 0, 0, 0];
const CLAIM_CONFETTI_COLORS = [ACCENT_PURPLE, ACCENT_BLUE, WHITE, "#EEF0F4"];
const REVEAL_CONFETTI_COLORS = [ACCENT_PURPLE, ACCENT_BLUE, "#C7D2FE", WHITE];

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
      <View style={StyleSheet.absoluteFill} />
    </View>
  );
}

function ElitePassProgressHeader({currentDay}: {currentDay: number}) {
  const {t} = useTranslation();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(currentDay / ELITE_PASS_DAYS, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentDay, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{scaleX: progress.value}],
  }));

  return (
    <View style={styles.progressPanel}>
      <View style={styles.progressMetaRow}>
        <Text style={styles.progressTitle}>PROGRESSION QUOTIDIENNE</Text>
        <Text style={styles.progressCount}>{t("elitePass.progressCount", {current: currentDay, total: ELITE_PASS_DAYS})}</Text>
      </View>
      <View accessibilityLabel={t("elitePass.progressA11y", {current: currentDay, total: ELITE_PASS_DAYS})} style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]}>
          <LinearGradient
            colors={[ACCENT_PURPLE, ACCENT_BLUE]}
            start={{x: 0, y: 0.5}}
            end={{x: 1, y: 0.5}}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
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
  const {t} = useTranslation();
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
          <Text style={styles.successTitle}>{isJackpot ? t("elitePass.success.unlocked") : t("elitePass.success.claimed")}</Text>
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

function AnimatedDaySlot({
  children,
  height,
  index,
  isFocused,
  visible,
}: {
  children: ReactNode;
  height: number;
  index: number;
  isFocused: boolean;
  visible: boolean;
}) {
  const entrance = useSharedValue(0);
  const focus = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    if (!visible) {
      entrance.value = 0;
      return;
    }

    entrance.value = withDelay(
      index * 74,
      withTiming(1, {duration: 430, easing: Easing.out(Easing.cubic)}),
    );
  }, [entrance, index, visible]);

  useEffect(() => {
    focus.value = withTiming(isFocused ? 1 : 0, {duration: 240, easing: Easing.out(Easing.cubic)});
  }, [focus, isFocused]);

  const slotStyle = useAnimatedStyle(() => ({
    opacity: entrance.value * (0.7 + focus.value * 0.3),
    transform: [
      {translateY: (1 - entrance.value) * 26},
      {scale: 0.95 + focus.value * 0.05},
    ],
  }));

  return (
    <Animated.View style={[styles.nodeSlot, {height}, slotStyle]}>
      {children}
    </Animated.View>
  );
}

export function DailyRewardModal() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {height, width} = useWindowDimensions();
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
  const hasVerifiedClaim = claimResult?.granted === true;
  const canClaimNow = canClaimDiamond && !hasVerifiedClaim;
  const hasClaimedCurrentDay = hasVerifiedClaim || (!canClaimDiamond && lastClaimAt > 0);

  const days = useMemo(
    () => Array.from({length: ELITE_PASS_DAYS}, (_, index) => index + 1),
    [],
  );
  const standardSlotHeight = height < 700 ? 78 : STANDARD_SLOT_HEIGHT;
  const jackpotSlotHeight = height < 700 ? 96 : JACKPOT_SLOT_HEIGHT;
  const slotHeights = useMemo(
    () => days.map((day) => day === ELITE_PASS_DAYS ? jackpotSlotHeight : standardSlotHeight),
    [days, jackpotSlotHeight, standardSlotHeight],
  );
  const pathHeight = slotHeights.reduce((total, next) => total + next, 0);
  const pathWidth = Math.min(Math.max(width - 48, 240), 312);

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

      setErrorMessage(t("elitePass.errors.alreadyClaimed"));
      setIsClaiming(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("elitePass.errors.claimUnavailable"));
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
                <LinearGradient
                  colors={[ACCENT_PURPLE, ACCENT_BLUE]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.passBadge}
                >
                  <ElitePassLineIcon color={WHITE} size={25} />
                </LinearGradient>
                <View style={styles.titleCopy}>
                  <Text style={styles.title}>PASS ELITE</Text>
                  <Text style={styles.subtitle}>Récompense quotidienne</Text>
                </View>
              </View>

              <Pressable accessibilityLabel={t("elitePass.closeA11y")} accessibilityRole="button" onPress={handleClose} style={styles.closeButton}>
                <X color={TEXT} size={21} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ElitePassProgressHeader currentDay={currentDay} />

            <View style={[styles.pathWrap, {height: pathHeight, width: pathWidth}]}>
              <ProgressPath currentDay={currentDay} nodeOffsets={NODE_OFFSETS} slotHeight={standardSlotHeight} slotHeights={slotHeights} width={pathWidth} />
              {days.map((day, index) => {
                const state = getNodeState(day, currentDay, hasClaimedCurrentDay);
                const isFocused = day === currentDay || day === ELITE_PASS_DAYS;

                return (
                  <AnimatedDaySlot
                    height={slotHeights[day - 1]}
                    index={index}
                    key={day}
                    isFocused={isFocused}
                    visible={visible}
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
    backgroundColor: WHITE,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  archPanel: {
    position: "absolute",
    height: 220,
    borderRadius: 8,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(123, 97, 255, 0.11)",
    backgroundColor: "rgba(17, 24, 39, 0.026)",
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
  archGlassA: {
    position: "absolute",
    top: 92,
    right: -70,
    width: 230,
    height: 420,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "rgba(17, 24, 39, 0.032)",
    opacity: 0.58,
    transform: [{rotate: "18deg"}],
  },
  archGlassB: {
    position: "absolute",
    left: -88,
    bottom: 18,
    width: 260,
    height: 360,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "rgba(90, 200, 250, 0.08)",
    opacity: 0.44,
    transform: [{rotate: "18deg"}],
  },
  accentWash: {
    position: "absolute",
    top: -40,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "rgba(123, 97, 255, 0.08)",
    opacity: 0.66,
  },
  softWash: {
    position: "absolute",
    left: -20,
    right: -20,
    bottom: 0,
    height: 270,
    backgroundColor: "rgba(17, 24, 39, 0.04)",
    opacity: 0.58,
  },
  gridLineA: {
    position: "absolute",
    top: 118,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(123, 97, 255, 0.12)",
  },
  gridLineB: {
    position: "absolute",
    bottom: 138,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  scrollContent: {
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 312,
    alignItems: "center",
    gap: 16,
  },
  headerRow: {
    width: "100%",
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleLockup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  passBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 10px 20px rgba(123, 97, 255, 0.22)",
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    color: TEXT,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: 0,
    ...fonts.bold,
  },
  subtitle: {
    color: SECONDARY,
    fontSize: 13,
    lineHeight: 17,
    ...fonts.medium,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  progressPanel: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    boxShadow: "0px 12px 24px rgba(17, 24, 39, 0.08)",
  },
  progressMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  progressTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 12,
    lineHeight: 15,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  progressCount: {
    color: TEXT,
    fontSize: 20,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
    ...fonts.bold,
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: "#EEF0F4",
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 3,
    overflow: "hidden",
    transformOrigin: "left center",
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
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(123, 97, 255, 0.28)",
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 16px 28px rgba(17, 24, 39, 0.16)",
  },
  successTitle: {
    color: TEXT,
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
    ...fonts.premiumSerif,
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
