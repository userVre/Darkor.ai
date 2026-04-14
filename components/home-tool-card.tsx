import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { DS, ambientShadow, floatingButton, organicRadii } from "../lib/design-system";
import { LuxPressable } from "./lux-pressable";

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
  index: number;
  focused?: boolean;
  onPress: (item: HomeToolCardItem) => void;
  variant?: "feature" | "compact";
  style?: StyleProp<ViewStyle>;
};

const SERVICE_LABELS: Record<HomeToolCardItem["serviceParam"], string> = {
  interior: "Interior",
  facade: "Exterior",
  garden: "Garden",
  paint: "Wall Finish",
  floor: "Floor Restyle",
};

export function HomeToolCard({
  item,
  index,
  focused = false,
  onPress,
  variant = "compact",
  style,
}: HomeToolCardProps) {
  const { t } = useTranslation();
  const isFeature = variant === "feature";

  return (
    <LuxPressable
      accessibilityLabel={`${item.title}. ${item.description}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={[
        styles.card,
        isFeature ? styles.featureCard : styles.compactCard,
        focused ? styles.cardFocused : styles.cardUnfocused,
        style,
      ]}
      scale={0.95}
    >
      <View style={styles.imageWrap}>
        <Image source={item.image} style={styles.image} contentFit="cover" transition={120} cachePolicy="memory-disk" />
        <LinearGradient
          colors={["rgba(17, 19, 24, 0.02)", "rgba(17, 19, 24, 0.08)", "rgba(17, 19, 24, 0.24)"]}
          locations={[0, 0.56, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.metaRow}>
          <View style={styles.sequenceChip}>
            <Text style={styles.sequenceText}>{`${index + 1}`.padStart(2, "0")}</Text>
          </View>
          <View style={styles.serviceChip}>
            <Text style={styles.serviceChipText}>{SERVICE_LABELS[item.serviceParam]}</Text>
          </View>
        </View>

        <View style={[styles.fabWrap, focused ? styles.fabWrapFocused : styles.fabWrapIdle]}>
          <View style={styles.fab}>
            <Text style={styles.fabText}>{t("common.actions.tryThis")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.description, item.descriptionPaddingRight ? { paddingRight: item.descriptionPaddingRight } : null]}
        >
          {item.description}
        </Text>
      </View>
    </LuxPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: DS.colors.surfaceRaised,
    ...organicRadii(),
    ...ambientShadow(),
  },
  featureCard: {
    minHeight: 420,
  },
  compactCard: {
    minHeight: 320,
  },
  cardFocused: {
    transform: [{ translateY: -4 }],
  },
  cardUnfocused: {
    opacity: 0.96,
  },
  imageWrap: {
    height: "70%",
    minHeight: 220,
    position: "relative",
    backgroundColor: DS.colors.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  metaRow: {
    position: "absolute",
    top: DS.spacing[2],
    left: DS.spacing[2],
    right: DS.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sequenceChip: {
    ...organicRadii(18, 14),
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sequenceText: {
    color: DS.colors.textPrimary,
    ...DS.typography.label,
  },
  serviceChip: {
    ...organicRadii(18, 14),
    backgroundColor: "rgba(17, 19, 24, 0.68)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serviceChipText: {
    color: "#FFFFFF",
    ...DS.typography.label,
  },
  fabWrap: {
    position: "absolute",
    right: DS.spacing[2],
    bottom: DS.spacing[2],
  },
  fabWrapFocused: {
    opacity: 1,
    transform: [{ scale: 1 }, { translateY: 0 }],
  },
  fabWrapIdle: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }, { translateY: 8 }],
  },
  fab: {
    ...floatingButton(true),
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fabText: {
    color: "#FFFFFF",
    ...DS.typography.button,
  },
  copyBlock: {
    flex: 1,
    justifyContent: "space-between",
    gap: DS.spacing[1],
    paddingHorizontal: DS.spacing[2],
    paddingVertical: DS.spacing[2],
  },
  title: {
    color: "#000000",
    fontFamily: "Inter",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: -0.45,
  },
  description: {
    maxWidth: "60%",
    color: "#617081",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
});
