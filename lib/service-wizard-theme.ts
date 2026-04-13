import type { TextStyle } from "react-native";
import { dark } from "@/styles/theme";
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
    background: dark.bg,
    surface: dark.surface,
    surfaceRaised: dark.surfaceHigh,
    surfaceSoft: dark.surfaceMuted,
    surfaceOverlay: dark.surfaceCard,
    border: dark.border,
    borderStrong: dark.borderLight,
    textPrimary: dark.textPrimary,
    textMuted: dark.textSecondary,
    textSoft: dark.textMuted,
    accent: DS.colors.accent,
    accentStrong: DS.colors.accentStrong,
    accentSecondary: DS.colors.accentSecondary,
    accentSurface: dark.brandSurface,
    accentSurfaceStrong: dark.brandSurfaceHigh,
    accentBorder: dark.brandBorder,
    accentBorderStrong: dark.brandBorderStrong,
    accentGlow: DS.colors.accentGlowStrong,
    accentGlowSoft: DS.colors.accentGlow,
    accentText: dark.textPrimary,
    progressTrack: dark.border,
    disabledSurface: dark.surfaceDisabled,
  },
  surfaces: {
    accent: dark.brand,
    accentButton: dark.brand,
    maskAction: dark.brand,
    hero: dark.surfaceCardHigh,
    accentWash: dark.brandSurface,
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
