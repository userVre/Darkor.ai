import type { PropsWithChildren } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { StyleProp, ViewStyle } from "react-native";

type ScrollRevealProps = PropsWithChildren<{
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  offset?: number;
}>;

export default function ScrollReveal({ children, scrollY, style, offset = 0.0 }: ScrollRevealProps) {
  const { height } = useWindowDimensions();
  const layoutY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const start = layoutY.value - height * (0.85 + offset);
    const end = layoutY.value - height * (0.55 + offset);
    const progress = interpolate(scrollY.value, [start, end], [0, 1], Extrapolate.CLAMP);

    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 18 }, { scale: 0.98 + progress * 0.02 }],
    };
  }, [height, offset]);

  return (
    <Animated.View
      onLayout={(event) => {
        layoutY.value = event.nativeEvent.layout.y;
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}
