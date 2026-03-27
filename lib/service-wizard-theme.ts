import type { TextStyle } from "react-native";
import { DS } from "./design-system";

const heroTitle: TextStyle = {
  fontSize: 30,
  fontWeight: "800",
  lineHeight: 36,
  letterSpacing: -0.8,
};

const sectionTitle: TextStyle = {
  fontSize: 28,
  fontWeight: "800",
  lineHeight: 34,
  letterSpacing: -0.7,
};

const headerTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "800",
  lineHeight: 22,
  letterSpacing: -0.35,
};

const headerSubtitle: TextStyle = {
  fontSize: 12,
  fontWeight: "500",
  lineHeight: 16,
  letterSpacing: 0.1,
};

const bodyText: TextStyle = {
  fontSize: 15,
  fontWeight: "400",
  lineHeight: 22,
};

const compactBodyText: TextStyle = {
  fontSize: 14,
  fontWeight: "400",
  lineHeight: 20,
};

export const SERVICE_WIZARD_THEME = {
  colors: {
    background: DS.colors.background,
    surface: "rgba(255,255,255,0.03)",
    surfaceRaised: DS.colors.surfaceRaised,
    surfaceSoft: DS.colors.surface,
    surfaceOverlay: DS.colors.backgroundAlt,
    border: DS.colors.borderSubtle,
    borderStrong: DS.colors.border,
    textPrimary: DS.colors.textPrimary,
    textMuted: DS.colors.textMuted,
    textSoft: DS.colors.textSecondary,
    accent: DS.colors.accent,
    accentStrong: DS.colors.accentStrong,
    accentSecondary: DS.colors.accentSecondary,
    accentSurface: "rgba(168,85,247,0.10)",
    accentSurfaceStrong: "rgba(168,85,247,0.14)",
    accentBorder: "rgba(192,132,252,0.22)",
    accentBorderStrong: "rgba(192,132,252,0.34)",
    accentGlow: DS.colors.accentGlowStrong,
    accentGlowSoft: DS.colors.accentGlow,
    accentText: "#F2D8FF",
    progressTrack: "rgba(255,255,255,0.08)",
    disabledSurface: "rgba(30,31,35,0.92)",
  },
  gradients: {
    accent: ["#A855F7", "#8B5CF6", "#6366F1"] as const,
    accentButton: ["#A855F7", "#7C3AED"] as const,
    maskAction: ["#FF2FA8", "#D946EF"] as const,
    hero: ["#111217", "#060608"] as const,
    accentWash: ["rgba(168,85,247,0.12)", "rgba(255,255,255,0.03)"] as const,
  },
  typography: {
    heroTitle,
    sectionTitle,
    headerTitle,
    headerSubtitle,
    bodyText,
    compactBodyText,
  },
} as const;
