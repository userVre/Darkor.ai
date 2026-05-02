import {Image} from "expo-image";
import {useTranslation} from "react-i18next";
import {StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle} from "react-native";

import {DS, ambientShadow} from "../lib/design-system";
import {DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {LuxPressable} from "./lux-pressable";

export type HomeToolCardItem = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
  serviceParam?: "interior" | "facade" | "garden" | "paint" | "floor" | "layout" | "replace";
  href?: string;
  topLeftRadius?: number;
  requiresPro?: boolean;
  locked?: boolean;
};

type HomeToolCardProps = {
  item: HomeToolCardItem;
  onPress: (item: HomeToolCardItem) => void;
  style?: StyleProp<ViewStyle>;
};

export function HomeToolCard({ item, onPress, style }: HomeToolCardProps) {
  const { t } = useTranslation();
  const topLeftRadius = item.topLeftRadius ?? 40;
  const isLocked = item.locked === true;

  return (
    <LuxPressable
      accessibilityLabel={`${item.title}. ${item.description}${isLocked ? ". Locked" : ""}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={[styles.card, { borderTopLeftRadius: topLeftRadius }, style]}
      scale={0.97}
    >
      <View style={[styles.imageWrap, { borderTopLeftRadius: topLeftRadius }]}>
        <Image source={item.image} style={styles.image} contentFit="cover" transition={0} cachePolicy="memory-disk" />
        {isLocked ? (
          <View pointerEvents="none" style={styles.lockBadge}>
            <Text accessibilityElementsHidden style={styles.lockBadgeText}>🔒</Text>
          </View>
        ) : null}
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
    backgroundColor: DS.colors.surfaceRaised,
    borderRadius: 24,
    borderCurve: "continuous",
    ...ambientShadow(0.04, 16, 10),
    shadowColor: DIAMOND_PILL_BLUE,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    boxShadow: "0px 10px 24px rgba(0,122,255,0.12), 0px 0px 18px rgba(0,122,255,0.1)",
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  imageWrap: {
    height: 312,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    backgroundColor: DS.colors.surfaceMuted,
  },
  lockBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 250, 252, 0.86)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(100, 116, 139, 0.28)",
    boxShadow: "0px 10px 22px rgba(15, 23, 42, 0.14)",
  },
  lockBadgeText: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
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
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
    fontSize: 24,
    lineHeight: 30,
  },
  description: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  buttonWrap: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingBottom: 2,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: "#111318",
    borderWidth: 1,
    borderColor: "#111318",
    boxShadow: "0px 10px 24px rgba(17, 19, 24, 0.12)",
  },
  buttonText: {
    color: "#FFFFFF",
    ...DS.typography.button,
  },
});
