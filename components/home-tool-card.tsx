import {Image} from "expo-image";
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle} from "react-native";

import {DS} from "../lib/design-system";
import {useTheme, type Theme} from "../styles/theme";
import {LuxPressable} from "./lux-pressable";

const DARK_ACTION = "#111111";

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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const topLeftRadius = item.topLeftRadius ?? 16;
  const isLocked = item.locked === true;

  return (
    <LuxPressable
      accessibilityLabel={`${item.title}. ${item.description}${isLocked ? ". Verrouillé" : ""}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={[styles.card, { borderTopLeftRadius: topLeftRadius }, style]}
      scale={0.97}
    >
      <View style={[styles.imageWrap, { borderTopLeftRadius: topLeftRadius }]}>
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: theme.surfaceCard,
    borderRadius: 16,
    borderCurve: "continuous",
    boxShadow: `0px 12px 28px ${theme.shadow}`,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  imageWrap: {
    height: 312,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    backgroundColor: theme.surfaceMuted,
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
    ...DS.typography.cardTitle,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    color: theme.textPrimary,
    letterSpacing: 0,
  },
  description: {
    ...DS.typography.bodySm,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  buttonWrap: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingBottom: 2,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: DARK_ACTION,
  },
  buttonText: {
    ...DS.typography.button,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0,
  },
  });
}
