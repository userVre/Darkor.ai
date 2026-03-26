import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

const SPACING_UNIT = 8;

export const DS = {
  colors: {
    background: "#000000",
    backgroundAlt: "#030304",
    surface: "#08090B",
    surfaceRaised: "#0D0E12",
    surfaceMuted: "#111317",
    surfaceOverlay: "rgba(7,8,10,0.88)",
    borderSubtle: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.12)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.74)",
    textTertiary: "rgba(255,255,255,0.48)",
    textMuted: "#A7ACB5",
    accent: "#A855F7",
    accentStrong: "#C084FC",
    accentSecondary: "#6366F1",
    accentGlow: "rgba(168,85,247,0.10)",
    accentGlowStrong: "rgba(168,85,247,0.16)",
    accentSurface: "rgba(168,85,247,0.14)",
    positive: "#34D399",
    danger: "#F87171",
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
      fontSize: 40,
      fontWeight: "800",
      lineHeight: 46,
      letterSpacing: -1.2,
    } as TextStyle,
    title: {
      fontSize: 32,
      fontWeight: "800",
      lineHeight: 38,
      letterSpacing: -0.9,
    } as TextStyle,
    sectionTitle: {
      fontSize: 26,
      fontWeight: "800",
      lineHeight: 32,
      letterSpacing: -0.6,
    } as TextStyle,
    cardTitle: {
      fontSize: 20,
      fontWeight: "700",
      lineHeight: 24,
      letterSpacing: -0.35,
    } as TextStyle,
    body: {
      fontSize: 15,
      fontWeight: "400",
      lineHeight: 22,
    } as TextStyle,
    bodySm: {
      fontSize: 13,
      fontWeight: "400",
      lineHeight: 19,
    } as TextStyle,
    label: {
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 16,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    } as TextStyle,
    button: {
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 18,
      letterSpacing: 0.1,
    } as TextStyle,
  },
} as const;

export const HAIRLINE = Math.max(StyleSheet.hairlineWidth, 1);
export const SCREEN_SIDE_PADDING = DS.spacing[3];
export const SCREEN_SECTION_GAP = DS.spacing[4];

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
    boxShadow: "0px 18px 48px rgba(0,0,0,0.38)",
  };
}

export function glowShadow(color: string = DS.colors.accentGlow, blur = 28): ViewStyle {
  return {
    boxShadow: `0px 0px ${blur}px ${color}`,
  };
}
