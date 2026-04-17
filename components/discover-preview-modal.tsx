import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Image as RNImage } from "react-native";
import { ArrowLeft } from "@/components/material-icons";
import { Image as ExpoImage } from "expo-image";

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
  const imageSource = useMemo(() => (item ? RNImage.resolveAssetSource(item.image) : null), [item]);

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
            {item.previewTitle ?? item.title}
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          bounces={false}
          maximumZoomScale={3}
          minimumZoomScale={1}
          contentContainerStyle={styles.imageScrollContent}
          style={styles.imageScroll}
        >
          <Pressable onPress={onClose} style={styles.imageWrap}>
            <ExpoImage
              source={item.image}
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={item.id}
              style={[
                styles.image,
                imageSource?.width && imageSource?.height
                  ? { aspectRatio: imageSource.width / imageSource.height }
                  : null,
              ]}
              contentFit="cover"
            />
          </Pressable>
        </ScrollView>
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
    ...fonts.bold,
  },
  topBarSpacer: {
    width: 44,
    height: 44,
  },
  imageScroll: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  imageWrap: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    minHeight: 320,
  },
});

