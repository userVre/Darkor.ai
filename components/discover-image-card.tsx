import {md3Shapes} from "@/constants/md3Theme";
import {Image} from "expo-image";
import {memo} from "react";
import type {StyleProp, ViewStyle} from "react-native";
import {StyleSheet, View} from "react-native";
import {Card} from "react-native-paper";

import type {DiscoverTile} from "../lib/discover-catalog";
import {useTheme} from "../styles/theme";

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
  const theme = useTheme();

  return (
    <Card
      accessibilityLabel={item.title}
      accessibilityRole="imagebutton"
      mode="elevated"
      onPress={() => onPress(item)}
      style={[styles.card, {width, height, backgroundColor: theme.paperTheme.colors.elevation.level1}, style]}
    >
      <View style={[styles.innerFrame, {backgroundColor: theme.paperTheme.colors.surfaceVariant}]}>
        <Image
          source={item.image}
          transition={280}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          style={styles.image}
          contentFit="cover"
          contentPosition="center"
          resizeMode="cover"
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: md3Shapes.large,
  },
  innerFrame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: md3Shapes.large,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
