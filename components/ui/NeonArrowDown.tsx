import {ArrowDown, type LucideProps} from "lucide-react-native";
import {useEffect} from "react";
import {StyleSheet, type StyleProp, type ViewStyle} from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const NEON_BLUE = "#00B4FF";
const NEON_BLUE_LIGHT = "#7DE7FF";

const AnimatedArrowDown = Animated.createAnimatedComponent(ArrowDown);

type NeonArrowDownProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function NeonArrowDown({size = 34, style}: NeonArrowDownProps) {
  const bounce = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withTiming(1, {duration: 620, easing: Easing.inOut(Easing.cubic)}),
      -1,
      true,
    );

    glow.value = withRepeat(
      withTiming(1, {duration: 860, easing: Easing.inOut(Easing.cubic)}),
      -1,
      true,
    );
  }, [bounce, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + glow.value * 0.1,
    shadowColor: NEON_BLUE,
    shadowOpacity: 0.4 + glow.value * 0.6,
    shadowRadius: 4 + glow.value * 11,
    transform: [
      {translateY: bounce.value * 10},
      {scale: 0.96 + glow.value * 0.05},
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + glow.value * 0.28,
    transform: [{scale: 0.82 + glow.value * 0.28}],
  }));

  const animatedProps = useAnimatedProps<Partial<LucideProps>>(() => ({
    color: interpolateColor(glow.value, [0, 1], [NEON_BLUE, NEON_BLUE_LIGHT]),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.container, style, animatedStyle]}
    >
      <Animated.View style={[styles.halo, haloStyle]} />
      <AnimatedArrowDown animatedProps={animatedProps} size={size} strokeWidth={3.4} />
    </Animated.View>
  );
}

export default NeonArrowDown;

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NEON_BLUE,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 12,
  },
  halo: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,180,255,0.22)",
  },
});
