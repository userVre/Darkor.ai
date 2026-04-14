import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

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
  trackColor = "#E8EBEF",
  fillColor = "#0A0A0A",
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
    <View
      onLayout={handleLayout}
      style={[styles.track, { backgroundColor: trackColor }, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: fillWidth,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.fill,
          { width: fillWidth },
        ]}
      >
        <LinearGradient
          colors={["#FF776D", fillColor, "#FFB0AA"]}
          locations={[0, 0.62, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
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
  glow: {
    position: "absolute",
    top: -3,
    bottom: -3,
    left: 0,
    borderRadius: 999,
    backgroundColor: "rgba(204,51,51,0.18)",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
