import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";

import type { DiscoverTile } from "../lib/discover-catalog";

type DiscoverPreviewModalProps = {
  item: DiscoverTile | null;
  visible: boolean;
  topInset: number;
  onClose: () => void;
};

export function DiscoverPreviewModal({
  item,
  visible,
  topInset,
  onClose,
}: DiscoverPreviewModalProps) {
  if (!item) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

        <View style={[styles.topBar, { top: Math.max(topInset + 8, 20) }]}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.closeButton}>
            <X color="#0A0A0A" size={22} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.imageWrap}>
          <Image
            source={item.image}
            style={styles.image}
            contentFit="contain"
            transition={120}
            cachePolicy="memory-disk"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  imageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
