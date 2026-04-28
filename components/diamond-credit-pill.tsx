import {
I18nManager,
Pressable,
StyleSheet,
Text,
View,
type AccessibilityRole,
type StyleProp,
type ViewStyle,
} from "react-native";
import Svg, {Path} from "react-native-svg";

import {ambientShadow, organicRadii} from "../lib/design-system";
import {fonts} from "../styles/typography";

type DiamondCreditPillProps = {
  count: number;
  variant?: "dark" | "light";
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const DIAMOND_PILL_BLUE = "#1D4ED8";

const VARIANT_STYLES = {
  dark: {
    backgroundColor: "#FFFFFF",
    textColor: "#0F172A",
    prismPrimary: DIAMOND_PILL_BLUE,
  },
  light: {
    backgroundColor: "#FFFFFF",
    textColor: "#0F172A",
    prismPrimary: DIAMOND_PILL_BLUE,
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
          stroke="#60A5FA"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
        />
        <Path
          d="M1.999 6.32h14.001"
          stroke="#1E40AF"
          strokeLinecap="round"
          strokeWidth={1}
        />
        <Path
          d="M5.108 2.25 9 15.75 12.892 2.25"
          stroke="#BFDBFE"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={0.9}
          opacity={0.95}
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
  const isRTL = I18nManager.isRTL;
  const palette = VARIANT_STYLES[variant];
  const content = (
    <>
      <DiamondCreditIcon primaryColor={palette.prismPrimary} />
      <Text style={[styles.countText, { color: palette.textColor }]}>{count}</Text>
    </>
  );

  const pillStyle = [
    styles.pill,
    isRTL ? styles.pillRtl : null,
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

export function ProBadge({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.proBadge, style]}>
      <View style={styles.proGlow} />
      <Text style={styles.proText}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    ...organicRadii(20, 14),
    ...ambientShadow(0.06, 12, 8),
  },
  pillRtl: {
    flexDirection: "row-reverse",
  },
  countText: {
    fontSize: 15,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    ...fonts.bold,
  },
  creditIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  proBadge: {
    minHeight: 40,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.45)",
    backgroundColor: "#082F49",
    ...organicRadii(20, 14),
    ...ambientShadow(0.16, 16, 12),
    overflow: "hidden",
  },
  proGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 211, 238, 0.16)",
  },
  proText: {
    color: "#BAE6FD",
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 1.2,
    ...fonts.bold,
  },
});
