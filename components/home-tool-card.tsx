import { Image } from "expo-image";
import { StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { DS, ambientShadow, floatingButton } from "../lib/design-system";
import { LuxPressable } from "./lux-pressable";

export type HomeToolCardItem = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
  serviceParam: "interior" | "facade" | "garden" | "paint" | "floor";
};

type HomeToolCardProps = {
  item: HomeToolCardItem;
  onPress: (item: HomeToolCardItem) => void;
  style?: StyleProp<ViewStyle>;
};

export function HomeToolCard({ item, onPress, style }: HomeToolCardProps) {
  const { t } = useTranslation();

  return (
    <LuxPressable
      accessibilityLabel={`${item.title}. ${item.description}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={[styles.card, style]}
      scale={0.97}
    >
      <View style={styles.imageWrap}>
        <Image source={item.image} style={styles.image} contentFit="cover" transition={0} cachePolicy="memory-disk" />
      </View>

      <View style={styles.copyBlock}>
        <View style={styles.copyText}>
          <Text numberOfLines={2} style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        <View style={styles.buttonWrap}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>{t("common.actions.tryThis")}</Text>
          </View>
        </View>
      </View>
    </LuxPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderCurve: "continuous",
    ...ambientShadow(0.06, 18, 12),
  },
  imageWrap: {
    height: 312,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    backgroundColor: DS.colors.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  copyBlock: {
    minHeight: 136,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  copyText: {
    flex: 1,
    maxWidth: "60%",
    gap: 8,
    alignSelf: "stretch",
  },
  title: {
    color: "#000000",
    ...DS.typography.cardTitle,
    fontSize: 24,
    lineHeight: 30,
  },
  description: {
    color: "#6B7280",
    ...DS.typography.bodySm,
  },
  buttonWrap: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingBottom: 2,
  },
  button: {
    ...floatingButton(true),
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: "#111111",
  },
  buttonText: {
    color: "#FFFFFF",
    ...DS.typography.button,
  },
});
