import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BoardItem } from "../lib/board";
import { fonts } from "../styles/typography";

type BoardImageCardProps = {
  item: BoardItem;
  width: number;
  onPress: (item: BoardItem) => void;
  onLongPress: (item: BoardItem) => void;
};

export function BoardImageCard({ item, width, onPress, onLongPress }: BoardImageCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={240}
      style={[styles.card, { width }]}
    >
      <Image source={{ uri: item.imageUri }} style={styles.image} contentFit="cover" transition={120} cachePolicy="memory-disk" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.gradient} />

      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.styleName}>
          {item.styleName}
        </Text>
        <Text numberOfLines={1} style={styles.roomType}>
          {item.roomType}
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
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  copy: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
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
});
