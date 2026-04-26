import {light} from "@/styles/theme";
import {StyleSheet, type TextStyle, type ViewStyle} from "react-native";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";

const SPACING_UNIT = spacing.sm;

export const DS = {
  colors: {
    background: light.bg,
    backgroundAlt: light.surface,
    surface: light.surface,
    surfaceHigh: light.surfaceHigh,
    surfaceRaised: light.surfaceHigh,
    surfaceMuted: light.surfaceMuted,
    surfaceOverlay: light.surfaceOverlay,
    borderSubtle: light.border,
    border: light.border,
    borderStrong: light.borderLight,
    textPrimary: light.textPrimary,
    textSecondary: light.textSecondary,
    textTertiary: light.textMuted,
    textMuted: light.textMuted,
    textInverse: light.textInverse,
    accent: light.brand,
    accentStrong: light.brandDark,
    accentSecondary: light.brand,
    accentGlow: light.brandSoft,
    accentGlowStrong: light.brand,
    accentSurface: light.brandSurface,
    actionPrimary: light.brand,
    actionPrimarySoft: light.brandDark,
    creditPillBackground: light.surfaceHigh,
    creditPillBorder: light.borderLight,
    badgePro: light.success,
    badgeProText: light.textInverse,
    positive: light.success,
    danger: light.error,
    shadow: light.shadow,
  },
  spacing: {
    0: 0,
    1: SPACING_UNIT,
    1.5: SPACING_UNIT * 1.5,
    2: SPACING_UNIT * 2,
    2.5: SPACING_UNIT * 2.5,
    3: SPACING_UNIT * 3,
    4: SPACING_UNIT * 4,
    5: SPACING_UNIT * 5,
    6: SPACING_UNIT * 6,
    7: SPACING_UNIT * 7,
    8: SPACING_UNIT * 8,
  },
  radius: {
    sm: 14,
    md: 14,
    lg: 16,
    xl: 16,
    xxl: 40,
    pill: 999,
  },
  typography: {
    display: {
      ...fonts.bold,
      fontSize: 44,
      lineHeight: 50,
      letterSpacing: -0.5,
    } as TextStyle,
    title: {
      ...fonts.bold,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.5,
    } as TextStyle,
    sectionTitle: {
      ...fonts.bold,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.5,
    } as TextStyle,
    cardTitle: {
      ...fonts.bold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.5,
    } as TextStyle,
    body: {
      ...fonts.regular,
      fontSize: 16,
      lineHeight: 24,
    } as TextStyle,
    bodySm: {
      ...fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    } as TextStyle,
    label: {
      ...fonts.semibold,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 1.8,
      textTransform: "uppercase",
    } as TextStyle,
    button: {
      ...fonts.semibold,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: -0.1,
    } as TextStyle,
  },
} as const;

export const HAIRLINE = Math.max(StyleSheet.hairlineWidth, 1);
export const SCREEN_SIDE_PADDING = spacing.lg;
export const SCREEN_SECTION_GAP = spacing.xl;
export const GLOBAL_VERTICAL_GAP = spacing.xl;
export const BREATHABLE_SECTION_GAP = DS.spacing[4];
export const GLASS_HEADER_CONTENT_GAP = DS.spacing[4];

export function subtleBorder(color: string = DS.colors.borderSubtle): ViewStyle {
  return {
    boxShadow: `inset 0px 0px 0px 1px ${color}`,
  };
}

export function ambientShadow(opacity = 0.04, radius = 15, y = 10): ViewStyle {
  void opacity;
  return {
    boxShadow: `0px ${y}px ${radius * 3}px ${DS.colors.shadow}`,
  };
}

export function organicRadii(topLeft = 40, other = 16): ViewStyle {
  return {
    borderTopLeftRadius: topLeft,
    borderTopRightRadius: other,
    borderBottomRightRadius: other,
    borderBottomLeftRadius: other,
    borderCurve: "continuous",
  };
}

export function floatingButton(active = true): ViewStyle {
  return {
    borderRadius: DS.radius.md,
    borderCurve: "continuous",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: active ? DS.colors.accent : DS.colors.surfaceRaised,
    ...(active ? ambientShadow(0.07, 15, 12) : subtleBorder(DS.colors.border)),
  };
}

export function surfaceCard(backgroundColor: string = DS.colors.surfaceRaised): ViewStyle {
  return {
    backgroundColor,
    ...organicRadii(),
    ...ambientShadow(),
  };
}

export function cardShadow(): ViewStyle {
  return ambientShadow();
}

export function glowShadow(color: string = DS.colors.accentGlow, blur = 28): ViewStyle {
  return {
    boxShadow: `0px 14px ${Math.max(blur, 18)}px ${color}`,
  };
}
