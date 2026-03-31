import { Image, type ImageSource } from "expo-image";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { memo, type ReactNode, type Ref, useCallback } from "react";
import {
  type ImageStyle,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";

const HANDLE_TOUCH_WIDTH = 56;
const SLIDER_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 0.8,
} as const;

type BeforeAfterSliderProps = {
  afterLabel?: string;
  afterSource: ImageSource | string;
  beforeLabel?: string;
  beforeSource: ImageSource | string;
  children?: ReactNode;
  containerRef?: Ref<View>;
  contentFit?: "contain" | "cover";
  imageStyle?: StyleProp<ImageStyle>;
  onInteractionStart?: () => void;
  sliderWidth: SharedValue<number>;
  sliderX: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

export const BeforeAfterSlider = memo(function BeforeAfterSlider({
  afterLabel = "After",
  afterSource,
  beforeLabel = "Before",
  beforeSource,
  children,
  containerRef,
  contentFit = "cover",
  imageStyle,
  onInteractionStart,
  sliderWidth,
  sliderX,
  style,
}: BeforeAfterSliderProps) {
  const sliderStart = useSharedValue(0);

  const notifyInteractionStart = useCallback(() => {
    onInteractionStart?.();
  }, [onInteractionStart]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (!width) {
        return;
      }

      const previousWidth = sliderWidth.value;
      sliderWidth.value = width;

      if (!previousWidth || Math.abs(previousWidth - width) > 1 || sliderX.value > width) {
        sliderX.value = withSpring(width / 2, SLIDER_SPRING);
      }
    },
    [sliderWidth, sliderX],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      sliderStart.value = sliderX.value;
      if (onInteractionStart) {
        runOnJS(notifyInteractionStart)();
      }
    })
    .onUpdate((event) => {
      const max = sliderWidth.value || 1;
      const next = sliderStart.value + event.translationX;
      sliderX.value = Math.max(0, Math.min(next, max));
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }

      const width = sliderWidth.value;
      if (!width) {
        return;
      }

      sliderX.value = withSpring(width / 2, SLIDER_SPRING);
      runOnJS(triggerHaptic)();
      if (onInteractionStart) {
        runOnJS(notifyInteractionStart)();
      }
    });

  const gesture = Gesture.Simultaneous(panGesture, doubleTapGesture);

  const afterImageStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - HANDLE_TOUCH_WIDTH / 2 }],
  }));

  const beforeLabelStyle = useAnimatedStyle(() => {
    const width = sliderWidth.value || 1;
    return {
      opacity: interpolate(sliderX.value, [0, width * 0.12, width * 0.22], [0, 0.3, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(sliderX.value, [0, width * 0.2], [-10, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const afterLabelStyle = useAnimatedStyle(() => {
    const width = sliderWidth.value || 1;
    return {
      opacity: interpolate(
        sliderX.value,
        [width * 0.78, width * 0.88, width],
        [1, 0.3, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            sliderX.value,
            [width * 0.8, width],
            [0, 10],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View ref={containerRef} collapsable={false} onLayout={handleLayout} style={[styles.container, style]}>
        <Image
          cachePolicy="memory-disk"
          contentFit={contentFit}
          source={beforeSource}
          style={[styles.image, imageStyle]}
          transition={120}
        />

        <Animated.View style={[styles.afterClip, afterImageStyle]}>
          <Image
            cachePolicy="memory-disk"
            contentFit={contentFit}
            source={afterSource}
            style={[styles.image, imageStyle]}
            transition={120}
          />
        </Animated.View>

        {children}

        <Animated.View pointerEvents="none" style={[styles.labelPill, styles.beforeLabel, beforeLabelStyle]}>
          <Text style={styles.labelText}>{beforeLabel}</Text>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.labelPill, styles.afterLabel, afterLabelStyle]}>
          <Text style={styles.labelText}>{afterLabel}</Text>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.handleWrap, handleStyle]}>
          <View style={styles.handleLine} />
          <View style={styles.handleCircle}>
            <ChevronLeft color="#FFFFFF" size={16} strokeWidth={2.8} />
            <ChevronRight color="#FFFFFF" size={16} strokeWidth={2.8} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  afterClip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  labelPill: {
    position: "absolute",
    bottom: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  beforeLabel: {
    left: 16,
  },
  afterLabel: {
    right: 16,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  handleWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: HANDLE_TOUCH_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  handleLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  handleCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(9,9,11,0.72)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 1,
    boxShadow: "0px 14px 32px rgba(0, 0, 0, 0.28)",
  },
});
