import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { BoardItem } from "../lib/board";
import { resolveGenerationStatus } from "../lib/generation-status";
import { fonts } from "../styles/typography";

type BoardImageCardProps = {
  item: BoardItem;
  width: number;
  onPress: (item: BoardItem) => void;
  onLongPress: (item: BoardItem) => void;
};

export function BoardImageCard({ item, width, onPress, onLongPress }: BoardImageCardProps) {
  const previewImage = item.imageUri ?? item.originalImageUri ?? null;
  const resolvedStatus = resolveGenerationStatus(item.status, item.imageUri);
  const isProcessing = resolvedStatus === "processing";
  const isFailed = resolvedStatus === "failed";
  const showNewBadge = item.isNew && resolvedStatus === "ready";
  const subtitle = isProcessing ? "AI is Designing..." : isFailed ? "Generation failed" : item.roomType;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={240}
      style={[styles.card, { width }]}
    >
      {previewImage ? (
        <Image source={{ uri: previewImage }} style={styles.image} contentFit="cover" transition={120} cachePolicy="memory-disk" />
      ) : (
        <View style={styles.fallback} />
      )}

      {showNewBadge ? (
        <View pointerEvents="none" style={styles.badge}>
          <Text style={styles.badgeText}>New</Text>
        </View>
      ) : null}

      {isProcessing ? (
        <View pointerEvents="none" style={styles.processingOverlay}>
          <View style={styles.processingOrb}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      ) : null}

      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.styleName}>
          {item.styleName}
        </Text>
        <Text numberOfLines={1} style={[styles.roomType, isFailed ? styles.failedText : null]}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#141414",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: "#A4161A",
    fontSize: 10,
    lineHeight: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    ...fonts.bold,
  },
  processingOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  processingOrb: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    backgroundColor: "#1C1C1C",
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    ...fonts.semibold,
  },
  copy: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    backgroundColor: "#111111",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  styleName: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 17,
    ...fonts.semibold,
  },
  roomType: {
    marginTop: 2,
    color: "#CCCCCC",
    fontSize: 12,
    lineHeight: 14,
    ...fonts.regular,
  },
  failedText: {
    color: "#F3B3BE",
  },
});
