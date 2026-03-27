import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, X as Close } from "lucide-react-native";

import { DS, HAIRLINE, glowShadow } from "../lib/design-system";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { LuxPressable } from "./lux-pressable";

type ServiceWizardHeaderProps = {
  title: string;
  step: number;
  totalSteps?: number;
  topInset: number;
  canGoBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
};

export function ServiceWizardHeader({
  title,
  step,
  totalSteps = 4,
  topInset,
  canGoBack = false,
  onBack,
  onClose,
}: ServiceWizardHeaderProps) {
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showBack = safeStep > 1 && canGoBack && Boolean(onBack);

  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset + DS.spacing[2], DS.spacing[3]) }]}>
      <View style={styles.sideSlot}>
        {showBack ? (
          <LuxPressable
            onPress={onBack}
            pressableClassName="cursor-pointer"
            className="cursor-pointer"
            style={styles.iconButton}
            glowColor={DS.colors.accentGlow}
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
            const isFilled = isComplete || isActive;
            return (
              <View
                key={`wizard-progress-${index}`}
                style={[
                  styles.progressSegment,
                  isActive ? styles.progressSegmentActive : null,
                ]}
              >
                {isFilled ? (
                  <LinearGradient
                    colors={SERVICE_WIZARD_THEME.gradients.accentButton}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[styles.progressFill, isActive ? null : styles.progressFillComplete]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sideSlot}>
        <LuxPressable
          onPress={onClose}
          pressableClassName="cursor-pointer"
          className="cursor-pointer"
          style={styles.iconButton}
          glowColor={DS.colors.accentGlow}
          scale={0.96}
        >
          <Close color={SERVICE_WIZARD_THEME.colors.textPrimary} size={18} strokeWidth={2.2} />
        </LuxPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: DS.spacing[3],
    paddingBottom: DS.spacing[2],
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
    gap: DS.spacing[1],
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
    maxWidth: 280,
    flexDirection: "row",
    gap: DS.spacing[1],
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: DS.radius.pill,
    overflow: "hidden",
    backgroundColor: SERVICE_WIZARD_THEME.colors.progressTrack,
    borderWidth: HAIRLINE,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
  },
  progressSegmentActive: {
    height: 8,
  },
  progressFill: {
    height: "100%",
    width: "100%",
    borderRadius: 999,
  },
  progressFillComplete: {
    opacity: 0.55,
  },
});
