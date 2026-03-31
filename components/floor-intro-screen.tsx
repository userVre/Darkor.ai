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

export type FloorIntroExamplePhoto = {
  id: string;
  label: string;
  source: ImageSourcePropType;
};

type FloorIntroScreenProps = {
  creditCount: number;
  examples: FloorIntroExamplePhoto[];
  onTakePhoto: () => Promise<boolean>;
  onChooseFromGallery: () => Promise<boolean>;
  onExamplePress: (example: FloorIntroExamplePhoto) => void;
  onExit: () => void;
};

type MediaSourceOption = "camera" | "gallery";

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const SHEET_HEIGHT = 336;
const SWIPE_DISMISS_DISTANCE = 84;
const SWIPE_DISMISS_VELOCITY = 900;
const HERO_IMAGE = require("../assets/media/discover/floor-scenes/polished-carrara-marble.jpg");

function scaleValue(value: number, scale: number) {
  return value * scale;
}

export function FloorIntroScreen({
  creditCount,
  examples,
  onTakePhoto,
  onChooseFromGallery,
  onExamplePress,
  onExit,
}: FloorIntroScreenProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const topBadgeTop = scaleValue(36, layoutScale);
  const topTitleTop = scaleValue(52, layoutScale);
  const heroTop = scaleValue(96, layoutScale);
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
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: () => {
          onExit();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.creditBadge, { top: topBadgeTop, left: sideInset }]}>
        <Diamond color="#FFFFFF" size={13} strokeWidth={2.1} />
        <Text style={styles.creditText}>{creditCount}</Text>
      </View>

      <Text style={[styles.headerTitle, { top: topTitleTop }]}>Floor Restyle</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close floor restyle flow"
        onPress={handleExitPress}
        style={[styles.closeButton, { top: topTitleTop, right: scaleValue(36, layoutScale) }]}
      >
        <Text style={styles.closeText}>{"\u00D7"}</Text>
      </Pressable>

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
    width: 20,
    height: 20,
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
    borderRadius: 22,
    backgroundColor: "#F3F3F3",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,15,0.32)",
  },
  mediaSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handleButton: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D5D5D5",
  },
  sheetCloseButton: {
    position: "absolute",
    top: 16,
    right: 18,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    color: "#0A0A0A",
    fontSize: 22,
    lineHeight: 22,
    ...fonts.bold,
  },
  sheetTitle: {
    marginTop: 20,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.bold,
  },
  mediaActionButton: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  galleryButton: {
    marginTop: 12,
  },
  mediaActionIcon: {
    marginRight: 14,
  },
  mediaActionText: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
});
