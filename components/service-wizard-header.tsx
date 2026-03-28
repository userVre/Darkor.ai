import { useCallback } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, X as Close } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DS, HAIRLINE, glowShadow } from "../lib/design-system";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { LuxPressable } from "./lux-pressable";

type ServiceWizardHeaderProps = {
  title: string;
  step: number;
  totalSteps?: number;
  canGoBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
};

export function ServiceWizardHeader({
  title,
  step,
  totalSteps = 4,
  canGoBack = false,
  onBack,
  onClose,
}: ServiceWizardHeaderProps) {
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showBack = safeStep > 1 && canGoBack && Boolean(onBack);
  const handleClosePress = useCallback(() => {
    Alert.alert("Leave wizard?", "Are you sure? Your progress will be lost.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: onClose },
    ]);
  }, [onClose]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.sideSlot}>
          {showBack ? (
            <LuxPressable
              onPress={onBack}
              pressableClassName="cursor-pointer"
              className="cursor-pointer"
              style={styles.iconButton}
              glowColor="rgba(217,70,239,0.3)"
              scale={0.96}
            >
              <ArrowLeft color={SERVICE_WIZARD_THEME.colors.textPrimary} size={18} strokeWidth={2.2} />
            </LuxPressable>
          ) : (
            <View style={styles.sidePlaceholder} />
          )}
        </View>

        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{`Step ${safeStep}/${totalSteps}`}</Text>

          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, index) => {
              const isActive = index + 1 === safeStep;
              const isComplete = index < safeStep - 1;
              return (
                <View
                  key={`wizard-progress-${index}`}
                  style={[
                    styles.progressSegment,
                    isComplete ? styles.progressSegmentComplete : null,
                    isActive ? styles.progressSegmentActive : null,
                  ]}
                >
                  {isComplete ? <View style={[styles.progressFill, styles.progressFillComplete]} /> : null}
                  {isActive ? (
                    <LinearGradient
                      colors={["#FF6BF2", "#D946EF", "#7C3AED"]}
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

        <View style={styles.sideSlot}>
          <LuxPressable
            onPress={handleClosePress}
            pressableClassName="cursor-pointer"
            className="cursor-pointer"
            style={styles.iconButton}
            glowColor="rgba(217,70,239,0.3)"
            scale={0.96}
          >
            <Close color={SERVICE_WIZARD_THEME.colors.textPrimary} size={18} strokeWidth={2.2} />
          </LuxPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: DS.colors.background,
  },
  container: {
    paddingHorizontal: DS.spacing[3],
    paddingTop: DS.spacing[1.5],
    paddingBottom: DS.spacing[2.5],
    flexDirection: "row",
    alignItems: "center",
    gap: DS.spacing[2],
    backgroundColor: DS.colors.background,
  },
  sideSlot: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: DS.radius.pill,
    borderWidth: HAIRLINE,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: DS.colors.surface,
    ...glowShadow("rgba(255,255,255,0.03)", 16),
  },
  sidePlaceholder: {
    height: 44,
    width: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: DS.spacing[1.5],
  },
  title: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.headerTitle,
    textAlign: "center",
  },
  subtitle: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.headerSubtitle,
    textAlign: "center",
  },
  progressRow: {
    width: "100%",
    maxWidth: 304,
    flexDirection: "row",
    gap: DS.spacing[1.5],
  },
  progressSegment: {
    flex: 1,
    height: 10,
    borderRadius: DS.radius.pill,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.2)",
  },
  progressSegmentComplete: {
    borderColor: "rgba(255,255,255,0.38)",
  },
  progressSegmentActive: {
    height: 12,
    borderColor: "rgba(255,107,242,0.7)",
    ...glowShadow("rgba(217,70,239,0.36)", 20),
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 999,
  },
  progressFillComplete: {
    backgroundColor: "rgba(255,255,255,1)",
  },
});
