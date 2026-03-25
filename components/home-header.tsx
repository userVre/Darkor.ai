import { memo, useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gem } from "lucide-react-native";

import { CreditLimitModal } from "./credit-limit-modal";
import { LuxPressable } from "./lux-pressable";
import { triggerHaptic } from "../lib/haptics";

type HomeHeaderProps = {
  diamondCount: number;
  onUpgradeToPro: () => void;
};

export const HomeHeader = memo(function HomeHeader({
  diamondCount,
  onUpgradeToPro,
}: HomeHeaderProps) {
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  const handleOpenCredits = useCallback(() => {
    triggerHaptic();
    setIsCreditModalOpen(true);
  }, []);

  const handleCloseCredits = useCallback(() => {
    setIsCreditModalOpen(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    setIsCreditModalOpen(false);
    onUpgradeToPro();
  }, [onUpgradeToPro]);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Darkor.ai</Text>
            <Text style={styles.title}>Choose Your Transformation</Text>
          </View>

          <LuxPressable
            onPress={handleOpenCredits}
            style={styles.diamondBadge}
            className="cursor-pointer"
            glowColor="rgba(125,211,252,0.14)"
            scale={0.98}
          >
            <Gem color="#7dd3fc" size={15} strokeWidth={2.1} />
            <Text style={styles.diamondBadgeText}>{diamondCount}</Text>
          </LuxPressable>
        </View>
      </View>

      <CreditLimitModal visible={isCreditModalOpen} onClose={handleCloseCredits} onUpgrade={handleUpgrade} />
    </>
  );
});

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 12,
    paddingRight: 12,
  },
  eyebrow: {
    color: "#8b8b92",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  diamondBadge: {
    marginTop: 8,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(8,8,10,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  diamondBadgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
