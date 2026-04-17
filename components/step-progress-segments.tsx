import { memo } from "react";
import { I18nManager, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { DS } from "../lib/design-system";

type StepProgressSegmentsProps = {
  step: number;
  totalSteps: number;
  style?: StyleProp<ViewStyle>;
};

export const StepProgressSegments = memo(function StepProgressSegments({
  step,
  totalSteps,
  style,
}: StepProgressSegmentsProps) {
  const safeTotalSteps = Math.max(totalSteps, 1);
  const safeStep = Math.max(1, Math.min(step, safeTotalSteps));

  return (
    <View
      accessibilityLabel={`Step ${safeStep} of ${safeTotalSteps}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: safeTotalSteps, now: safeStep }}
      style={[styles.row, I18nManager.isRTL ? styles.rowRtl : null, style]}
    >
      {Array.from({ length: safeTotalSteps }).map((_, index) => {
        const active = index < safeStep;
        return <View key={`segment-${index + 1}`} style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]} />;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: "#2563EB",
  },
  segmentInactive: {
    backgroundColor: DS.colors.border,
  },
});
