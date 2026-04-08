import type { TextStyle } from "react-native";
import { light } from "@/styles/theme";
import { fonts } from "../styles/typography";
import { DS } from "./design-system";

const heroTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 30,
  lineHeight: 36,
  letterSpacing: -0.8,
};

const sectionTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 28,
  lineHeight: 34,
  letterSpacing: -0.7,
};

const headerTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 18,
  lineHeight: 22,
  letterSpacing: -0.35,
};

const headerSubtitle: TextStyle = {
  ...fonts.medium,
  fontSize: 12,
  lineHeight: 16,
  letterSpacing: 0.1,
};

const bodyText: TextStyle = {
  ...fonts.regular,
  fontSize: 15,
  lineHeight: 22,
};

const compactBodyText: TextStyle = {
  ...fonts.regular,
  fontSize: 14,
  lineHeight: 20,
};

export const SERVICE_WIZARD_THEME = {
  colors: {
    background: DS.colors.background,
    surface: "#FFFFFF",
    surfaceRaised: DS.colors.surfaceRaised,
    surfaceSoft: light.surface,
    surfaceOverlay: DS.colors.backgroundAlt,
    border: DS.colors.borderSubtle,
    borderStrong: DS.colors.borderStrong,
    textPrimary: DS.colors.textPrimary,
    textMuted: DS.colors.textMuted,
    textSoft: DS.colors.textSecondary,
    accent: DS.colors.accent,
    accentStrong: DS.colors.accentStrong,
    accentSecondary: DS.colors.accentSecondary,
    accentSurface: light.brandSurface,
    accentSurfaceStrong: light.brandSurfaceHigh,
    accentBorder: light.brandBorder,
    accentBorderStrong: light.brandDark,
    accentGlow: DS.colors.accentGlowStrong,
    accentGlowSoft: DS.colors.accentGlow,
    accentText: light.textPrimary,
    progressTrack: light.border,
    disabledSurface: light.surfaceHigh,
  },
  surfaces: {
    accent: light.brand,
    accentButton: light.brand,
    maskAction: light.brand,
    hero: "#FFFFFF",
    accentWash: light.brandSurface,
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
