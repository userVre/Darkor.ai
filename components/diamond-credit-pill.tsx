import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Stop } from "react-native-svg";

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
    prismPrimary: "#FFFFFF",
    prismSecondary: "#73C4FF",
    prismGlow: "rgba(115,196,255,0.36)",
  },
  light: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(79,124,171,0.14)",
    textColor: DS.colors.textPrimary,
    prismPrimary: "#FFFFFF",
    prismSecondary: "#5AAEFF",
    prismGlow: "rgba(111,181,255,0.28)",
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
      <View style={styles.creditGlowCore} />
      <Svg width={width} height={height} viewBox="0 0 28 28">
        <Defs>
          <LinearGradient id="credit-prism" x1="0.16" x2="0.82" y1="0" y2="1">
            <Stop offset="0" stopColor={primaryColor} />
            <Stop offset="1" stopColor={secondaryColor} />
          </LinearGradient>
          <LinearGradient id="credit-facet-left" x1="0" x2="0.8" y1="0" y2="1">
            <Stop offset="0" stopColor="rgba(255,255,255,0.98)" />
            <Stop offset="1" stopColor="rgba(173,227,255,0.65)" />
          </LinearGradient>
          <LinearGradient id="credit-facet-right" x1="0.2" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="rgba(226,245,255,0.82)" />
            <Stop offset="1" stopColor="rgba(79,163,255,0.88)" />
          </LinearGradient>
          <RadialGradient id="credit-core" cx="50%" cy="38%" rx="52%" ry="58%">
            <Stop offset="0" stopColor="rgba(255,255,255,0.96)" />
            <Stop offset="1" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
        </Defs>
        <Path d="M14 2.5 22.2 9.2 14 25.5 5.8 9.2 14 2.5Z" fill="url(#credit-prism)" />
        <Polygon fill="url(#credit-core)" points="14,4.2 20.4,9.3 14,20.8 7.6,9.3" opacity={0.92} />
        <Polygon fill="url(#credit-facet-left)" points="14,4.2 7.8,9.2 11.4,21.1 14,14.4" opacity={0.95} />
        <Polygon fill="url(#credit-facet-right)" points="14,4.2 20.2,9.2 16.5,21.1 14,14.4" opacity={0.95} />
        <Path d="M7.4 9.4H20.6" stroke="rgba(255,255,255,0.75)" strokeLinecap="round" strokeWidth="1.1" />
        <Path d="M14 4.2V24" stroke="rgba(255,255,255,0.62)" strokeLinecap="round" strokeWidth="1.2" />
        <Path d="M14 14.4 20.2 9.2" stroke="rgba(255,255,255,0.38)" strokeLinecap="round" strokeWidth="0.9" />
        <Path d="M14 14.4 7.8 9.2" stroke="rgba(255,255,255,0.34)" strokeLinecap="round" strokeWidth="0.9" />
        <Path
          d="M18.7 6.7 19.4 8.2 20.9 8.9 19.4 9.6 18.7 11.1 18 9.6 16.5 8.9 18 8.2 18.7 6.7Z"
          fill="rgba(255,255,255,0.92)"
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
    fontSize: 15,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
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
  creditGlowCore: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.78)",
    opacity: 0.95,
  },
});
