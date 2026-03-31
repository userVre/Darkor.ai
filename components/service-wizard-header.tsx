import { type ReactNode, useCallback, useMemo } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, X as Close } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Theme, useTheme } from "@/styles/theme";

import { DS, HAIRLINE, glowShadow } from "../lib/design-system";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { LuxPressable } from "./lux-pressable";

type ServiceWizardHeaderProps = {
  title: string;
  step: number;
  totalSteps?: number;
  canGoBack?: boolean;
  leftAccessory?: ReactNode;
  onBack?: () => void;
  onClose: () => void;
};

export function ServiceWizardHeader({
  title,
  step,
  totalSteps = 4,
  canGoBack = false,
  leftAccessory,
  onBack,
  onClose,
}: ServiceWizardHeaderProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showBack = safeStep > 1 && canGoBack && Boolean(onBack);
  const topInset = process.env.EXPO_OS === "android" ? Math.max(insets.top, 44) : Math.max(insets.top, 20);
  const handleExitPress = useCallback(() => {
    Alert.alert("Exit?", "Your progress will be lost.", [
      { text: "CANCEL", style: "cancel" },
      { text: "EXIT", style: "destructive", onPress: onClose },
    ]);
  }, [onClose]);

  return (
    <View style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.sideSlot}>
          {leftAccessory ? (
            leftAccessory
          ) : showBack ? (
            <LuxPressable
              onPress={handleExitPress}
              pressableClassName="cursor-pointer"
              className="cursor-pointer"
              style={styles.iconButton}
              glowColor={colors.brand}
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
                />
              );
            })}
          </View>
        </View>

        <View style={styles.sideSlot}>
          <LuxPressable
            onPress={handleExitPress}
            pressableClassName="cursor-pointer"
            className="cursor-pointer"
            style={styles.iconButton}
            glowColor={colors.brand}
            scale={0.96}
          >
            <Close color={SERVICE_WIZARD_THEME.colors.textPrimary} size={18} strokeWidth={2.2} />
          </LuxPressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  safeArea: {
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: DS.spacing[3],
    paddingTop: DS.spacing[1.5],
    paddingBottom: DS.spacing[2.5],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: DS.spacing[2],
    backgroundColor: colors.bg,
  },
  sideSlot: {
    minWidth: 56,
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
    backgroundColor: colors.surface,
    ...glowShadow(colors.border, 16),
  },
  sidePlaceholder: {
    height: 44,
    width: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    gap: DS.spacing[1.5],
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
    maxWidth: 304,
    flexDirection: "row",
    gap: DS.spacing[1.5],
  },
  progressSegment: {
    flex: 1,
    height: 10,
    borderRadius: DS.radius.pill,
    overflow: "hidden",
    backgroundColor: colors.surfaceHigh,
    borderWidth: HAIRLINE,
    borderColor: colors.borderLight,
  },
  progressSegmentComplete: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textSecondary,
  },
  progressSegmentActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    ...glowShadow(colors.brand, 18),
  },
  });
}
