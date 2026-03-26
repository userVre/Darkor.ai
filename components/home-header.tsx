import { memo, useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gem, SlidersHorizontal } from "lucide-react-native";

import { CreditLimitModal } from "./credit-limit-modal";
import { LuxPressable } from "./lux-pressable";
import Logo from "./logo";
import { DS, SCREEN_SECTION_GAP, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

type HomeHeaderProps = {
  diamondCount: number;
  onUpgradeToPro: () => void;
  onOpenProfile: () => void;
};

export const HomeHeader = memo(function HomeHeader({
  diamondCount,
  onUpgradeToPro,
  onOpenProfile,
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
        <View style={styles.topRow}>
          <View style={styles.brandCluster}>
            <View style={styles.logoShell}>
              <Logo size={32} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.eyebrow}>Darkor.ai</Text>
              <Text style={styles.brandLabel}>Design Studio</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <LuxPressable
              onPress={handleOpenCredits}
              style={styles.diamondBadge}
              className="cursor-pointer"
              glowColor={DS.colors.accentGlow}
              scale={0.96}
            >
              <Gem color={DS.colors.accentStrong} size={15} strokeWidth={2.1} />
              <Text style={styles.diamondBadgeText}>{diamondCount}</Text>
            </LuxPressable>
            <LuxPressable
              onPress={onOpenProfile}
              style={styles.iconButton}
              className="cursor-pointer"
              glowColor={DS.colors.accentGlow}
              scale={0.96}
            >
              <SlidersHorizontal color={DS.colors.textPrimary} size={17} strokeWidth={2.1} />
            </LuxPressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Choose Your Transformation</Text>
            <Text style={styles.description}>
              A quieter, sharper workspace for premium redesign workflows across interiors, facades, gardens, paint, and flooring.
            </Text>
          </View>
        </View>
      </View>

      <CreditLimitModal visible={isCreditModalOpen} onClose={handleCloseCredits} onUpgrade={handleUpgrade} />
    </>
  );
});

const styles = StyleSheet.create({
  header: {
    gap: SCREEN_SECTION_GAP,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brandCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: DS.spacing[2],
  },
  logoShell: {
    ...surfaceCard(DS.colors.surface),
    ...glowShadow("rgba(255,255,255,0.04)", 18),
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  brandCopy: {
    gap: 4,
  },
  eyebrow: {
    color: DS.colors.textTertiary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  brandLabel: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: DS.spacing[1.5],
  },
  diamondBadge: {
    ...surfaceCard(DS.colors.surface),
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: DS.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    ...surfaceCard(DS.colors.surface),
    width: 44,
    height: 44,
    borderRadius: DS.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  diamondBadgeText: {
    color: DS.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroCard: {
    ...surfaceCard(),
    ...glowShadow("rgba(255,255,255,0.02)", 22),
    paddingHorizontal: DS.spacing[3],
    paddingVertical: DS.spacing[3],
  },
  heroCopy: {
    gap: DS.spacing[2],
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.display,
  },
  description: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    maxWidth: 620,
  },
});
