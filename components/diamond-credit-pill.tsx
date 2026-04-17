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

import { ambientShadow, organicRadii } from "../lib/design-system";
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
    backgroundColor: "#0D0D0D",
    textColor: "#FFFFFF",
    prismPrimary: "#2563EB",
  },
  light: {
    backgroundColor: "#FFFFFF",
    textColor: "#111827",
    prismPrimary: "#2563EB",
  },
} as const;

export function DiamondCreditIcon({
  primaryColor,
  size = 18,
}: {
  primaryColor: string;
  size?: number;
}) {
  const width = size;
  const height = size;

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.creditIconWrap, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 18 18">
        <Path
          d="M5.108 2.25h7.784l3.108 4.07L9 15.75 1.999 6.32l3.109-4.07Z"
          fill={primaryColor}
        />
        <Path
          d="M5.108 2.25 9 6.32l3.892-4.07"
          stroke="#93C5FD"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={0.9}
        />
        <Path
          d="M1.999 6.32h14.001"
          stroke="#1D4ED8"
          strokeLinecap="round"
          strokeWidth={0.9}
        />
        <Path
          d="M5.108 2.25 9 15.75 12.892 2.25"
          stroke="#DBEAFE"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={0.8}
          opacity={0.9}
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
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...organicRadii(20, 14),
    ...ambientShadow(0.06, 12, 8),
  },
  countText: {
    fontSize: 15,
    lineHeight: 15,
    fontVariant: ["tabular-nums"],
    textAlignVertical: "center",
    ...fonts.bold,
  },
  creditIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0.5,
  },
});
