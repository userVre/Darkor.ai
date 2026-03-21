import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";

type GlassBackdropProps = BottomSheetBackdropProps & { onPress?: () => void };

export function GlassBackdrop({ animatedIndex, style, onPress }: GlassBackdropProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [-1, 0], [0, 1]);
    return { opacity };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, styles.container, animatedStyle, style]}
    >
      <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
