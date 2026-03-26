import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle } from "react-native-reanimated";

type GlassBackdropProps = BottomSheetBackdropProps & { onPress?: () => void };

export function GlassBackdrop({ animatedIndex, style, onPress }: GlassBackdropProps) {
  const [isInteractive, setIsInteractive] = useState(false);

  useAnimatedReaction(
    () => animatedIndex.value >= 0,
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setIsInteractive)(next);
      }
    },
    [animatedIndex],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [-1, 0], [0, 1]);
    return { opacity };
  });

  return (
    <Animated.View
      pointerEvents={isInteractive ? "auto" : "none"}
      style={[StyleSheet.absoluteFillObject, styles.container, animatedStyle, style]}
    >
      <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
      <Pressable style={[StyleSheet.absoluteFillObject, { cursor: "pointer" as any }]} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
