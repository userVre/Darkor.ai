import { Diamond } from "@/components/material-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";

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
    backgroundColor: "#0A0A0A",
    borderColor: "transparent",
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

export function ThreeDiamondMark({
  color,
  style,
}: {
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.diamondMark, style]} pointerEvents="none">
      <Diamond color={color} size={11} strokeWidth={2.2} style={styles.diamondLeft} />
      <Diamond color={color} size={13} strokeWidth={2.2} style={styles.diamondCenter} />
      <Diamond color={color} size={11} strokeWidth={2.2} style={styles.diamondRight} />
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
      <ThreeDiamondMark color={palette.iconColor} />
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
          style,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
          },
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
        style,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  diamondMark: {
    width: 30,
    height: 18,
    position: "relative",
  },
  diamondLeft: {
    position: "absolute",
    left: 0,
    top: 4,
    opacity: 0.92,
  },
  diamondCenter: {
    position: "absolute",
    left: 9,
    top: 0,
  },
  diamondRight: {
    position: "absolute",
    right: 0,
    top: 4,
    opacity: 0.92,
  },
  countText: {
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
});
