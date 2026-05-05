import {useMutation} from "convex/react";
import * as Haptics from "expo-haptics";
import {useCallback, useState} from "react";
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {scheduleOrUpdateDiamondReminder} from "../lib/notifications";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon} from "./diamond-credit-pill";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

type ClaimResult = {
  granted?: boolean;
  credits?: number;
  creditsAdded?: number;
  diamondBalance?: number;
  claimedAt?: number;
  onboardingDiamondClaimedAt?: number;
  firstEntryRewardDismissedAt?: number;
  streakCount?: number;
  streak_count?: number;
  nextDiamondClaimAt?: number;
  nextEligibleAt?: number;
};

export function FirstEntryRewardModal({visible}: {visible: boolean}) {
  const insets = useSafeAreaInsets();
  const {anonymousId} = useViewerSession();
  const {
    credits,
    diamondBalance,
    nextDiamondClaimAt,
    setOptimisticRewardState,
    streakCount,
  } = useViewerCredits();
  const claimOnboardingDiamond = useMutation("users:claimOnboardingDiamond" as any);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = useCallback(async () => {
    if (isClaiming) {
      return;
    }

    setIsClaiming(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    try {
      const result = await claimOnboardingDiamond({anonymousId: anonymousId ?? undefined}) as ClaimResult;
      const creditsAdded = result.creditsAdded ?? (result.granted ? 1 : 0);
      const nextClaimedAt = result.claimedAt ?? result.onboardingDiamondClaimedAt ?? Date.now();
      const nextDiamondBalance = result.diamondBalance ?? Math.max(diamondBalance + creditsAdded, 1);
      const nextDismissedAt = result.firstEntryRewardDismissedAt ?? nextClaimedAt;
      const nextStreakCount = result.streakCount ?? result.streak_count ?? streakCount;

      setOptimisticRewardState({
        credits: typeof result.credits === "number" ? result.credits : Math.max(credits + creditsAdded, 1),
        diamondBalance: nextDiamondBalance,
        streakCount: nextStreakCount,
        canClaimDiamond: false,
        nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? nextDiamondClaimAt,
        lastClaimAt: nextClaimedAt,
        onboardingDiamondClaimedAt: nextClaimedAt,
        firstEntryRewardDismissedAt: nextDismissedAt,
      });

      if (result.granted) {
        void scheduleOrUpdateDiamondReminder({
          diamondBalance: nextDiamondBalance,
          lastDiamondClaimAt: nextClaimedAt,
          nextDiamondClaimAt: result.nextDiamondClaimAt ?? result.nextEligibleAt ?? nextDiamondClaimAt,
        });
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch {
      setIsClaiming(false);
    }
  }, [
    anonymousId,
    claimOnboardingDiamond,
    credits,
    diamondBalance,
    isClaiming,
    nextDiamondClaimAt,
    setOptimisticRewardState,
    streakCount,
  ]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      transparent
      visible={visible}
    >
      <View
        style={[styles.overlay, {paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24}]}
      >
        <Pressable accessibilityViewIsModal onPress={() => undefined} style={styles.container}>
          <View style={styles.iconShell}>
            <DiamondCreditIcon primaryColor="#111318" monochrome size={20} />
          </View>

          <Text style={styles.title}>Claim 1 Diamond</Text>
          <Text style={styles.message}>
            Your Elite Pass Day 1 reward is ready. Claim it now to start designing.
          </Text>

          <Pressable
            accessibilityLabel="Claim 1 Free Diamond"
            accessibilityRole="button"
            disabled={isClaiming}
            onPress={() => void handleClaim()}
            style={({pressed}) => [
              styles.claimButton,
              pressed && !isClaiming ? styles.claimButtonPressed : null,
            ]}
          >
            {isClaiming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.claimContent}>
                <DiamondCreditIcon primaryColor="#FFFFFF" monochrome size={16} />
                <Text numberOfLines={1} style={styles.claimText}>Claim 1 Free Diamond</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(15, 23, 42, 0.22)",
  },
  container: {
    width: "100%",
    maxWidth: 370,
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(17, 19, 24, 0.08)",
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 20px 44px rgba(15, 23, 42, 0.04)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 20},
    elevation: 2,
  },
  iconShell: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(17, 19, 24, 0.08)",
    backgroundColor: "#F8FAFC",
  },
  message: {
    color: "#111318",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    ...fonts.medium,
  },
  title: {
    color: "#111318",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    ...fonts.bold,
  },
  claimButton: {
    minHeight: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#111318",
  },
  claimButtonPressed: {
    opacity: 0.88,
    transform: [{scale: 0.99}],
  },
  claimContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  claimText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 19,
    ...fonts.bold,
  },
});
