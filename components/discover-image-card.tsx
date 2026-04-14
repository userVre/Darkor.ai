import { memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { DS, ambientShadow, organicRadii } from "../lib/design-system";
import type { DiscoverTile } from "../lib/discover-catalog";
import { LuxPressable } from "./lux-pressable";

type DiscoverImageCardProps = {
  item: DiscoverTile;
  width: number;
  height: number;
  onPress: (item: DiscoverTile) => void;
  style?: StyleProp<ViewStyle>;
};

export const DiscoverImageCard = memo(function DiscoverImageCard({
  item,
  width,
  height,
  onPress,
  style,
}: DiscoverImageCardProps) {
  return (
    <LuxPressable
      accessibilityLabel={item.title}
      accessibilityRole="imagebutton"
      onPress={() => onPress(item)}
      style={[styles.card, { width, height }, style]}
      scale={0.95}
    >
      <View style={styles.innerFrame}>
        <Image
          source={item.image}
          transition={120}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          style={styles.image}
          contentFit="cover"
        />

        <LinearGradient
          colors={["rgba(17, 19, 24, 0.02)", "rgba(17, 19, 24, 0.08)", "rgba(17, 19, 24, 0.42)"]}
          locations={[0, 0.56, 1]}
          style={styles.overlay}
        />

        <View style={styles.captionWrap}>
          <Text numberOfLines={1} style={styles.caption}>
            {item.previewTitle.toUpperCase()}
          </Text>
          <Text numberOfLines={1} style={styles.subcaption}>
            Editorial preview
          </Text>
        </View>
      </View>
    </LuxPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: DS.colors.surfaceRaised,
    ...organicRadii(),
    ...ambientShadow(),
  },
  innerFrame: {
    flex: 1,
    overflow: "hidden",
    ...organicRadii(),
    backgroundColor: DS.colors.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  captionWrap: {
    position: "absolute",
    left: DS.spacing[2],
    right: DS.spacing[2],
    bottom: DS.spacing[2],
    gap: 2,
  },
  caption: {
    color: "#FFFFFF",
    ...DS.typography.label,
  },
  subcaption: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});
