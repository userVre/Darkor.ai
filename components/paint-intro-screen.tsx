import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Camera, Diamond, Image as GalleryIcon } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { StickyStepHeader, getStickyStepHeaderMetrics } from "./sticky-step-header";

export type PaintIntroExamplePhoto = {
  id: string;
  label: string;
  source: ImageSourcePropType;
};

type PaintIntroScreenProps = {
  creditCount: number;
  examples: PaintIntroExamplePhoto[];
  onTakePhoto: () => Promise<boolean>;
  onChooseFromGallery: () => Promise<boolean>;
  onExamplePress: (example: PaintIntroExamplePhoto) => void;
  onExit: () => void;
};

type MediaSourceOption = "camera" | "gallery";

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const SHEET_HEIGHT = 336;
const SWIPE_DISMISS_DISTANCE = 84;
const SWIPE_DISMISS_VELOCITY = 900;
const HERO_IMAGE = require("../assets/media/paywall/paywall-soft-lounge.png");

function scaleValue(value: number, scale: number) {
  return value * scale;
}

export function PaintIntroScreen({
  creditCount,
  examples,
  onTakePhoto,
  onChooseFromGallery,
  onExamplePress,
  onExit,
}: PaintIntroScreenProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getStickyStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const heroTop = headerMetrics.contentOffset;
  const heroHeight = scaleValue(584, layoutScale);
  const heroTextTop = scaleValue(424, layoutScale);
  const heroTextLeft = scaleValue(48, layoutScale);
  const heroButtonTop = scaleValue(504, layoutScale);
  const heroButtonLeft = scaleValue(126, layoutScale);
  const heroButtonHeight = scaleValue(48, layoutScale);
  const heroButtonRadius = scaleValue(24, layoutScale);
  const sectionTopGap = scaleValue(24, layoutScale);
  const examplesTitleLeft = scaleValue(20, layoutScale);
  const examplesRailLeft = scaleValue(28, layoutScale);
  const examplesRailGap = scaleValue(8, layoutScale);
  const exampleWidth = scaleValue(124, layoutScale);
  const exampleHeight = scaleValue(158, layoutScale);
  const examplesBottomPadding = Math.max(scaleValue(52, layoutScale), insets.bottom + scaleValue(20, layoutScale));

  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [pendingSource, setPendingSource] = useState<MediaSourceOption | null>(null);
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  const finishClose = useCallback(() => {
    setIsSheetMounted(false);
    setPendingSource(null);
  }, []);

  const animateSheetOpen = useCallback(() => {
    sheetTranslateY.value = withSpring(0, { duration: 300, dampingRatio: 0.92 });
    overlayOpacity.value = withTiming(1, { duration: 180 });
  }, [overlayOpacity, sheetTranslateY]);

  const closeMediaSheet = useCallback(() => {
    sheetTranslateY.value = withTiming(
      SHEET_HEIGHT,
      { duration: 250 },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
    overlayOpacity.value = withTiming(0, { duration: 220 });
  }, [finishClose, overlayOpacity, sheetTranslateY]);

  const openMediaSheet = useCallback(() => {
    if (pendingSource || isSheetMounted) {
      return;
    }

    triggerHaptic();
    setIsSheetMounted(true);
    requestAnimationFrame(() => {
      animateSheetOpen();
    });
  }, [animateSheetOpen, isSheetMounted, pendingSource]);

  const handleSelectSource = useCallback(
    async (source: MediaSourceOption) => {
      if (pendingSource) {
        return;
      }

      setPendingSource(source);
      const didSelectPhoto = source === "camera" ? await onTakePhoto() : await onChooseFromGallery();

      if (didSelectPhoto) {
        closeMediaSheet();
        return;
      }

      setPendingSource(null);
    },
    [closeMediaSheet, onChooseFromGallery, onTakePhoto, pendingSource],
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          const nextOffset = Math.max(0, event.translationY);
          sheetTranslateY.value = nextOffset;
          overlayOpacity.value = 1 - Math.min(nextOffset / SHEET_HEIGHT, 1);
        })
        .onEnd((event) => {
          if (event.translationY > SWIPE_DISMISS_DISTANCE || event.velocityY > SWIPE_DISMISS_VELOCITY) {
            overlayOpacity.value = withTiming(0, { duration: 220 });
            sheetTranslateY.value = withTiming(
              SHEET_HEIGHT,
              { duration: 250 },
              (finished) => {
                if (finished) {
                  runOnJS(finishClose)();
                }
              },
            );
            return;
          }

          sheetTranslateY.value = withSpring(0, { duration: 300, dampingRatio: 0.92 });
          overlayOpacity.value = withTiming(1, { duration: 180 });
        }),
    [finishClose, overlayOpacity, sheetTranslateY],
  );

  const handleExitPress = () => {
    triggerHaptic();
    Alert.alert("Exit?", "Your progress will be lost.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "EXIT",
        style: "destructive",
        onPress: () => {
          onExit();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <StickyStepHeader
        closeAccessibilityLabel="Close paint flow"
        creditCount={creditCount}
        horizontalInset={sideInset}
        onClose={handleExitPress}
        step={1}
        totalSteps={4}
      />

      <ScrollView
        style={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: heroTop,
          paddingBottom: examplesBottomPadding,
        }}
      >
        <View
          style={[
            styles.hero,
            {
              width: mainWidth,
              height: heroHeight,
            },
          ]}
        >
          <Image source={HERO_IMAGE} style={styles.heroImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
          <View style={styles.heroOverlay} />

          <Text style={[styles.heroText, { top: heroTextTop, left: heroTextLeft, right: scaleValue(32, layoutScale) }]}>
            Mark, recolor, and transform your space effortlessly.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={openMediaSheet}
            style={[
              styles.uploadButton,
              {
                top: heroButtonTop,
                left: heroButtonLeft,
                height: heroButtonHeight,
                borderRadius: heroButtonRadius,
                paddingHorizontal: scaleValue(48, layoutScale),
              },
            ]}
          >
            <Text style={styles.uploadButtonText}>Upload +</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: sectionTopGap }}>
          <Text style={[styles.examplesTitle, { marginLeft: examplesTitleLeft }]}>Example Photos</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: scaleValue(20, layoutScale) }}
            contentContainerStyle={{
              paddingLeft: examplesRailLeft,
              paddingRight: examplesRailLeft,
            }}
          >
            {examples.map((example, index) => (
              <Pressable
                key={example.id}
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic();
                  onExamplePress(example);
                }}
                style={{
                  width: exampleWidth,
                  height: exampleHeight,
                  marginRight: index === examples.length - 1 ? 0 : examplesRailGap,
                }}
              >
                <View style={styles.exampleCard}>
                  <Image source={example.source} style={styles.exampleImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {isSheetMounted ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.sheetOverlay, overlayAnimatedStyle]}>
            <Pressable accessibilityRole="button" onPress={closeMediaSheet} style={StyleSheet.absoluteFill} />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.mediaSheet, sheetAnimatedStyle]}>
              <Pressable accessibilityRole="button" onPress={closeMediaSheet} style={styles.handleButton}>
                <View style={styles.handleBar} />
              </Pressable>

              <Pressable accessibilityRole="button" onPress={closeMediaSheet} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>{"\u00D7"}</Text>
              </Pressable>

              <Text style={styles.sheetTitle}>Select Media Source</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSelectSource("camera");
                }}
                disabled={pendingSource !== null}
                style={styles.mediaActionButton}
              >
                <Camera color="#0A0A0A" size={24} strokeWidth={2.2} style={styles.mediaActionIcon} />
                <Text style={styles.mediaActionText}>Take photo from camera</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSelectSource("gallery");
                }}
                disabled={pendingSource !== null}
                style={[styles.mediaActionButton, styles.galleryButton]}
              >
                <GalleryIcon color="#0A0A0A" size={24} strokeWidth={2.2} style={styles.mediaActionIcon} />
                <Text style={styles.mediaActionText}>Choose from gallery</Text>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  creditBadge: {
    position: "absolute",
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  creditText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 4,
    textAlign: "center",
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  closeButton: {
    position: "absolute",
    zIndex: 4,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 18,
    ...fonts.bold,
  },
  hero: {
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#111111",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  heroText: {
    position: "absolute",
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 28,
    ...fonts.bold,
  },
  uploadButton: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  examplesTitle: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  exampleCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#F1F1F1",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mediaSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handleButton: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    height: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D0D0",
  },
  sheetCloseButton: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E8E8",
  },
  sheetCloseText: {
    color: "#0A0A0A",
    fontSize: 12,
    lineHeight: 12,
    ...fonts.bold,
  },
  sheetTitle: {
    position: "absolute",
    top: 64,
    left: 20,
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 22,
    ...fonts.bold,
  },
  mediaActionButton: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 114,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    flexDirection: "row",
    alignItems: "center",
  },
  galleryButton: {
    top: 228,
  },
  mediaActionIcon: {
    marginLeft: 32,
  },
  mediaActionText: {
    marginLeft: 16,
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
});
