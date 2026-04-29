import {memo} from "react";
import {I18nManager, StyleSheet, View, type StyleProp, type ViewStyle} from "react-native";

import {DS} from "../lib/design-system";

type StepProgressSegmentsProps = {
  progress?: number;
  step: number;
  totalSteps: number;
  variant?: "segmented" | "continuous";
  style?: StyleProp<ViewStyle>;
};

export const StepProgressSegments = memo(function StepProgressSegments({
  progress,
  step,
  totalSteps,
  variant = "segmented",
  style,
}: StepProgressSegmentsProps) {
  const safeTotalSteps = Math.max(totalSteps, 1);
  const safeStep = Math.max(1, Math.min(step, safeTotalSteps));
  const continuousProgress = Math.max(0, Math.min(progress ?? safeStep / safeTotalSteps, 1));

  if (variant === "continuous") {
    return (
      <View
        accessibilityLabel={`Progress ${Math.round(continuousProgress * 100)} percent`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(continuousProgress * 100) }}
        style={[styles.continuousTrack, style]}
      >
        <View style={[styles.continuousFill, { width: `${continuousProgress * 100}%` }]} />
      </View>
    );
  }

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
  continuousTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: DS.colors.border,
  },
  continuousFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
});
