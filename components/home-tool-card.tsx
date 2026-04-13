import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { fonts } from "../styles/typography";

export type HomeToolCardItem = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
  descriptionPaddingRight?: number;
  serviceParam: "interior" | "facade" | "garden" | "paint" | "floor";
};

type HomeToolCardProps = {
  item: HomeToolCardItem;
  index: number;
  onPress: (item: HomeToolCardItem) => void;
  variant?: "feature" | "compact";
  style?: StyleProp<ViewStyle>;
};

const SERVICE_LABELS: Record<HomeToolCardItem["serviceParam"], string> = {
  interior: "INTERIOR",
  facade: "EXTERIOR",
  garden: "GARDEN",
  paint: "PAINT",
  floor: "FLOOR",
};

export function HomeToolCard({ item, index, onPress, variant = "compact", style }: HomeToolCardProps) {
  const { t } = useTranslation();
  const handlePress = () => {
    onPress(item);
  };
  const isFeature = variant === "feature";
  const sequence = `${index + 1}`.padStart(2, "0");

  return (
    <View style={[styles.card, isFeature ? styles.cardFeature : styles.cardCompact, style]}>
      <View style={styles.imageFrame}>
        <Image source={item.image} style={styles.image} contentFit="cover" transition={0} cachePolicy="memory-disk" />

        <LinearGradient
          colors={["rgba(5, 7, 10, 0.04)", "rgba(5, 7, 10, 0.18)", "rgba(5, 7, 10, 0.92)"]}
          locations={[0, 0.48, 1]}
          style={styles.imageOverlay}
        />

        <View style={styles.topMeta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{sequence}</Text>
          </View>
        </View>

        <View style={styles.overlayContent}>
          <Text numberOfLines={1} style={[styles.title, isFeature ? styles.titleFeature : styles.titleCompact]}>
            {item.title}
          </Text>
          <Text
            numberOfLines={isFeature ? 2 : 3}
            style={[
              styles.description,
              isFeature ? styles.descriptionFeature : styles.descriptionCompact,
              item.descriptionPaddingRight ? { paddingRight: item.descriptionPaddingRight } : null,
            ]}
          >
            {item.description}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.serviceLabel}>{SERVICE_LABELS[item.serviceParam]}</Text>
        <Pressable accessibilityRole="button" onPress={handlePress} style={styles.button}>
          <Text style={styles.buttonText}>{t("common.actions.tryThis")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderCurve: "continuous",
    padding: 10,
    backgroundColor: "#F6F1EA",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8DED1",
  },
  cardFeature: {
    gap: 14,
  },
  cardCompact: {
    gap: 12,
  },
  imageFrame: {
    aspectRatio: 16 / 9,
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: "#D8D3CC",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topMeta: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 1,
  },
  metaChip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: {
    color: "#111418",
    fontSize: 10,
    lineHeight: 10,
    letterSpacing: 1.2,
    ...fonts.bold,
  },
  overlayContent: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  title: {
    color: "#FFFFFF",
    ...fonts.bold,
  },
  titleFeature: {
    fontSize: 21,
    lineHeight: 24,
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 18,
  },
  description: {
    marginTop: 6,
    color: "rgba(255,255,255,0.84)",
    textAlign: "left",
    ...fonts.regular,
  },
  descriptionFeature: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "74%",
  },
  descriptionCompact: {
    fontSize: 12,
    lineHeight: 16,
    maxWidth: "86%",
  },
  footerRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 4,
  },
  serviceLabel: {
    flex: 1,
    color: "#6E6150",
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.6,
    ...fonts.semibold,
  },
  button: {
    borderRadius: 999,
    backgroundColor: "#1A1D22",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0.6,
    ...fonts.semibold,
  },
});
