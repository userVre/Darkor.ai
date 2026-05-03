import {useEffect} from "react";
import {StyleSheet, TextStyle, type StyleProp} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type AnimatedArrowProps = {
  style?: StyleProp<TextStyle>;
};

export function NeonArrowDown({style}: AnimatedArrowProps) {
  const colorProgress = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    colorProgress.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      false,
    );
    bounceY.value = withRepeat(
      withSequence(
        withTiming(5, {
          duration: 760,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(0, {
          duration: 760,
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
      -1,
      false,
    );
    glowProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(colorProgress);
      cancelAnimation(bounceY);
      cancelAnimation(glowProgress);
    };
  }, [bounceY, colorProgress, glowProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const glowRadius = interpolate(glowProgress.value, [0, 1], [4, 12]);

    return {
      color: interpolateColor(
        colorProgress.value,
        [0, 0.34, 0.68, 1],
        ["#FFFFFF", "#00B4FF", "#0066FF", "#FFFFFF"],
      ),
      shadowColor: "#00B4FF",
      shadowOpacity: 0.9,
      shadowRadius: glowRadius,
      textShadowColor: "#00B4FF",
      textShadowOffset: {width: 0, height: 0},
      textShadowRadius: glowRadius,
      transform: [
        {translateY: bounceY.value},
      ],
    };
  });

  return (
    <Animated.Text style={[styles.arrow, style, animatedStyle]}>
      {String.fromCharCode(8595)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: "#FFFFFF",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
