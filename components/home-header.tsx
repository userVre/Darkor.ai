import { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { fonts } from "../styles/typography";
import { spacing } from "../styles/spacing";
import { type Theme, useTheme } from "@/styles/theme";

import { LuxPressable } from "./lux-pressable";
import Logo from "./logo";
import { DS, SCREEN_SECTION_GAP, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

type HomeHeaderProps = {
  remainingRenders: number;
  progressValue: number;
  onUpgradeToPro: () => void;
};

export const HomeHeader = memo(function HomeHeader({
  remainingRenders,
  progressValue,
  onUpgradeToPro,
}: HomeHeaderProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const handleOpenCredits = useCallback(() => {
    triggerHaptic();
    onUpgradeToPro();
  }, [onUpgradeToPro]);

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.brandCluster}>
          <View style={styles.logoShell}>
            <Logo size={32} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.eyebrow}>{t("app.name")}</Text>
            <Text style={styles.brandLabel}>Design Studio</Text>
          </View>
        </View>

        <LuxPressable
          onPress={handleOpenCredits}
          style={styles.creditChip}
          className="cursor-pointer"
          glowColor={DS.colors.accentGlow}
          scale={0.96}
        >
          <View style={styles.creditChipCopy}>
            <Text style={styles.creditChipValue}>{remainingRenders}</Text>
            <Text style={styles.creditChipLabel}>Credits</Text>
          </View>
          <View style={styles.creditChipTrack}>
            <View style={[styles.creditChipFill, { width: `${Math.max(progressValue * 100, 0)}%` }]} />
          </View>
        </LuxPressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>Redesign Any Room with AI in Seconds</Text>
          <Text style={styles.description}>
            Trusted by 10,000+ homeowners and designers worldwide
          </Text>
        </View>
      </View>
    </View>
  );
});

function createStyles(colors: Theme) {
  return StyleSheet.create({
    header: {
      gap: SCREEN_SECTION_GAP,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    brandCluster: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    logoShell: {
      ...surfaceCard(colors.surface),
      ...glowShadow(colors.border, 18),
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    brandCopy: {
      gap: spacing.xs,
    },
    eyebrow: {
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "700",
      lineHeight: 16,
      letterSpacing: 1.6,
      textTransform: "uppercase",
    },
    brandLabel: {
      color: colors.textSecondary,
      ...DS.typography.bodySm,
    },
    creditChip: {
      borderRadius: DS.radius.pill,
      minWidth: 112,
    },
    creditChipCopy: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      gap: spacing.xs,
      ...glowShadow(colors.brand, 26),
    },
    creditChipValue: {
      color: colors.textPrimary,
      fontSize: 18,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "900",
      letterSpacing: -0.35,
      fontVariant: ["tabular-nums"],
    },
    creditChipLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "900",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    creditChipTrack: {
      height: 4,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: DS.radius.pill,
      backgroundColor: colors.borderLight,
      overflow: "hidden",
    },
    creditChipFill: {
      height: "100%",
      borderRadius: DS.radius.pill,
      backgroundColor: colors.brand,
    },
    heroCard: {
      ...surfaceCard(colors.surfaceHigh),
      ...glowShadow(colors.border, 22),
      padding: spacing.md,
    },
    heroCopy: {
      gap: spacing.sm,
    },
    title: {
      color: colors.textPrimary,
      ...DS.typography.display,
      fontSize: 38,
      lineHeight: 42,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "900",
      letterSpacing: -1.2,
    },
    description: {
      color: colors.textSecondary,
      ...DS.typography.body,
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 560,
    },
  });
}


