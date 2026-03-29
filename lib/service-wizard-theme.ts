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
    background: DS.colors.background,
    surface: dark.surface,
    surfaceRaised: DS.colors.surfaceRaised,
    surfaceSoft: DS.colors.surface,
    surfaceOverlay: DS.colors.backgroundAlt,
    border: DS.colors.borderSubtle,
    borderStrong: DS.colors.borderStrong,
    textPrimary: DS.colors.textPrimary,
    textMuted: DS.colors.textMuted,
    textSoft: DS.colors.textSecondary,
    accent: DS.colors.accent,
    accentStrong: DS.colors.accentStrong,
    accentSecondary: DS.colors.accentSecondary,
    accentSurface: dark.surfaceHigh,
    accentSurfaceStrong: dark.surfaceHigh,
    accentBorder: dark.borderLight,
    accentBorderStrong: dark.brand,
    accentGlow: DS.colors.accentGlowStrong,
    accentGlowSoft: DS.colors.accentGlow,
    accentText: dark.textPrimary,
    progressTrack: dark.border,
    disabledSurface: dark.surfaceHigh,
  },
  surfaces: {
    accent: dark.brand,
    accentButton: dark.brand,
    maskAction: dark.brand,
    hero: dark.surface,
    accentWash: dark.surfaceHigh,
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
