import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useMutation } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../../lib/haptics";
import { useTheme, type Theme } from "../../styles/theme";
import { fonts } from "../../styles/typography";
import { useViewerCredits } from "../viewer-credits-context";
import { useViewerSession } from "../viewer-session-context";

type ElitePassModalProps = {
  visible: boolean;
  onClose: () => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_CAP = 2;

export function ElitePassModal({ visible, onClose }: ElitePassModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["58%"], []);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const { anonymousId } = useViewerSession();
  const {
    credits,
    diamondBalance,
    lastClaimAt,
    streakCount,
    setOptimisticRewardState,
  } = useViewerCredits();
  const claimDailyDiamond = useMutation("diamonds:claimDailyDiamond" as any);
  const [isClaiming, setIsClaiming] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const alreadyClaimed = lastClaimAt > 0 && now - lastClaimAt < DAY_MS;
  const atCap = diamondBalance >= DAILY_CAP;
  const currentDay = alreadyClaimed
    ? Math.max(Math.min(streakCount, 7), 1)
    : Math.min(Math.max(streakCount + 1, 1), 7);
  const isDay7Available = !alreadyClaimed && !atCap && currentDay === 7;
  const canClaim = !alreadyClaimed && !atCap && !isClaiming;

  useEffect(() => {
    if (visible) {
      setNow(Date.now());
      sheetRef.current?.present();
      return;
    }

    sheetRef.current?.dismiss();
  }, [visible]);

  useEffect(() => {
    if (!visible || alreadyClaimed || atCap) {
      pulseScale.stopAnimation();
      pulseScale.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.1,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [alreadyClaimed, atCap, pulseScale, visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.42} />
    ),
    [],
  );

  const handleClaim = useCallback(async () => {
    if (!canClaim) {
      return;
    }

    triggerHaptic();
    setIsClaiming(true);
    try {
      const result = await claimDailyDiamond(anonymousId ? { anonymousId } : {});
      const nextState = {
        credits: typeof result?.credits === "number" ? result.credits : credits,
        diamondBalance: typeof result?.diamondBalance === "number" ? result.diamondBalance : diamondBalance,
        lastClaimAt: typeof result?.lastClaimAt === "number" ? result.lastClaimAt : lastClaimAt,
        nextDiamondClaimAt: typeof result?.nextDiamondClaimAt === "number" ? result.nextDiamondClaimAt : 0,
        streakCount: typeof result?.streakCount === "number" ? result.streakCount : streakCount,
        hasProAccess: Boolean(result?.hasProAccess),
        hasPaidAccess: Boolean(result?.hasProAccess),
      };
      setOptimisticRewardState(nextState);
      setNow(Date.now());
    } finally {
      setIsClaiming(false);
    }
  }, [
    anonymousId,
    canClaim,
    claimDailyDiamond,
    credits,
    diamondBalance,
    lastClaimAt,
    setOptimisticRewardState,
    streakCount,
  ]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      onDismiss={onClose}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom + 18, 28) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>🔥 Elite Pass</Text>
          <Text style={styles.subtitle}>
            Revenez chaque jour pour gagner des diamants et débloquer un accès Pro.
          </Text>
        </View>

        <View style={styles.streakWrap}>
          <View style={styles.connectorRow}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.connectorSegment,
                  index < Math.max(streakCount - (alreadyClaimed ? 1 : 0), 0)
                    ? styles.connectorSegmentCompleted
                    : styles.connectorSegmentLocked,
                ]}
              />
            ))}
          </View>

          <View style={styles.dayRow}>
            {Array.from({ length: 7 }).map((_, index) => {
              const day = index + 1;
              const isDay7 = day === 7;
              const completed = day <= streakCount && (alreadyClaimed || day < currentDay);
              const current = day === currentDay && !alreadyClaimed && !atCap;
              const claimedToday = day === currentDay && alreadyClaimed;
              const locked = !completed && !current && !claimedToday;
              const nodeStyles = [
                styles.dayNode,
                isDay7 ? styles.day7Node : null,
                completed || claimedToday ? styles.dayNodeCompleted : null,
                current ? (isDay7 ? styles.dayNodeDay7Current : styles.dayNodeCurrent) : null,
                locked ? styles.dayNodeLocked : null,
              ];
              const node = (
                <View style={nodeStyles}>
                  <Text style={styles.dayNodeText}>
                    {completed || claimedToday ? "✓" : current ? "💎" : "🔒"}
                  </Text>
                </View>
              );

              return (
                <View key={day} style={styles.dayItem}>
                  {current ? <Animated.View style={{ transform: [{ scale: pulseScale }] }}>{node}</Animated.View> : node}
                  <Text style={[styles.dayLabel, isDay7 ? styles.day7Label : null]}>
                    {isDay7 ? "Accès Pro 24h" : `J${day}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {isDay7Available ? (
          <Pressable
            accessibilityRole="button"
            disabled={!canClaim}
            onPress={() => void handleClaim()}
            style={styles.claimPressable}
          >
            <LinearGradient colors={["#FFD700", "#FFA500"]} style={styles.claimGradient}>
              {isClaiming ? (
                <ActivityIndicator color="#1A1300" />
              ) : (
                <Text style={styles.claimGoldText}>Réclamer — 3💎 + Accès Pro 24h 🎉</Text>
              )}
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!canClaim}
            onPress={() => void handleClaim()}
            style={[
              styles.claimButton,
              alreadyClaimed || atCap ? styles.claimButtonDisabled : styles.claimButtonEnabled,
            ]}
          >
            {isClaiming ? (
              <ActivityIndicator color="#1A1300" />
            ) : (
              <Text style={[
                styles.claimText,
                alreadyClaimed || atCap ? styles.claimTextDisabled : styles.claimTextEnabled,
              ]}>
                {alreadyClaimed
                  ? "Diamant réclamé ✓ — Revenez demain"
                  : atCap
                    ? "Solde maximum atteint — utilisez un diamant"
                    : "Réclamer mon diamant du jour 💎"}
              </Text>
            )}
          </Pressable>
        )}

        <Text style={styles.balanceText}>Solde actuel : 💎 {diamondBalance}</Text>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  sheetBackground: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: theme.borderLight,
    width: 42,
  },
  content: {
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  header: {
    gap: 6,
  },
  title: {
    color: "#FFB400",
    fontSize: 18,
    lineHeight: 22,
    ...fonts.bold,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    ...fonts.regular,
  },
  streakWrap: {
    minHeight: 78,
    justifyContent: "center",
  },
  connectorRow: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 18,
    flexDirection: "row",
  },
  connectorSegment: {
    flex: 1,
    height: 2,
  },
  connectorSegmentCompleted: {
    backgroundColor: "#2ECC71",
  },
  connectorSegmentLocked: {
    backgroundColor: theme.border,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  dayItem: {
    width: 44,
    alignItems: "center",
    gap: 7,
  },
  dayNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  day7Node: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dayNodeCompleted: {
    backgroundColor: "#2ECC71",
  },
  dayNodeCurrent: {
    backgroundColor: "#FFB400",
  },
  dayNodeDay7Current: {
    backgroundColor: "#FFD700",
  },
  dayNodeLocked: {
    backgroundColor: theme.surfaceMuted,
  },
  dayNodeText: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    ...fonts.bold,
  },
  dayLabel: {
    color: theme.textSecondary,
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center",
    ...fonts.medium,
  },
  day7Label: {
    color: "#FFD700",
    fontSize: 9,
    lineHeight: 11,
  },
  claimPressable: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  claimGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  claimButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  claimButtonEnabled: {
    backgroundColor: "#FFB400",
  },
  claimButtonDisabled: {
    backgroundColor: theme.surfaceMuted,
  },
  claimText: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.bold,
  },
  claimTextEnabled: {
    color: "#1A1300",
  },
  claimTextDisabled: {
    color: theme.textSecondary,
  },
  claimGoldText: {
    color: "#1A1300",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.bold,
  },
  balanceText: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.bold,
  },
  });
}
