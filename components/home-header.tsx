import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";

import { LuxPressable } from "./lux-pressable";
import Logo from "./logo";
import { DS, SCREEN_SECTION_GAP, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

type HomeHeaderProps = {
  remainingRenders: number;
  progressValue: number;
  onUpgradeToPro: () => void;
  onOpenProfile: () => void;
};

export const HomeHeader = memo(function HomeHeader({
  remainingRenders,
  progressValue,
  onUpgradeToPro,
  onOpenProfile,
}: HomeHeaderProps) {
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
            <Text style={styles.eyebrow}>Darkor.ai</Text>
            <Text style={styles.brandLabel}>Design Studio</Text>
          </View>
        </View>

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

      <LuxPressable
        onPress={handleOpenCredits}
        style={styles.creditBarShadow}
        className="cursor-pointer"
        glowColor="rgba(124,58,237,0.3)"
        scale={0.985}
      >
        <LinearGradient colors={["#7C3AED", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.creditBar}>
          <View style={styles.creditBarRow}>
            <Text style={styles.creditBarText}>{`${remainingRenders} ${remainingRenders === 1 ? "Render" : "Renders"} Left Today`}</Text>
            <Text style={styles.creditBarAction}>UPGRADE</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progressValue * 100, 0)}%` }]} />
          </View>
        </LinearGradient>
      </LuxPressable>

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
  iconButton: {
    ...surfaceCard(DS.colors.surface),
    width: 44,
    height: 44,
    borderRadius: DS.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  creditBarShadow: {
    borderRadius: DS.radius.pill,
  },
  creditBar: {
    minHeight: 68,
    borderRadius: DS.radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    ...glowShadow("rgba(124,58,237,0.32)", 26),
  },
  creditBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  creditBarText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.35,
    fontVariant: ["tabular-nums"],
  },
  creditBarAction: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 4,
    borderRadius: DS.radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: DS.radius.pill,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  heroCard: {
    ...surfaceCard(),
    ...glowShadow("rgba(255,255,255,0.02)", 22),
    paddingHorizontal: DS.spacing[3],
    paddingVertical: 28,
  },
  heroCopy: {
    gap: DS.spacing[1.5],
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.display,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  description: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 560,
  },
});
