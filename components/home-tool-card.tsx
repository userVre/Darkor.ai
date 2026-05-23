import {md3Shapes, md3Spacing} from "@/constants/md3Theme";
import {Image} from "expo-image";
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle} from "react-native";
import {Button, Card, Text} from "react-native-paper";

import {useTheme, type Theme} from "../styles/theme";

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
  onPress: (item: HomeToolCardItem) => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
};

export function HomeToolCard({item, onPress, style}: HomeToolCardProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isLocked = item.locked === true;

  return (
    <Card
      accessibilityLabel={`${item.title}. ${item.description}${isLocked ? ". Locked" : ""}`}
      accessibilityRole="button"
      mode="elevated"
      onPress={() => onPress(item)}
      style={[styles.card, style]}
    >
      <View style={styles.imageWrap}>
        <Image source={item.image} style={styles.image} contentFit="cover" transition={0} cachePolicy="memory-disk" />
      </View>

      <Card.Content style={styles.copyBlock}>
        <View style={styles.copyText}>
          <Text numberOfLines={2} variant="titleMedium" style={styles.title}>
            {item.title}
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            {item.description}
          </Text>
        </View>

        <View style={styles.buttonWrap}>
          <Button
            compact
            mode="contained-tonal"
            onPress={() => onPress(item)}
            style={styles.button}
            labelStyle={styles.buttonText}
          >
            {t("common.actions.tryThis")}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      overflow: "hidden",
      backgroundColor: theme.paperTheme.colors.elevation.level1,
      borderRadius: md3Shapes.large,
    },
    imageWrap: {
      height: 312,
      overflow: "hidden",
      borderTopLeftRadius: md3Shapes.large,
      borderTopRightRadius: md3Shapes.large,
      backgroundColor: theme.paperTheme.colors.surfaceVariant,
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
      gap: md3Spacing.large,
      paddingHorizontal: md3Spacing.extraLarge,
      paddingVertical: md3Spacing.extraLarge,
    },
    copyText: {
      flex: 1,
      maxWidth: "60%",
      gap: md3Spacing.small,
      alignSelf: "stretch",
    },
    title: {
      color: theme.paperTheme.colors.onSurface,
      letterSpacing: 0,
    },
    description: {
      color: theme.paperTheme.colors.onSurfaceVariant,
      letterSpacing: 0,
    },
    buttonWrap: {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      paddingBottom: md3Spacing.extraSmall,
    },
    button: {
      borderRadius: 20,
    },
    buttonText: {
      letterSpacing: 0,
    },
  });
}
