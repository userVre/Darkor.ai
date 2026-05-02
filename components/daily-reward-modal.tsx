import {useMutation} from "convex/react";
import {Check} from "@/components/material-icons";
import {AnimatePresence, MotiView} from "moti";
import {useEffect, useMemo, useState} from "react";
import {Modal, Pressable, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DS} from "../lib/design-system";
import {triggerHaptic} from "../lib/haptics";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon, ElitePassFlameIcon, RADIX_BLUE_9} from "./diamond-credit-pill";
import {useElitePassModal} from "./elite-pass-context";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const ELITE_PASS_DAYS = 7;
const STANDARD_REWARD_DIAMONDS = 1;
const DAY_SEVEN_REWARD_DIAMONDS = 3;
const CONFETTI_COLORS = [RADIX_BLUE_9, "#000000", "#FFFFFF"];
const CONFETTI_PIECES = Array.from({ length: 76 }, (_, index) => {
  const angle = (index / 76) * Math.PI * 2;
  const distance = 150 + (index % 8) * 24;

  return {
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: (index % 12) * 28,
    rotate: index % 2 === 0 ? "174deg" : "-138deg",
    size: 7 + (index % 4) * 2,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance + 170,
  };
});

type ClaimRewardResult = {
  granted?: boolean;
  credits?: number;
  creditsAdded?: number;
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
      label: "3 Diamonds + Pro Access",
    };
  }

  return {
    diamonds: STANDARD_REWARD_DIAMONDS,
    label: "1 Diamond",
  };
}

function ClaimSuccessAnimation({ burstKey, visible }: { burstKey: number; visible: boolean }) {
  const { width, height } = useWindowDimensions();

  return (
    <AnimatePresence>
      {visible ? (
        <MotiView
          key={`claim-success-${burstKey}`}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "timing", duration: 180 }}
          pointerEvents="none"
          style={styles.successOverlay}
        >
          <View style={styles.successMessageWrap}>
            <MotiView
              from={{ opacity: 0, scale: 0.88, translateY: 12 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: "spring", damping: 16, stiffness: 190 }}
              style={styles.successMessage}
            >
              <Text style={styles.successTitle}>Congrats!</Text>
            </MotiView>
          </View>

          {CONFETTI_PIECES.map((piece, index) => (
            <MotiView
              key={`${burstKey}-${index}`}
              from={{
                opacity: 0,
                scale: 0.5,
                translateX: 0,
                translateY: 0,
                rotate: "0deg",
              }}
              animate={{
                opacity: 1,
                scale: 1,
                translateX: piece.x,
                translateY: piece.y,
                rotate: piece.rotate,
              }}
              transition={{ type: "timing", duration: 1450, delay: piece.delay }}
              style={[
                styles.confettiPiece,
                {
                  backgroundColor: piece.color,
                  height: piece.size * 1.7,
                  left: width / 2,
                  top: height * 0.36,
                  width: piece.size,
                },
              ]}
            />
          ))}
        </MotiView>
      ) : null}
    </AnimatePresence>
  );
}

