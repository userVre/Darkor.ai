import {useMutation} from "convex/react";
import {LinearGradient} from "expo-linear-gradient";
import {AnimatePresence, MotiView} from "moti";
import {useEffect, useMemo, useState} from "react";
import {Modal, Pressable, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DS} from "../lib/design-system";
import {triggerHaptic} from "../lib/haptics";
import {radix} from "../styles/theme";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon, DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

const ELITE_MILESTONE_DAYS = new Set([7, 14, 21]);
const ELITE_MILESTONE_REWARDS: Record<number, number> = {
  7: 3,
  14: 5,
  21: 7,
};

type ClaimRewardResult = {
  granted?: boolean;
  credits?: number;
  creditsAdded?: number;
  streakCount?: number;
  streak_count?: number;
  elitePassActivated?: boolean;
  eliteProUntil?: number;
};

function getCycleProgress(streakCount: number) {
  return ((Math.max(1, streakCount) - 1) % 7) + 1;
}

function SparkleBurst({ burstKey, elite }: { burstKey: number; elite: boolean }) {
  if (burstKey <= 0) {
    return null;
  }

  const sparkles = [
    { x: -98, y: -52, delay: 0 },
    { x: -58, y: -92, delay: 60 },
    { x: 4, y: -112, delay: 120 },
    { x: 70, y: -84, delay: 180 },
    { x: 104, y: -28, delay: 240 },
    { x: -88, y: 28, delay: 300 },
    { x: 76, y: 44, delay: 360 },
  ];
  const color = elite ? "#FACC15" : "#7DD3FC";

  return (
    <View pointerEvents="none" style={styles.sparkleLayer}>
      {sparkles.map((sparkle, index) => (
        <MotiView
          key={`${burstKey}-${index}`}
          from={{ opacity: 1, scale: 0.3, translateX: 0, translateY: 0, rotate: "0deg" }}
          animate={{
            opacity: 0,
            scale: 1.1,
            translateX: sparkle.x,
            translateY: sparkle.y,
            rotate: "28deg",
          }}
          transition={{ type: "timing", duration: 980, delay: sparkle.delay }}
          style={[styles.sparkle, { backgroundColor: color }]}
        />
      ))}
    </View>
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
  const claimDailyDiamondReward = useMutation("users:claimDailyDiamondReward" as any);
  const [visible, setVisible] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimRewardResult | null>(null);
  const [sparkleKey, setSparkleKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedStreakCount = claimResult?.streakCount ?? claimResult?.streak_count ?? streakCount;
  const isEliteDay = ELITE_MILESTONE_DAYS.has(resolvedStreakCount);
  const isEliteTheme = isEliteDay || claimResult?.elitePassActivated === true;
  const progress = getCycleProgress(resolvedStreakCount);
  const rewardDiamonds = claimResult?.creditsAdded ?? ELITE_MILESTONE_REWARDS[resolvedStreakCount] ?? 1;
  const displayedCredits = claimResult?.credits ?? credits + rewardDiamonds;

  const theme = useMemo(
    () => ({
      overlay: isEliteTheme ? "rgba(2, 6, 23, 0.68)" : "rgba(15, 23, 42, 0.36)",
      cardStart: isEliteTheme ? "#020617" : radix.light.slate.slate1,
      cardEnd: isEliteTheme ? "#0F172A" : "#FFFFFF",
      border: isEliteTheme ? "rgba(250, 204, 21, 0.42)" : "rgba(0, 122, 255, 0.18)",
      title: isEliteTheme ? "#F8FAFC" : radix.light.slate.slate12,
      body: isEliteTheme ? "#CBD5E1" : radix.light.slate.slate11,
      muted: isEliteTheme ? "#94A3B8" : radix.light.slate.slate10,
      rail: isEliteTheme ? "rgba(148, 163, 184, 0.24)" : radix.light.slate.slate4,
      active: isEliteTheme ? "#38BDF8" : DIAMOND_PILL_BLUE,
      activeAlt: isEliteTheme ? "#FACC15" : "#7DD3FC",
    }),
    [isEliteTheme],
  );

  useEffect(() => {
    if (viewerReady && isReady && canClaimDiamond) {
      setVisible(true);
      setClaimResult(null);
      setErrorMessage(null);
    }
  }, [canClaimDiamond, isReady, viewerReady]);

  const handleClaim = async () => {
    if (isClaiming) {
      return;
    }

    setIsClaiming(true);
    setErrorMessage(null);
    triggerHaptic();

    try {
      const result = await claimDailyDiamondReward({ anonymousId: anonymousId ?? undefined }) as ClaimRewardResult;
      const nextStreakCount = result.streakCount ?? result.streak_count ?? resolvedStreakCount;
      const nextEliteProUntil = result.eliteProUntil ?? eliteProUntil;
      setClaimResult(result);
      setOptimisticRewardState({
        credits: typeof result.credits === "number" ? result.credits : credits,
        streakCount: nextStreakCount,
        canClaimDiamond: false,
        hasProAccess: result.elitePassActivated ? true : undefined,
        hasPaidAccess: result.elitePassActivated ? true : undefined,
        eliteProUntil: nextEliteProUntil,
      });
      setSparkleKey((current) => current + 1);

      setTimeout(() => {
        setVisible(false);
        setIsClaiming(false);
      }, result.granted ? 1500 : 650);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to claim your reward right now.");
      setIsClaiming(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={() => undefined} transparent visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <AnimatePresence>
          {visible ? (
            <MotiView
              from={{ opacity: 0, scale: 0.94, translateY: 18 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.98, translateY: 8 }}
              transition={{ type: "timing", duration: 260 }}
              style={styles.cardWrap}
            >
              <LinearGradient
                colors={[theme.cardStart, theme.cardEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: theme.border }]}
              >
                <SparkleBurst burstKey={sparkleKey} elite={isEliteTheme} />

                <View style={styles.rewardHalo}>
                  <LinearGradient
                    colors={isEliteTheme ? ["#38BDF8", "#FACC15"] : ["#7DD3FC", DIAMOND_PILL_BLUE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rewardIcon}
                  >
                    <DiamondCreditIcon primaryColor="#FFFFFF" size={34} />
                  </LinearGradient>
                </View>

                <View style={styles.copy}>
                  <Text style={[styles.eyebrow, { color: theme.muted }]}>Daily Reward</Text>
                  <Text style={[styles.title, { color: theme.title }]}>
                    {isEliteTheme ? "ELITE PASS ACTIVATED!" : "Congratulations"}
                  </Text>
                  <Text style={[styles.body, { color: theme.body }]}>
                    {isEliteTheme
                      ? `You have 24 hours of PRO access and ${displayedCredits} Diamonds.`
                      : `Congrats on reaching Day ${resolvedStreakCount}! 🔥`}
                  </Text>
                </View>

                <View style={styles.pathRow}>
                  {Array.from({ length: 7 }).map((_, index) => {
                    const active = index + 1 <= progress;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pathDot,
                          {
                            backgroundColor: active ? theme.active : theme.rail,
                            borderColor: active ? theme.activeAlt : "rgba(148, 163, 184, 0.2)",
                          },
                        ]}
                      >
                        {index === 6 ? <Text style={styles.pathDotText}>★</Text> : null}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.rewardLine}>
                  <Text style={[styles.rewardLineText, { color: theme.body }]}>
                    +{rewardDiamonds} Diamond{rewardDiamonds === 1 ? "" : "s"} today
                  </Text>
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isClaiming}
                  onPress={() => void handleClaim()}
                  style={({ pressed }) => [
                    styles.claimButton,
                    pressed || isClaiming ? styles.claimButtonPressed : null,
                  ]}
                >
                  <Text style={styles.claimButtonText}>
                    {isClaiming ? "Claiming..." : "Claim My Diamond"}
                  </Text>
                </Pressable>
              </LinearGradient>
            </MotiView>
          ) : null}
        </AnimatePresence>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    minHeight: 460,
    overflow: "hidden",
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 20,
    boxShadow: "0px 28px 70px rgba(15, 23, 42, 0.3)",
  },
  rewardHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125, 211, 252, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.22)",
  },
  rewardIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    ...DS.typography.label,
    letterSpacing: 1.4,
  },
  title: {
    ...fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  body: {
    ...DS.typography.body,
    textAlign: "center",
  },
  pathRow: {
    width: "100%",
    maxWidth: 284,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pathDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pathDotText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 14,
    ...fonts.bold,
  },
  rewardLine: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125, 211, 252, 0.12)",
  },
  rewardLineText: {
    ...DS.typography.button,
  },
  errorText: {
    color: "#DC2626",
    ...DS.typography.bodySm,
    textAlign: "center",
  },
  claimButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DIAMOND_PILL_BLUE,
    boxShadow: "0px 16px 30px rgba(0, 122, 255, 0.32)",
  },
  claimButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  claimButtonText: {
    color: "#FFFFFF",
    ...fonts.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  sparkleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
});
