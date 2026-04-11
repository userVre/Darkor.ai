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
  onPress: (item: HomeToolCardItem) => void;
  style?: StyleProp<ViewStyle>;
};

export function HomeToolCard({ item, onPress, style }: HomeToolCardProps) {
  const { t } = useTranslation();
  const handlePress = () => {
    onPress(item);
  };

  return (
    <View style={[styles.card, style]}>
      <Image source={item.image} style={styles.image} contentFit="cover" transition={0} cachePolicy="memory-disk" />

      <View style={styles.divider} />

      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2} style={[styles.description, item.descriptionPaddingRight ? { paddingRight: item.descriptionPaddingRight } : null]}>
          {item.description}
        </Text>

        <Pressable accessibilityRole="button" onPress={handlePress} style={styles.button}>
          <Text style={styles.buttonText}>{t("common.actions.tryThis")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "auto",
    maxWidth: 420,
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    alignSelf: "stretch",
  },
  image: {
    width: "100%",
    height: 214,
  },
  divider: {
    height: 1,
    marginTop: 12,
    marginHorizontal: 24,
    backgroundColor: "#E0E0E0",
  },
  content: {
    position: "relative",
    minHeight: 102,
    paddingBottom: 22,
  },
  title: {
    marginTop: 14,
    marginLeft: 24,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  description: {
    marginTop: 4,
    marginLeft: 24,
    marginRight: 24,
    maxWidth: "60%",
    color: "#808080",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
    ...fonts.regular,
  },
  button: {
    position: "absolute",
    right: 24,
    bottom: 20,
    borderRadius: 24,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 14,
    ...fonts.semibold,
  },
});