export function DailyRewardModal() {
  const insets = useSafeAreaInsets();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const {
    canClaimDiamond,
    credits,
    eliteProUntil,
    isReady,
    setOptimisticRewardState,
    streakCount,
  } = useViewerCredits();
  const { closeElitePass, openElitePass, visible } = useElitePassModal();
  const claimDailyDiamond = useMutation("users:claimDailyDiamond" as any);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimRewardResult | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successKey, setSuccessKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedStreakCount = claimResult?.streakCount ?? claimResult?.streak_count ?? streakCount;
  const currentDay = getCycleProgress(resolvedStreakCount);
  const rewardDiamonds = claimResult?.creditsAdded ?? getDayReward(currentDay).diamonds;
  const displayedCredits = claimResult?.credits ?? credits;
  const hasVerifiedClaim = claimResult?.granted === true;
  const canClaimNow = canClaimDiamond && !hasVerifiedClaim;

  const days = useMemo(
    () => Array.from({ length: ELITE_PASS_DAYS }, (_, index) => index + 1),
    [],
  );

  useEffect(() => {
    if (viewerReady && isReady && canClaimDiamond) {
      setClaimResult(null);
      setErrorMessage(null);
      openElitePass();
    }
  }, [canClaimDiamond, isReady, openElitePass, viewerReady]);

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
    triggerHaptic();

    try {
      const result = await claimDailyDiamond({ anonymousId: anonymousId ?? undefined }) as ClaimRewardResult;
      const nextStreakCount = result.streakCount ?? result.streak_count ?? resolvedStreakCount;
      const nextEliteProUntil = result.eliteProUntil ?? eliteProUntil;

      setClaimResult(result);
      setOptimisticRewardState({
        credits: typeof result.credits === "number" ? result.credits : credits,
        streakCount: nextStreakCount,
        canClaimDiamond: false,
        nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? 0,
        hasProAccess: result.elitePassActivated || result.hasProAccess ? true : undefined,
        hasPaidAccess: result.elitePassActivated || result.hasProAccess ? true : undefined,
        eliteProUntil: nextEliteProUntil,
      });

      if (result.granted) {
        setSuccessKey((current) => current + 1);
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
    <Modal animationType="fade" onRequestClose={handleClose} transparent visible={visible}>
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 18 }]}>
        <MotiView
          from={{ opacity: 0, scale: 0.96, translateY: 16 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 230 }}
          style={styles.sheet}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleLockup}>
              <View style={styles.flameBadge}>
                <ElitePassFlameIcon color="#000000" size={18} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={styles.eyebrow}>Elite Pass</Text>
                <Text style={styles.title}>7 Day Progress Path</Text>
              </View>
            </View>

            <Pressable accessibilityLabel="Close Elite Pass" accessibilityRole="button" onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <View style={styles.balanceRow}>
            <View style={styles.balanceIcon}>
              <DiamondCreditIcon monochrome primaryColor="#000000" size={20} />
            </View>
            <Text style={styles.balanceText}>{displayedCredits} Diamonds</Text>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>Day {currentDay}</Text>
            </View>
          </View>

          <View style={styles.path}>
            {days.map((day) => {
              const isCurrent = day === currentDay;
              const isPast = day < currentDay;
              const reward = getDayReward(day);

              return (
                <View
                  key={day}
                  style={[
                    styles.dayCard,
                    isCurrent ? styles.dayCardCurrent : null,
                    isPast ? styles.dayCardPast : null,
                  ]}
                >
                  <View style={styles.dayCardTop}>
                    <Text style={[styles.dayLabel, isCurrent ? styles.dayLabelCurrent : null]}>Day {day}</Text>
                    <View style={[styles.dayDot, isCurrent ? styles.dayDotCurrent : null]} />
                  </View>

                  <Text style={styles.rewardLabel}>{reward.label}</Text>
                  <Text style={styles.statusLabel}>
                    {isPast ? "Claimed" : isCurrent ? (canClaimNow ? "Ready" : "Current") : "Upcoming"}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.claimSummary}>
            <DiamondCreditIcon monochrome primaryColor="#000000" size={18} />
            <Text style={styles.claimSummaryText}>
              {canClaimNow
                ? `Claim +${rewardDiamonds} Diamond${rewardDiamonds === 1 ? "" : "s"} now`
                : hasVerifiedClaim
                  ? "Verified for today"
                : "Your next Elite Pass reward is waiting on the path"}
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isClaiming || !canClaimNow || hasVerifiedClaim}
            onPress={() => void handleClaim()}
            style={({ pressed }) => [
              styles.claimButton,
              hasVerifiedClaim ? styles.claimButtonVerified : null,
              !canClaimNow && !hasVerifiedClaim ? styles.claimButtonDisabled : null,
              pressed || isClaiming ? styles.claimButtonPressed : null,
            ]}
          >
            <View style={styles.claimButtonContent}>
              {hasVerifiedClaim ? <Check color="#FFFFFF" size={18} strokeWidth={2.5} /> : null}
              <Text style={styles.claimButtonText}>
                {hasVerifiedClaim ? "Verified" : isClaiming ? "Claiming..." : "Claim"}
              </Text>
            </View>
          </Pressable>
        </MotiView>

        <ClaimSuccessAnimation burstKey={successKey} visible={successVisible} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
  },
  sheet: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 16,
    boxShadow: "0px 24px 68px rgba(0, 0, 0, 0.14)",
  },
  headerRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleLockup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flameBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RADIX_BLUE_9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    boxShadow: `0px 0px 18px ${RADIX_BLUE_9}45`,
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: RADIX_BLUE_9,
    fontSize: 12,
    lineHeight: 15,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  title: {
    color: "#000000",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
  },
  closeText: {
    color: "#000000",
    fontSize: 20,
    lineHeight: 20,
    ...fonts.bold,
  },
  balanceRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
  },
  balanceIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceText: {
    flex: 1,
    color: "#000000",
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
    ...fonts.bold,
  },
  dayBadge: {
    minHeight: 30,
    justifyContent: "center",
    borderRadius: 15,
    paddingHorizontal: 10,
    backgroundColor: RADIX_BLUE_9,
  },
  dayBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 15,
    ...fonts.bold,
  },
  path: {
    gap: 8,
  },
  dayCard: {
    minHeight: 66,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  dayCardCurrent: {
    borderColor: RADIX_BLUE_9,
    borderWidth: 2,
    boxShadow: `0px 0px 18px ${RADIX_BLUE_9}55`,
  },
  dayCardPast: {
    opacity: 0.7,
  },
  dayCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dayLabel: {
    color: "#000000",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.bold,
  },
  dayLabelCurrent: {
    color: RADIX_BLUE_9,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000000",
  },
  dayDotCurrent: {
    backgroundColor: RADIX_BLUE_9,
  },
  rewardLabel: {
    color: "#000000",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.bold,
  },
  statusLabel: {
    color: "#000000",
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.58,
    ...fonts.regular,
  },
  claimSummary: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RADIX_BLUE_9,
    backgroundColor: "#FFFFFF",
  },
  claimSummaryText: {
    flex: 1,
    color: "#000000",
    fontSize: 13,
    lineHeight: 17,
    ...fonts.bold,
  },
  errorText: {
    color: "#000000",
    ...DS.typography.bodySm,
    textAlign: "center",
  },
  claimButton: {
    minHeight: 56,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RADIX_BLUE_9,
    boxShadow: `0px 14px 30px ${RADIX_BLUE_9}42`,
  },
  claimButtonDisabled: {
    backgroundColor: "#000000",
    opacity: 0.28,
    boxShadow: "0px 0px 0px rgba(0, 0, 0, 0)",
  },
  claimButtonVerified: {
    backgroundColor: "#64748B",
    boxShadow: "0px 12px 24px rgba(100, 116, 139, 0.24)",
  },
  claimButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
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
    backgroundColor: "transparent",
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
    borderColor: RADIX_BLUE_9,
    backgroundColor: "#FFFFFF",
    boxShadow: `0px 0px 28px ${RADIX_BLUE_9}50`,
  },
  successTitle: {
    color: "#000000",
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
    ...fonts.bold,
  },
  confettiPiece: {
    position: "absolute",
    borderRadius: 2,
  },
});
