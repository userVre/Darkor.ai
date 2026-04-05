import { memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";

import type { DiscoverTile } from "../lib/discover-catalog";

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
      <Image
        source={item.image}
        transition={120}
        style={styles.image}
        contentFit="cover"
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#F4F4F4",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
