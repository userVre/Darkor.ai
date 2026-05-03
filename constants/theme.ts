export const theme = {
  colors: {
    primary: "#00B4FF",
    primaryDark: "#0066FF",
    accent: "#E83A5A",
    accentDark: "#C0254A",
    gold: "#FFD700",
    success: "#2ECC71",
    background: "#0A0A0F",
    surface: "rgba(255,255,255,0.08)",
    surfaceBorder: "rgba(255,255,255,0.15)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.72)",
    textMuted: "rgba(255,255,255,0.40)",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 100,
  },
  typography: {
    hero: {
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -0.5,
      lineHeight: 38,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: -0.3,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "400",
      letterSpacing: 0.1,
      lineHeight: 22,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    body: {
      fontSize: 14,
      fontWeight: "400",
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: "400",
      lineHeight: 16,
    },
  },
  shadows: {
    blue: {
      shadowColor: "#00B4FF",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 12,
      shadowOpacity: 0.6,
      elevation: 8,
    },
    gold: {
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 12,
      shadowOpacity: 0.6,
      elevation: 8,
    },
    green: {
      shadowColor: "#2ECC71",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 12,
      shadowOpacity: 0.6,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;
export type ThemeColor = keyof Theme["colors"];
export type ThemeSpacing = keyof Theme["spacing"];
export type ThemeRadius = keyof Theme["borderRadius"];
export type ThemeTypography = keyof Theme["typography"];
export type ThemeShadow = keyof Theme["shadows"];

export default theme;
