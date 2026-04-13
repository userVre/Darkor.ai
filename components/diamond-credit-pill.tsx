import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Hexagon } from "lucide-react-native";

import { fonts } from "../styles/typography";

type DiamondCreditPillProps = {
  count: number;
  variant?: "dark" | "light";
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_STYLES = {
  dark: {
    backgroundColor: "#05070A",
    borderColor: "#243140",
    iconColor: "#FFFFFF",
    textColor: "#FFFFFF",
  },
  light: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    iconColor: "#0A0A0A",
    textColor: "#0A0A0A",
  },
} as const;

export function DiamondCreditIcon({
  color,
  size = 16,
}: {
  color: string;
  size?: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      pointerEvents="none"
      style={[styles.creditIconWrap, { width: size + 6, height: size + 6 }]}
    >
      <Hexagon color={color} size={size + 6} strokeWidth={1.8} />
      <View style={[styles.creditIconCore, { backgroundColor: color }]} />
      <View style={[styles.creditIconGlow, { backgroundColor: color }]} />
    </View>
  );
}

export function DiamondCreditPill({
  count,
  variant = "dark",
  accessibilityLabel = "Credits",
  accessibilityRole = "button",
  onPress,
  style,
}: DiamondCreditPillProps) {
  const palette = VARIANT_STYLES[variant];
  const content = (
    <>
      <DiamondCreditIcon color={palette.iconColor} size={16} />
      <Text style={[styles.countText, { color: palette.textColor }]}>{count}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        hitSlop={10}
        onPress={onPress}
        style={[
          styles.pill,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
          },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  countText: {
    fontSize: 14,
    lineHeight: 16,
    ...fonts.bold,
  },
  creditIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  creditIconCore: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  creditIconGlow: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    opacity: 0.18,
  },
});
