import {X} from "@/components/material-icons";
import {Image} from "expo-image";
import {Modal, Pressable, StyleSheet, Text, View} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withSpring} from "react-native-reanimated";

import type {BoardItem} from "../lib/board";
import {fonts} from "../styles/typography";
import {BeforeAfterSlider} from "./before-after-slider";

type BoardPreviewModalProps = {
  item: BoardItem | null;
  visible: boolean;
  onClose: () => void;
};

export function BoardPreviewModal({ item, visible, onClose }: BoardPreviewModalProps) {
  const translateY = useSharedValue(0);
  const sliderX = useSharedValue(0);
  const sliderWidth = useSharedValue(0);
  const afterImageUri = item?.imageUri ?? undefined;
  const beforeImageUri = item?.originalImageUri ?? undefined;
  const previewImageUri = afterImageUri ?? beforeImageUri;
  const hasComparison = Boolean(beforeImageUri && afterImageUri);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetY([12, 12])
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) {
        translateY.value = 0;
        runOnJS(onClose)();
        return;
      }

      translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  if (!item) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent>
      <View style={styles.overlay}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.content, animatedStyle]}>
            {hasComparison && item.originalImageUri ? (
              // FIXED: before/after order corrected
              <BeforeAfterSlider
                afterSource={{ uri: afterImageUri }}
                beforeSource={{ uri: beforeImageUri }}
                contentFit="cover"
                sliderWidth={sliderWidth}
                sliderX={sliderX}
                style={styles.image}
              />
            ) : previewImageUri ? <Image source={{ uri: previewImageUri }} style={styles.image} contentFit="cover" transition={120} /> : <View style={styles.image} />}
          </Animated.View>
        </GestureDetector>

        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <X color="#FFFFFF" size={24} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.bottomBar}>
          <Text style={styles.styleName}>{item.styleName}</Text>
          <Text style={styles.roomType}>{item.roomType}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 24,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: "rgba(10,10,10,0.88)",
  },
  styleName: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  roomType: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.regular,
  },
});

