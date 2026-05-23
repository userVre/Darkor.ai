import {md3Shapes, md3Spacing} from "@/constants/md3Theme";
import {Image} from "expo-image";
import {useTranslation} from "react-i18next";
import {StyleSheet, View} from "react-native";
import {ActivityIndicator, Badge, Card, Text} from "react-native-paper";

import type {BoardItem} from "../lib/board";
import {resolveGenerationStatus} from "../lib/generation-status";
import {useTheme} from "../styles/theme";

type BoardImageCardProps = {
  item: BoardItem;
  width: number;
  onPress: (item: BoardItem) => void;
  onLongPress: (item: BoardItem) => void;
};

function formatPortfolioLabel(
  item: BoardItem,
  isProcessing: boolean,
  isFailed: boolean,
  labels: {processing: string; failed: string; preview: string},
) {
  if (isProcessing) {
    return labels.processing;
  }

  if (isFailed) {
    return labels.failed;
  }

  const style = item.styleName?.trim();
  const room = item.roomType?.trim();

  if (style && room) {
    return `${style} ${room}`;
  }

  return style || room || labels.preview;
}

export function BoardImageCard({item, width, onPress, onLongPress}: BoardImageCardProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const previewImage = item.imageUri ?? item.originalImageUri ?? null;
  const resolvedStatus = resolveGenerationStatus(item.status, item.imageUri);
  const isProcessing = resolvedStatus === "processing";
  const isFailed = resolvedStatus === "failed";
  const showNewBadge = item.isNew && resolvedStatus === "ready";
  const portfolioLabel = formatPortfolioLabel(item, isProcessing, isFailed, {
    processing: t("profile.cardDesigning"),
    failed: t("profile.cardFailed"),
    preview: t("profile.cardPreview"),
  });

  return (
    <Card
      mode={isFailed ? "contained" : "elevated"}
      onLongPress={() => onLongPress(item)}
      onPress={() => onPress(item)}
      style={[styles.card, {width, backgroundColor: isFailed ? theme.paperTheme.colors.errorContainer : theme.paperTheme.colors.elevation.level1}]}
    >
      {previewImage ? (
        <Image source={{uri: previewImage}} style={styles.image} contentFit="cover" transition={120} cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.fallback, {backgroundColor: theme.paperTheme.colors.surfaceVariant}]} />
      )}

      {showNewBadge ? <Badge style={styles.badge}>{t("profile.cardNew")}</Badge> : null}

      {isProcessing ? (
        <View pointerEvents="none" style={styles.processingOverlay}>
          <View style={[styles.processingOrb, {backgroundColor: theme.paperTheme.colors.elevation.level3}]}>
            <ActivityIndicator size="small" />
          </View>
          <Text variant="labelLarge" style={[styles.processingText, {color: theme.paperTheme.colors.onSurface}]}>
            {t("profile.cardProcessing")}
          </Text>
        </View>
      ) : null}

      <View style={[styles.copy, {backgroundColor: theme.paperTheme.colors.elevation.level3}]}>
        <Text
          numberOfLines={2}
          variant="labelLarge"
          style={[styles.portfolioLabel, {color: isFailed ? theme.paperTheme.colors.onErrorContainer : theme.paperTheme.colors.onSurface}]}
        >
          {portfolioLabel}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 200,
    borderRadius: md3Shapes.large,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: md3Spacing.medium,
    right: md3Spacing.medium,
  },
  processingOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: md3Spacing.medium,
    paddingHorizontal: md3Spacing.extraLarge,
  },
  processingOrb: {
    width: 48,
    height: 48,
    borderRadius: md3Shapes.full,
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: {
    textAlign: "center",
  },
  copy: {
    position: "absolute",
    left: md3Spacing.medium,
    right: md3Spacing.medium,
    bottom: md3Spacing.medium,
    borderRadius: md3Shapes.large,
    paddingHorizontal: md3Spacing.medium,
    paddingVertical: md3Spacing.small,
  },
  portfolioLabel: {
    textAlign: "left",
  },
});
