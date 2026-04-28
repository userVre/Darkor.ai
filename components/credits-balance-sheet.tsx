import {Modal, Pressable, StyleSheet, Text, View} from "react-native";

import {DS, organicRadii, surfaceCard} from "../lib/design-system";
import {DiamondCreditIcon, ProBadge} from "./diamond-credit-pill";

type CreditsBalanceSheetProps = {
  visible: boolean;
  credits: number;
  hasPaidAccess: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

export function CreditsBalanceSheet({
  visible,
  credits,
  hasPaidAccess,
  onClose,
  onUpgrade,
}: CreditsBalanceSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>Credits</Text>
          <Text style={styles.title}>Your balance</Text>

          <View style={styles.balanceCard}>
            {hasPaidAccess ? (
              <ProBadge style={styles.proBadge} />
            ) : (
              <View style={styles.balanceRow}>
                <DiamondCreditIcon primaryColor="#1D4ED8" size={22} />
                <Text style={styles.balanceText}>{credits} Diamonds</Text>
              </View>
            )}
            <Text style={styles.balanceHint}>
              {hasPaidAccess
                ? "Your active PRO subscription keeps premium access unlocked."
                : "Diamonds are used for generations. When you run low, tap Upgrade to unlock more access through the paywall."}
            </Text>
          </View>

          <Pressable accessibilityRole="button" onPress={onUpgrade} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Upgrade</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2, 6, 23, 0.42)",
  },
  sheet: {
    ...surfaceCard("#FFFFFF"),
    ...organicRadii(28, 18),
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    marginBottom: 4,
  },
  eyebrow: {
    color: DS.colors.textTertiary,
    ...DS.typography.label,
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  balanceCard: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.surfaceHigh,
    ...organicRadii(24, 16),
    padding: 16,
    gap: 12,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
    fontSize: 20,
    lineHeight: 24,
  },
  balanceHint: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  proBadge: {
    alignSelf: "flex-start",
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: DS.colors.accent,
  },
  primaryButtonText: {
    color: DS.colors.textInverse,
    ...DS.typography.button,
  },
});
