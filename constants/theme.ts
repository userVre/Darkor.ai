export const theme = {
  colors: {
    primary: "#7B61FF",
    primaryDark: "#5B46E8",
    accent: "#5AC8FA",
    accentDark: "#1BA7E8",
    premiumBlue: "#5AC8FA",
    success: "#2ECC71",
    background: "#FFFFFF",
    surface: "#F9F9F9",
    surfaceBorder: "rgba(123,97,255,0.18)",
    textPrimary: "#111827",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
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
      letterSpacing: 0,
      lineHeight: 38,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: 0,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "400",
      letterSpacing: 0,
      lineHeight: 22,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0,
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
      shadowColor: "#5AC8FA",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 12,
      shadowOpacity: 0.6,
      elevation: 8,
    },
    premiumBlue: {
      shadowColor: "#7B61FF",
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
