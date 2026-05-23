import {memo} from "react";
import {I18nManager, StyleSheet, View, type StyleProp, type ViewStyle} from "react-native";
import {ProgressBar, useTheme as usePaperTheme} from "react-native-paper";

import {md3Spacing} from "../constants/md3Theme";

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
  const paperTheme = usePaperTheme();
  const safeTotalSteps = Math.max(totalSteps, 1);
  const safeStep = Math.max(1, Math.min(step, safeTotalSteps));
  const continuousProgress = Math.max(0, Math.min(progress ?? safeStep / safeTotalSteps, 1));

  if (variant === "continuous") {
    return (
      <ProgressBar
        accessibilityLabel={`Progress ${Math.round(continuousProgress * 100)} percent`}
        accessibilityValue={{min: 0, max: 100, now: Math.round(continuousProgress * 100)}}
        color={paperTheme.colors.primary}
        progress={continuousProgress}
        style={[styles.linear, style, {backgroundColor: paperTheme.colors.surfaceVariant}]}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`Step ${safeStep} of ${safeTotalSteps}`}
      accessibilityRole="progressbar"
      accessibilityValue={{min: 1, max: safeTotalSteps, now: safeStep}}
      style={[styles.row, I18nManager.isRTL ? styles.rowRtl : null, style]}
    >
      {Array.from({length: safeTotalSteps}).map((_, index) => {
        const active = index < safeStep;
        return (
          <ProgressBar
            key={`segment-${index + 1}`}
            color={paperTheme.colors.primary}
            progress={active ? 1 : 0}
            style={[styles.segment, {backgroundColor: paperTheme.colors.surfaceVariant}]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: md3Spacing.small,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  linear: {
    width: "100%",
    height: 4,
    borderRadius: 999,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
});
