import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { light } from "@/styles/theme";
import { spacing } from "../styles/spacing";
import { fonts } from "../styles/typography";

const SPACING_UNIT = spacing.sm;

export const DS = {
  colors: {
    background: light.bg,
    backgroundAlt: light.surface,
    surface: light.surface,
    surfaceRaised: "#FFFFFF",
    surfaceMuted: light.surfaceMuted,
    surfaceOverlay: "#FFFFFF",
    borderSubtle: light.border,
    border: light.border,
    borderStrong: light.borderLight,
    textPrimary: light.textPrimary,
    textSecondary: light.textSecondary,
    textTertiary: light.textMuted,
    textMuted: light.textMuted,
    accent: light.brand,
    accentStrong: light.brandDark,
    accentSecondary: light.brand,
    accentGlow: light.brandSoft,
    accentGlowStrong: light.brand,
    accentSurface: light.brandSurface,
    positive: light.success,
    danger: light.error,
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
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
    pill: 999,
  },
  typography: {
    display: {
      ...fonts.bold,
      fontSize: 40,
      lineHeight: 46,
      letterSpacing: -1.2,
    } as TextStyle,
    title: {
      ...fonts.bold,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.9,
    } as TextStyle,
    sectionTitle: {
      ...fonts.bold,
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.6,
    } as TextStyle,
    cardTitle: {
      ...fonts.bold,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.35,
    } as TextStyle,
    body: {
      ...fonts.regular,
      fontSize: 15,
      lineHeight: 22,
    } as TextStyle,
    bodySm: {
      ...fonts.regular,
      fontSize: 13,
      lineHeight: 19,
    } as TextStyle,
    label: {
      ...fonts.semibold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    } as TextStyle,
    button: {
      ...fonts.semibold,
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0.1,
    } as TextStyle,
  },
} as const;

export const HAIRLINE = Math.max(StyleSheet.hairlineWidth, 1);
export const SCREEN_SIDE_PADDING = spacing.lg;
export const SCREEN_SECTION_GAP = spacing.xl;

export function subtleBorder(color: string = DS.colors.borderSubtle): ViewStyle {
  return {
    borderWidth: HAIRLINE,
    borderColor: color,
  };
}

export function surfaceCard(backgroundColor: string = DS.colors.surfaceRaised): ViewStyle {
  return {
    backgroundColor,
    borderRadius: DS.radius.xl,
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
  };
}

export function cardShadow(): ViewStyle {
  return {
    shadowColor: light.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  };
}

export function glowShadow(color: string = DS.colors.accentGlow, blur = 28): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: Math.max(blur / 3, 6),
    elevation: 1,
  };
}
