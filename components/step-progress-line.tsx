import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type StepProgressLineProps = {
  progress: number;
  style?: StyleProp<ViewStyle>;
  trackColor?: string;
  fillColor?: string;
};

const MIN_VISIBLE_FILL = 18;
const SHIMMER_WIDTH = 72;

export function StepProgressLine({
  progress,
  style,
  trackColor = "#E8EBEF",
  fillColor = "#0A0A0A",
}: StepProgressLineProps) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const progressValue = useRef(new Animated.Value(clampedProgress)).current;
  const shimmerValue = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: clampedProgress,
      duration: 360,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, progressValue]);

  useEffect(() => {
    if (!trackWidth) {
      return;
    }

    shimmerValue.setValue(0);
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    );

    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, [shimmerValue, trackWidth]);

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

  const shimmerTranslateX = useMemo(
    () =>
      trackWidth
        ? shimmerValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-SHIMMER_WIDTH, trackWidth],
          })
        : 0,
    [shimmerValue, trackWidth],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[styles.track, { backgroundColor: trackColor }, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            width: fillWidth,
          },
        ]}
      >
        {trackWidth ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />
        ) : null}
      </Animated.View>
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
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: -3,
    bottom: -3,
    width: SHIMMER_WIDTH,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
});
