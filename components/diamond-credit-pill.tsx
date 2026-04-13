import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

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
    <Svg accessibilityElementsHidden height={size} pointerEvents="none" viewBox="0 0 24 24" width={size}>
      <Path d="M12 2.75 5.6 9.25l6.4 12 6.4-12Z" fill={color} opacity={0.95} />
      <Path d="M8.45 9.25 12 2.75l3.55 6.5Z" fill={color} opacity={0.45} />
      <Path d="M8.45 9.25h7.1L12 20.2Z" fill={color} opacity={0.2} />
      <Path d="M8.45 9.25 12 20.2l3.55-10.95" fill="none" opacity={0.75} stroke={color} strokeLinejoin="round" strokeWidth={1.1} />
      <Path d="M5.6 9.25h12.8" fill="none" opacity={0.55} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
      <Path d="M12 2.75v17.45" fill="none" opacity={0.34} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} />
    </Svg>
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
});
