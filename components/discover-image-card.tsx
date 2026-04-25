import {Image} from "expo-image";
import {memo} from "react";
import type {StyleProp, ViewStyle} from "react-native";
import {StyleSheet, View} from "react-native";

import {DS, ambientShadow} from "../lib/design-system";
import type {DiscoverTile} from "../lib/discover-catalog";
import {LuxPressable} from "./lux-pressable";

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
      </View>
    </LuxPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: DS.colors.surfaceRaised,
    borderRadius: 20,
    borderCurve: "continuous",
    ...ambientShadow(0.06, 16, 12),
  },
  innerFrame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: DS.colors.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
