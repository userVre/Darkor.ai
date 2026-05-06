import {light} from "@/styles/theme";
import type {TextStyle} from "react-native";
import {fonts} from "../styles/typography";
import {DS} from "./design-system";

const DARK_ACTION_SURFACE = "rgba(17, 24, 39, 0.08)";
const DARK_ACTION_SURFACE_STRONG = "rgba(17, 24, 39, 0.14)";
const DARK_ACTION_BORDER = "rgba(17, 24, 39, 0.18)";
const DARK_ACTION_BORDER_STRONG = "rgba(17, 24, 39, 0.32)";

const heroTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 30,
  lineHeight: 36,
  letterSpacing: 0.3,
};

const sectionTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 28,
  lineHeight: 34,
  letterSpacing: 0.3,
};

const headerTitle: TextStyle = {
  ...fonts.bold,
  fontSize: 18,
  lineHeight: 22,
  letterSpacing: 0.3,
};

const headerSubtitle: TextStyle = {
  ...fonts.medium,
  fontSize: 12,
  lineHeight: 16,
  letterSpacing: 0.3,
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
    accentSurface: DARK_ACTION_SURFACE,
    accentSurfaceStrong: DARK_ACTION_SURFACE_STRONG,
    accentBorder: DARK_ACTION_BORDER,
    accentBorderStrong: DARK_ACTION_BORDER_STRONG,
    accentGlow: DARK_ACTION_BORDER_STRONG,
    accentGlowSoft: DARK_ACTION_SURFACE_STRONG,
    accentText: light.textInverse,
    progressTrack: light.border,
    disabledSurface: light.surfaceDisabled,
  },
  surfaces: {
    accent: DS.colors.accent,
    accentButton: DS.colors.accent,
    maskAction: DS.colors.accentStrong,
    hero: light.surfaceCardHigh,
    accentWash: DARK_ACTION_SURFACE,
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
