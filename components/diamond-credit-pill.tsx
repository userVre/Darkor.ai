import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Polygon, Stop } from "react-native-svg";

import { DS, ambientShadow, organicRadii, subtleBorder } from "../lib/design-system";
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
    backgroundColor: "rgba(17, 19, 24, 0.92)",
    borderColor: "rgba(255,255,255,0.08)",
    textColor: "#FFFFFF",
    prismPrimary: "#B9ECFF",
    prismSecondary: "#7BD3FF",
    prismGlow: "rgba(123,211,255,0.34)",
  },
  light: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(17,19,24,0.08)",
    textColor: DS.colors.textPrimary,
    prismPrimary: "#1A2B3D",
    prismSecondary: "#4E8DBA",
    prismGlow: "rgba(78,141,186,0.22)",
  },
} as const;

export function DiamondCreditIcon({
  glowColor,
  primaryColor,
  secondaryColor,
  size = 18,
}: {
  glowColor: string;
  primaryColor: string;
  secondaryColor: string;
  size?: number;
}) {
  const width = size + 10;
  const height = size + 10;

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.creditIconWrap, { width, height }]}>
      <View style={[styles.creditGlow, { backgroundColor: glowColor }]} />
      <Svg width={width} height={height} viewBox="0 0 28 28">
        <Defs>
          <LinearGradient id="credit-prism" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={primaryColor} />
            <Stop offset="1" stopColor={secondaryColor} />
          </LinearGradient>
        </Defs>
        <Polygon fill="url(#credit-prism)" points="14,3 22,9 19,20 9,24 5,11" opacity={0.98} />
        <Path d="M14 3 22 9 14 14 5 11" fill="rgba(255,255,255,0.24)" />
        <Path d="M14 14 19 20 9 24 5 11" fill="rgba(0,0,0,0.12)" />
        <Path d="M14 3 14 14" stroke="rgba(255,255,255,0.58)" strokeLinecap="round" strokeWidth="1.4" />
      </Svg>
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
      <DiamondCreditIcon
        glowColor={palette.prismGlow}
        primaryColor={palette.prismPrimary}
        secondaryColor={palette.prismSecondary}
      />
      <Text style={[styles.countText, { color: palette.textColor }]}>{count}</Text>
    </>
  );

  const pillStyle = [
    styles.pill,
    {
      backgroundColor: palette.backgroundColor,
    },
    subtleBorder(palette.borderColor),
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        hitSlop={10}
        onPress={onPress}
        style={pillStyle}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={pillStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...organicRadii(20, 14),
    ...ambientShadow(),
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
  creditGlow: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 999,
    opacity: 0.9,
  },
});
