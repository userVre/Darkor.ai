import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "@/components/material-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

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
  const router = useRouter();
  const { t } = useTranslation();

  if (!item) {
    return null;
  }

  const handleTryThisStyle = () => {
    const service = item.service === "exterior" ? "facade" : item.service;
    onClose();
    router.push(`/workspace?service=${service}` as never);
  };

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
            transition={150}
            style={styles.image}
            contentFit="contain"
          />
        </View>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={handleTryThisStyle} style={styles.ctaButton}>
            <Text style={styles.ctaText}>{t("discover.tryThisStyle")}</Text>
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
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  imageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  ctaButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  ctaText: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

