import { Image, type ImageSource } from "expo-image";
import * as Haptics from "expo-haptics";
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

const HANDLE_TOUCH_WIDTH = 72;
const HANDLE_PILL_WIDTH = 28;
const HANDLE_PILL_HEIGHT = 104;
const LABEL_EDGE_INSET = 18;
const LABEL_FADE_DISTANCE = 96;
const CENTER_HIT_THRESHOLD = 10;
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
  const hasEnteredCenterZone = useSharedValue(false);

  const notifyInteractionStart = useCallback(() => {
    onInteractionStart?.();
  }, [onInteractionStart]);

  const notifyCenterHit = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

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
        hasEnteredCenterZone.value = true;
      }
    },
    [hasEnteredCenterZone, sliderWidth, sliderX],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      sliderStart.value = sliderX.value;
      const width = sliderWidth.value || 1;
      hasEnteredCenterZone.value = Math.abs(sliderX.value - width / 2) <= CENTER_HIT_THRESHOLD;
      if (onInteractionStart) {
        runOnJS(notifyInteractionStart)();
      }
    })
    .onUpdate((event) => {
      const max = sliderWidth.value || 1;
      const next = sliderStart.value + event.translationX;
      const clamped = Math.max(0, Math.min(next, max));
      const isNearCenter = Math.abs(clamped - max / 2) <= CENTER_HIT_THRESHOLD;

      if (isNearCenter && !hasEnteredCenterZone.value) {
        hasEnteredCenterZone.value = true;
        runOnJS(notifyCenterHit)();
      } else if (!isNearCenter && hasEnteredCenterZone.value) {
        hasEnteredCenterZone.value = false;
      }

      sliderX.value = clamped;
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
      hasEnteredCenterZone.value = true;
      runOnJS(notifyCenterHit)();
      if (onInteractionStart) {
        runOnJS(notifyInteractionStart)();
      }
    });

  const gesture = Gesture.Simultaneous(panGesture, doubleTapGesture);

  const afterViewportStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value }],
  }));

  const afterImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -sliderX.value }],
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - HANDLE_TOUCH_WIDTH / 2 }],
  }));

  const beforeLabelStyle = useAnimatedStyle(() => {
    const proximity = interpolate(sliderX.value, [0, LABEL_FADE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: proximity,
      transform: [
        {
          translateY: interpolate(proximity, [0, 1], [8, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const afterLabelStyle = useAnimatedStyle(() => {
    const width = sliderWidth.value || 1;
    const distanceFromRight = width - sliderX.value;
    const proximity = interpolate(distanceFromRight, [0, LABEL_FADE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: proximity,
      transform: [
        {
          translateY: interpolate(proximity, [0, 1], [8, 0], Extrapolation.CLAMP),
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

        <Animated.View style={[styles.afterViewport, afterViewportStyle]}>
          <Image
            cachePolicy="memory-disk"
            contentFit={contentFit}
            source={afterSource}
            style={[styles.image, styles.afterImage, imageStyle, afterImageStyle]}
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
          <View style={styles.handleDividerCluster}>
            <View style={styles.handleDivider} />
            <View style={styles.handleDivider} />
          </View>
          <View style={styles.handlePill}>
            <View style={styles.handleGrip} />
            <View style={styles.handleGrip} />
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
  afterViewport: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  afterImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  labelPill: {
    position: "absolute",
    top: 18,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(12,12,14,0.48)",
    paddingHorizontal: 13,
    paddingVertical: 8,
    boxShadow: "0px 10px 24px rgba(0, 0, 0, 0.18)",
  },
  beforeLabel: {
    left: LABEL_EDGE_INSET,
  },
  afterLabel: {
    right: LABEL_EDGE_INSET,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
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
  handleDividerCluster: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 6,
  },
  handleDivider: {
    width: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  handlePill: {
    width: HANDLE_PILL_WIDTH,
    height: HANDLE_PILL_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(18,18,18,0.64)",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    boxShadow: "0px 18px 38px rgba(0, 0, 0, 0.3)",
  },
  handleGrip: {
    width: 3,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
});

