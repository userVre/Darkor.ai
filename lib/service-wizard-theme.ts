import {light} from "@/styles/theme";
import type {TextStyle} from "react-native";
import {fonts} from "../styles/typography";
import {DS} from "./design-system";

const EXPRESSIVE_ACTION_SURFACE = light.paperTheme.colors.primaryContainer;
const EXPRESSIVE_ACTION_SURFACE_STRONG = light.paperTheme.colors.secondaryContainer;
const EXPRESSIVE_ACTION_BORDER = light.paperTheme.colors.outlineVariant;
const EXPRESSIVE_ACTION_BORDER_STRONG = "rgba(63, 94, 251, 0.32)";

const heroTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 30,
  lineHeight: 36,
  letterSpacing: 0,
};

const sectionTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 28,
  lineHeight: 34,
  letterSpacing: 0,
};

const headerTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 18,
  lineHeight: 22,
  letterSpacing: 0,
};

const headerSubtitle: TextStyle = {
  ...fonts.medium,
  fontSize: 12,
  lineHeight: 16,
  letterSpacing: 0,
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
    accentSurface: EXPRESSIVE_ACTION_SURFACE,
    accentSurfaceStrong: EXPRESSIVE_ACTION_SURFACE_STRONG,
    accentBorder: EXPRESSIVE_ACTION_BORDER,
    accentBorderStrong: EXPRESSIVE_ACTION_BORDER_STRONG,
    accentGlow: EXPRESSIVE_ACTION_BORDER_STRONG,
    accentGlowSoft: EXPRESSIVE_ACTION_SURFACE_STRONG,
    accentText: light.textInverse,
    progressTrack: light.border,
    disabledSurface: light.surfaceDisabled,
  },
  surfaces: {
    accent: DS.colors.accent,
    accentButton: DS.colors.accent,
    maskAction: DS.colors.accentStrong,
    hero: light.surfaceCardHigh,
    accentWash: EXPRESSIVE_ACTION_SURFACE,
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
