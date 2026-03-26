import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";

type ServiceWizardHeaderProps = {
  title: string;
  step: number;
  totalSteps?: number;
  topInset: number;
  leftAccessory: ReactNode;
  rightAccessory?: ReactNode;
};

export function ServiceWizardHeader({
  title,
  step,
  totalSteps = 4,
  topInset,
  leftAccessory,
  rightAccessory,
}: ServiceWizardHeaderProps) {
  const safeStep = Math.max(1, Math.min(step, totalSteps));

  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset + 8, 18) }]}>
      <View style={styles.sideSlot}>{leftAccessory}</View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{`Step ${safeStep} / ${totalSteps}`}</Text>

        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const isComplete = index < safeStep;
            return (
              <View key={`wizard-progress-${index}`} style={styles.progressSegment}>
                {isComplete ? (
                  <LinearGradient
                    colors={SERVICE_WIZARD_THEME.gradients.accent}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.progressFill}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sideSlot}>{rightAccessory ?? <View style={styles.sidePlaceholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sideSlot: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  sidePlaceholder: {
    height: 44,
    width: 44,
  },
  copy: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.headerTitle,
  },
  subtitle: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.headerSubtitle,
  },
  progressRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: SERVICE_WIZARD_THEME.colors.progressTrack,
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 999,
  },
});
