import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type InteriorRedesignStepProgressProps = {
  currentStep: number;
  totalSteps?: number;
  segmentWidth: number;
  gap: number;
  style?: StyleProp<ViewStyle>;
};

const FILLED_SEGMENT_COLOR = "#0A0A0A";
const UNFILLED_SEGMENT_COLOR = "#E0E0E0";

export function InteriorRedesignStepProgress({
  currentStep,
  totalSteps = 4,
  segmentWidth,
  gap,
  style,
}: InteriorRedesignStepProgressProps) {
  const safeStep = Math.max(1, Math.min(currentStep, totalSteps));

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={`interior-step-progress-${index}`}
          style={[
            styles.segment,
            {
              width: segmentWidth,
              marginRight: index === totalSteps - 1 ? 0 : gap,
              backgroundColor: index < safeStep ? FILLED_SEGMENT_COLOR : UNFILLED_SEGMENT_COLOR,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    zIndex: 3,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  segment: {
    height: 4,
    borderRadius: 2,
  },
});
