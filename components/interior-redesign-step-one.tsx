import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Camera, Gem, Image as GalleryIcon, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { HomeToolsBottomNav } from "./home-tools-bottom-nav";

export type InteriorRedesignStepOneExamplePhoto = {
  id: string;
  label: string;
  source: number;
};

type InteriorRedesignStepOneProps = {
  creditCount: number;
  photoUri: string | null;
  examplePhotos: InteriorRedesignStepOneExamplePhoto[];
  loadingExampleId?: string | null;
  onTakePhoto: () => Promise<boolean>;
  onChooseFromGallery: () => Promise<boolean>;
  onRemovePhoto: () => void;
  onSelectExample: (example: InteriorRedesignStepOneExamplePhoto) => void;
  onContinue: () => void;
  onExit: () => void;
};

type MediaSourceOption = "camera" | "gallery";

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const SHEET_HEIGHT = 336;
const SWIPE_DISMISS_DISTANCE = 84;
const SWIPE_DISMISS_VELOCITY = 900;
const ACTIVE_CONTINUE_COLOR = "#FF3B30";

function scaleValue(value: number, scale: number) {
  return value * scale;
}

export function InteriorRedesignStepOne({
  creditCount,
  photoUri,
  examplePhotos,
  loadingExampleId,
  onTakePhoto,
  onChooseFromGallery,
  onRemovePhoto,
  onSelectExample,
  onContinue,
  onExit,
}: InteriorRedesignStepOneProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const topBadgeTop = scaleValue(36, layoutScale);
  const topTitleTop = scaleValue(52, layoutScale);
  const progressTop = scaleValue(74, layoutScale);
  const contentTop = scaleValue(82, layoutScale);
  const uploadTopSpacing = scaleValue(16, layoutScale);
  const containerSize = mainWidth;
  const innerScale = containerSize / 416;
  const thumbnailSize = scaleValue(124, layoutScale);
  const continueBottom = 64 + scaleValue(24, layoutScale);
  const canContinue = Boolean(photoUri);
  const progressSegmentWidth = scaleValue(92, layoutScale);
  const progressGap = scaleValue(16, layoutScale);
  const removeOffset = scaleValue(20, innerScale);

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

  const handleToolsPress = () => {
    triggerHaptic();
    router.navigate("/");
  };

  const handleCreatePress = () => {
    triggerHaptic();
    router.navigate("/workspace");
  };

  const handleDiscoverPress = () => {
    triggerHaptic();
    router.navigate("/gallery");
  };

  const handleProfilePress = () => {
    triggerHaptic();
    router.push("/profile");
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.creditBadge, { top: topBadgeTop, left: sideInset }]}>
        <Gem color="#FFFFFF" size={13} strokeWidth={2.1} />
        <Text style={styles.creditText}>{creditCount}</Text>
      </View>

      <Text style={[styles.stepText, { top: topTitleTop }]}>Step 1 / 4</Text>

      <Pressable
        accessibilityRole="button"
        onPress={handleExitPress}
        style={[styles.closeButton, { top: topTitleTop, right: scaleValue(36, layoutScale) }]}
      >
        <Text style={styles.closeText}>{"\u00D7"}</Text>
      </Pressable>

      <View style={[styles.progressRow, { top: progressTop, width: mainWidth, right: sideInset }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`interior-progress-${index}`}
            style={[
              styles.progressSegment,
              {
                width: progressSegmentWidth,
                marginRight: index === 3 ? 0 : progressGap,
                backgroundColor: index === 0 ? "#0A0A0A" : "#E0E0E0",
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.content, { paddingTop: contentTop }]}>
        <Text style={[styles.header, { marginLeft: sideInset }]}>Add a Photo</Text>

        <View
          style={[
            styles.uploadContainer,
            photoUri ? styles.uploadContainerSelected : null,
            {
              width: containerSize,
              height: containerSize,
              marginTop: uploadTopSpacing,
            },
          ]}
        >
          {photoUri ? (
            <>
              <Image
                source={{ uri: photoUri }}
                style={styles.selectedPhoto}
                contentFit="cover"
                transition={120}
                cachePolicy="memory-disk"
              />
              <Pressable
                accessibilityRole="button"
                onPress={onRemovePhoto}
                style={[styles.removeButton, { top: removeOffset, right: removeOffset }]}
              >
                <Text style={styles.removeButtonText}>{"\u00D7"}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.emptyTitle, { marginTop: scaleValue(148, innerScale) }]}>Start Redesigning</Text>
              <Text style={[styles.emptySubtitle, { marginTop: scaleValue(24, innerScale) }]}>
                Redesign and beautify your room
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openMediaSheet}
                style={[
                  styles.addPhotoButton,
                  {
                    left: scaleValue(124, innerScale),
                    right: scaleValue(124, innerScale),
                    bottom: scaleValue(144, innerScale),
                    height: scaleValue(48, innerScale),
                    borderRadius: scaleValue(24, innerScale),
                  },
                ]}
              >
                <View
                  style={[
                    styles.addPhotoIconCircle,
                    {
                      width: scaleValue(16, innerScale),
                      height: scaleValue(16, innerScale),
                      borderRadius: scaleValue(8, innerScale),
                    },
                  ]}
                >
                  <Plus color="#0A0A0A" size={12} strokeWidth={2.6} />
                </View>
                <Text style={styles.addPhotoButtonText}>Add a Photo</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={[styles.examplesLabel, { marginTop: scaleValue(24, layoutScale), marginLeft: sideInset }]}>
          Example Photos
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: scaleValue(24, layoutScale) }}
          contentContainerStyle={{
            paddingLeft: scaleValue(16, layoutScale),
            paddingRight: sideInset,
          }}
        >
          {examplePhotos.slice(0, 3).map((example, index) => (
            <Pressable
              key={example.id}
              accessibilityRole="button"
              onPress={() => onSelectExample(example)}
              style={{
                width: thumbnailSize,
                height: thumbnailSize,
                marginRight: index === examplePhotos.slice(0, 3).length - 1 ? 0 : scaleValue(8, layoutScale),
              }}
            >
              <View style={styles.thumbnailFrame}>
                <Image source={example.source} style={styles.thumbnailImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
                {loadingExampleId === example.id ? <View style={styles.thumbnailOverlay} /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        onPress={onContinue}
        pointerEvents={canContinue ? "auto" : "none"}
        style={[
          styles.continueButton,
          {
            width: mainWidth,
            bottom: continueBottom,
            backgroundColor: canContinue ? ACTIVE_CONTINUE_COLOR : "#E8E8E8",
          },
        ]}
      >
        <Text style={[styles.continueText, { color: canContinue ? "#FFFFFF" : "#A0A0A0" }]}>Continue</Text>
      </Pressable>

      <View style={styles.bottomNavWrap}>
        <HomeToolsBottomNav
          activeTab="create"
          onToolsPress={handleToolsPress}
          onCreatePress={handleCreatePress}
          onDiscoverPress={handleDiscoverPress}
          onProfilePress={handleProfilePress}
        />
      </View>

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
  stepText: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 4,
    textAlign: "center",
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.semibold,
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
  progressRow: {
    position: "absolute",
    zIndex: 3,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 29,
    ...fonts.bold,
  },
  uploadContainer: {
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C0C0C0",
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  uploadContainerSelected: {
    borderWidth: 0,
    borderColor: "transparent",
    borderStyle: "solid",
    backgroundColor: "#FFFFFF",
  },
  selectedPhoto: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,10,10,0.92)",
  },
  removeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 16,
    ...fonts.bold,
  },
  emptyTitle: {
    textAlign: "center",
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  emptySubtitle: {
    textAlign: "center",
    color: "#808080",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.regular,
  },
  addPhotoButton: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A0A0A",
  },
  addPhotoIconCircle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  addPhotoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.semibold,
  },
  examplesLabel: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  thumbnailFrame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#F3F3F3",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.14)",
  },
  continueButton: {
    position: "absolute",
    left: 0,
    right: 0,
    alignSelf: "center",
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    ...fonts.medium,
  },
});
