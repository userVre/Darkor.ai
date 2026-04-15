import { memo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

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
      style={[styles.row, style]}
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
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: DS.colors.accent,
  },
  segmentInactive: {
    backgroundColor: DS.colors.border,
  },
});
