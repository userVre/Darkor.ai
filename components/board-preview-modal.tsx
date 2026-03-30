import { Image } from "expo-image";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import type { BoardItem } from "../lib/board";
import { fonts } from "../styles/typography";

type BoardPreviewModalProps = {
  item: BoardItem | null;
  visible: boolean;
  onClose: () => void;
};

export function BoardPreviewModal({ item, visible, onClose }: BoardPreviewModalProps) {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panGesture = Gesture.Pan()
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
            <Image source={{ uri: item.imageUri }} style={styles.image} contentFit="contain" transition={120} />
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
