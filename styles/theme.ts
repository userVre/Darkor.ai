import { indigo, indigoDark, ruby, rubyDark, slate, slateDark } from "@radix-ui/colors";
import { useColorScheme } from "react-native";

const lightPalette = {
  slate,
  ruby,
  indigo,
} as const;

const darkPalette = {
  slate: slateDark,
  ruby: rubyDark,
  indigo: indigoDark,
} as const;

const appPalette = {
  background: "#FFFFFF",
  surface: "#F9F9F9",
  surfaceHigh: "#F3F4F6",
  purple: "#7B61FF",
  purpleDark: "#5B46E8",
  purpleSoft: "rgba(123, 97, 255, 0.12)",
  purpleSurface: "rgba(123, 97, 255, 0.08)",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  border: "rgba(17, 24, 39, 0.1)",
  borderStrong: "rgba(123, 97, 255, 0.26)",
  shadow: "rgba(17, 24, 39, 0.12)",
} as const;

function createTheme(palette: typeof lightPalette) {
  return {
    bg: appPalette.background,
    surface: appPalette.surface,
    surfaceHigh: appPalette.surfaceHigh,
    surfaceMuted: "rgba(17, 24, 39, 0.04)",
    surfaceOverlay: "rgba(255, 255, 255, 0.96)",
    surfaceOverlayHigh: "#FFFFFF",
    surfaceCard: appPalette.background,
    surfaceCardHigh: appPalette.surface,
    surfaceSelected: appPalette.purpleSurface,
    surfaceDisabled: "rgba(17, 24, 39, 0.05)",

    textPrimary: appPalette.textPrimary,
    textSecondary: appPalette.textSecondary,
    textMuted: appPalette.textMuted,
    textInverse: "#FFFFFF",
    textBrand: appPalette.purple,
    textSuccess: "#16A34A",
    textWarning: palette.ruby.ruby11,
    textError: palette.ruby.ruby11,

    brand: appPalette.purple,
    brandDark: appPalette.purpleDark,
    brandSoft: appPalette.purpleSoft,
    brandSurface: appPalette.purpleSurface,
    brandSurfaceHigh: "rgba(123, 97, 255, 0.16)",
    brandBorder: "rgba(123, 97, 255, 0.18)",
    brandBorderStrong: appPalette.borderStrong,

    success: "#22C55E",
    warning: palette.ruby.ruby9,
    error: palette.ruby.ruby11,
    successSurface: "rgba(34, 197, 94, 0.1)",
    successSurfaceHigh: "rgba(34, 197, 94, 0.16)",
    warningSurface: palette.ruby.ruby3,
    warningSurfaceHigh: palette.ruby.ruby4,
    errorSurface: palette.ruby.ruby3,
    errorSurfaceHigh: palette.ruby.ruby4,

    border: appPalette.border,
    borderLight: appPalette.borderStrong,
    shadow: appPalette.shadow,
  } as const;
}

export const dark = createTheme(darkPalette);
export const light = createTheme(lightPalette);

export const palette = {
  sageGreen: slate.slate8,
  midnightNavy: slate.slate11,
  terracottaGlow: ruby.ruby8,
  dustyRose: ruby.ruby7,
  galleryCharcoal: slate.slate10,
  softIvory: slate.slate3,
  oliveGrove: slate.slate9,
  lavenderMist: indigo.indigo7,
  pearlGray: slate.slate6,
  fuchsiaVeil: ruby.ruby9,
  indigoBloom: indigo.indigo9,
  terracotta: ruby.ruby10,
  sage: slate.slate9,
  navy: indigo.indigo10,
  warmSand: ruby.ruby6,
  graphite: slate.slate11,
  softCream: slate.slate2,
  coralClay: ruby.ruby8,
  oliveMoss: slate.slate10,
  skyBlue: indigo.indigo8,
  merlot: ruby.ruby11,
  wallSageGreen: slate.slate8,
  wallNavyBlue: indigo.indigo11,
  wallTerracotta: ruby.ruby9,
  wallSoftIvory: slate.slate3,
  wallCharcoal: slate.slate11,
  wallMistBlue: indigo.indigo7,
  materialWalnutDark: slate.slate12,
  materialWalnutMid: slate.slate10,
  materialWalnutLight: slate.slate8,
  materialStoneLight: slate.slate3,
  materialStoneMid: slate.slate6,
  materialStoneDark: slate.slate9,
  materialSlateDark: slate.slate11,
  materialSlateMid: slate.slate9,
  materialSlateLight: slate.slate7,
  materialOakDark: slate.slate10,
  materialOakMid: slate.slate8,
  materialOakLight: slate.slate6,
  previewWarmWall: ruby.ruby6,
  previewWarmFloor: slate.slate10,
  previewWarmSofa: slate.slate5,
  previewWarmAccent: ruby.ruby9,
  previewBrandFloor: indigo.indigo11,
  previewBrandSofa: ruby.ruby8,
  previewBrandAccent: ruby.ruby9,
} as const;

export const radix = {
  light: lightPalette,
  dark: darkPalette,
} as const;

export type Theme = typeof dark;

export function useTheme(): Theme {
  useColorScheme();
  return light as Theme;
}
