import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, I18nManager, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { DS } from "../lib/design-system";

type StepProgressLineProps = {
  progress: number;
  style?: StyleProp<ViewStyle>;
  trackColor?: string;
  fillColor?: string;
};

const MIN_VISIBLE_FILL = 14;

export function StepProgressLine({
  progress,
  style,
  trackColor = DS.colors.border,
  fillColor = DS.colors.accent,
}: StepProgressLineProps) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const progressValue = useRef(new Animated.Value(clampedProgress)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: clampedProgress,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, progressValue]);

  const minimumFill = clampedProgress > 0 ? Math.min(MIN_VISIBLE_FILL, trackWidth) : 0;
  const fillWidth = useMemo(
    () =>
      trackWidth
        ? progressValue.interpolate({
            inputRange: [0, 1],
            outputRange: [minimumFill, trackWidth],
          })
        : 0,
    [minimumFill, progressValue, trackWidth],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View onLayout={handleLayout} style={[styles.track, { backgroundColor: trackColor }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            width: fillWidth,
            backgroundColor: fillColor,
            [I18nManager.isRTL ? "right" : "left"]: 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    height: "100%",
    borderRadius: 999,
  },
});
