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
    background: light.bg,
    surface: light.surface,
    surfaceRaised: light.surfaceHigh,
    surfaceSoft: light.surfaceMuted,
    surfaceOverlay: light.surfaceCard,
    border: light.border,
    borderStrong: light.borderLight,
    textPrimary: light.textPrimary,
    textMuted: light.textSecondary,
    textSoft: light.textMuted,
    accent: DS.colors.accent,
    accentStrong: DS.colors.accentStrong,
    accentSecondary: DS.colors.accentSecondary,
    accentSurface: light.brandSurface,
    accentSurfaceStrong: light.brandSurfaceHigh,
    accentBorder: light.brandBorder,
    accentBorderStrong: light.brandBorderStrong,
    accentGlow: light.brandBorderStrong,
    accentGlowSoft: light.brandSurfaceHigh,
    accentText: light.textInverse,
    progressTrack: light.border,
    disabledSurface: light.surfaceDisabled,
  },
  surfaces: {
    accent: light.brand,
    accentButton: light.brand,
    maskAction: light.brandDark,
    hero: light.surfaceCardHigh,
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
