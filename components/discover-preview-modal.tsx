import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft } from "@/components/material-icons";
import { Image } from "expo-image";

import type { DiscoverTile } from "../lib/discover-catalog";
import { fonts } from "../styles/typography";

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
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: Math.max(topInset + 8, 20) }]}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.backButton}>
            <ArrowLeft color="#FFFFFF" size={24} strokeWidth={2.3} />
          </Pressable>

          <Text numberOfLines={1} style={styles.previewTitle}>
            {item.previewTitle.toUpperCase()}
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.imageWrap}>
          <Pressable onPress={onClose} style={styles.imageTapTarget}>
            <Image
              source={item.image}
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item.id}
              style={styles.image}
              contentFit="contain"
            />
          </Pressable>
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
    paddingHorizontal: 20,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  previewTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    letterSpacing: 0.4,
    ...fonts.bold,
  },
  topBarSpacer: {
    width: 44,
    height: 44,
  },
  imageWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  imageTapTarget: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

