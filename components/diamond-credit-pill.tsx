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
    backgroundColor: DS.colors.creditPillBackground,
    borderColor: DS.colors.creditPillBorder,
    textColor: DS.colors.textPrimary,
    prismPrimary: DS.colors.accent,
  },
  light: {
    backgroundColor: DS.colors.creditPillBackground,
    borderColor: DS.colors.creditPillBorder,
    textColor: DS.colors.textPrimary,
    prismPrimary: DS.colors.accent,
  },
} as const;

export function DiamondCreditIcon({
  primaryColor,
  size = 18,
}: {
  primaryColor: string;
  size?: number;
}) {
  const width = size + 10;
  const height = size + 10;

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.creditIconWrap, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 28 28">
        <Path
          d="M14 3.6 21.2 9.6 14 24.4 6.8 9.6 14 3.6Z"
          fill={primaryColor}
          stroke={DS.colors.borderStrong}
          strokeLinejoin="round"
          strokeWidth="1.1"
        />
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
      <DiamondCreditIcon primaryColor={palette.prismPrimary} />
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
    ...ambientShadow(0.035, 12, 8),
  },
  countText: {
    fontSize: 15,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    ...fonts.bold,
  },
  creditIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
