import * as Haptics from "expo-haptics";
import {Image, type ImageSource} from "expo-image";
import {memo, useCallback, type ReactNode, type Ref} from "react";
import {
StyleSheet,
Text,
View,
type ImageStyle,
type LayoutChangeEvent,
type StyleProp,
type ViewStyle,
} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, {
runOnJS,
useAnimatedStyle,
useSharedValue,
withSpring,
type SharedValue,
} from "react-native-reanimated";

import {triggerHaptic} from "../lib/haptics";
import {fonts} from "../styles/typography";

const HANDLE_TOUCH_WIDTH = 72;
const HANDLE_VISUAL_SIZE = 42;
const LABEL_EDGE_INSET = 18;
const CENTER_HIT_THRESHOLD = 10;
const SLIDER_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 0.8,
} as const;
const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

type BeforeAfterSliderProps = {
  afterLabel?: string;
  afterSource: ImageSource | string;
  beforeLabel?: string;
  beforeSource: ImageSource | string;
  children?: ReactNode;
  containerRef?: Ref<View>;
  contentFit?: "contain" | "cover";
  imageStyle?: StyleProp<ImageStyle>;
  onInteractionEnd?: () => void;
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
  onInteractionEnd,
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

  const notifyInteractionEnd = useCallback(() => {
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const notifyCenterHit = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
    .maxPointers(1)
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
    })
    .onFinalize(() => {
      if (onInteractionEnd) {
        runOnJS(notifyInteractionEnd)();
      }
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

  const afterMaskStyle = useAnimatedStyle(() => {
    const width = sliderWidth.value || 1;
    const left = Math.max(0, Math.min(sliderX.value, width));
    return {
      left,
      width: Math.max(width - left, 0),
    };
  });

  const afterImageAlignmentStyle = useAnimatedStyle(() => {
    const width = sliderWidth.value || 1;
    const left = Math.max(0, Math.min(sliderX.value, width));
    return {
      width,
      transform: [{ translateX: -left }],
    };
  });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - HANDLE_TOUCH_WIDTH / 2 }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View ref={containerRef} collapsable={false} onLayout={handleLayout} style={[styles.container, style]}>
        <View style={styles.imageStack}>
          <AnimatedExpoImage
            cachePolicy="memory-disk"
            contentFit={contentFit}
            source={beforeSource}
            style={[styles.baseImage, imageStyle]}
            transition={120}
          />

          <Animated.View pointerEvents="none" style={[styles.afterMask, afterMaskStyle]}>
            <AnimatedExpoImage
              cachePolicy="memory-disk"
              contentFit={contentFit}
              source={afterSource}
              style={[styles.afterImage, imageStyle, afterImageAlignmentStyle]}
              transition={120}
            />
          </Animated.View>
        </View>

        {children}

        {beforeLabel ? (
          <View pointerEvents="none" style={[styles.labelPill, styles.beforeLabel]}>
            <Text style={styles.labelText}>{beforeLabel}</Text>
          </View>
        ) : null}

        {afterLabel ? (
          <View pointerEvents="none" style={[styles.labelPill, styles.afterLabel]}>
            <Text style={styles.labelText}>{afterLabel}</Text>
          </View>
        ) : null}

        <Animated.View pointerEvents="none" style={[styles.handleWrap, handleStyle]}>
          <View style={styles.handleTrack}>
            <View style={styles.handleLine} />
          </View>

          <View style={styles.handleKnob}>
            <View style={styles.handleKnobGlyphRow}>
              <View style={styles.handleKnobGlyph} />
              <View style={styles.handleKnobGlyph} />
              <View style={styles.handleKnobGlyph} />
            </View>
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
  imageStack: {
    width: "100%",
    height: "100%",
  },
  baseImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  afterMask: {
    position: "absolute",
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  afterImage: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  labelPill: {
    position: "absolute",
    top: 14,
    zIndex: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(12,12,14,0.58)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.18)",
  },
  beforeLabel: {
    left: LABEL_EDGE_INSET,
  },
  afterLabel: {
    right: LABEL_EDGE_INSET,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontFamily: fonts.semibold.fontFamily,
    fontWeight: fonts.semibold.fontWeight,
  },
  handleWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 6,
    width: HANDLE_TOUCH_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  handleTrack: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  handleLine: {
    width: 3,
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    boxShadow: "0px 0px 16px rgba(0, 0, 0, 0.18)",
  },
  handleKnob: {
    width: HANDLE_VISUAL_SIZE,
    height: HANDLE_VISUAL_SIZE,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 12px 24px rgba(0, 0, 0, 0.22)",
  },
  handleKnobGlyphRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  handleKnobGlyph: {
    width: 2,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.78)",
  },
});

