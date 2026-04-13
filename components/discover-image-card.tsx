import { memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

import type { DiscoverTile } from "../lib/discover-catalog";
import { fonts } from "../styles/typography";

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
    <Pressable
      accessibilityLabel={item.title}
      accessibilityRole="imagebutton"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          height,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
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
          colors={["rgba(5, 7, 10, 0.02)", "rgba(5, 7, 10, 0.18)", "rgba(5, 7, 10, 0.78)"]}
          locations={[0, 0.52, 1]}
          style={styles.overlay}
        />

        <View style={styles.captionWrap}>
          <Text numberOfLines={1} style={styles.caption}>
            {item.previewTitle.toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderCurve: "continuous",
    padding: 8,
    backgroundColor: "#F6F1EA",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8DED1",
  },
  innerFrame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "#E5E0D8",
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
    left: 14,
    right: 14,
    bottom: 14,
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.8,
    ...fonts.bold,
  },
});
