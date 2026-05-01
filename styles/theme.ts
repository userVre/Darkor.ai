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

function createTheme(palette: typeof lightPalette) {
  return {
    bg: palette.slate.slate1,
    surface: palette.slate.slate2,
    surfaceHigh: palette.slate.slate3,
    surfaceMuted: palette.slate.slate4,
    surfaceOverlay: palette.slate.slate2,
    surfaceOverlayHigh: palette.slate.slate3,
    surfaceCard: palette.slate.slate3,
    surfaceCardHigh: palette.slate.slate2,
    surfaceSelected: palette.indigo.indigo3,
    surfaceDisabled: palette.slate.slate5,

    textPrimary: palette.slate.slate12,
    textSecondary: palette.slate.slate11,
    textMuted: palette.slate.slate10,
    textInverse: palette.slate.slate1,
    textBrand: palette.slate.slate1,
    textSuccess: palette.indigo.indigo11,
    textWarning: palette.ruby.ruby11,
    textError: palette.ruby.ruby11,

    brand: palette.indigo.indigo9,
    brandDark: palette.indigo.indigo10,
    brandSoft: palette.indigo.indigo4,
    brandSurface: palette.indigo.indigo3,
    brandSurfaceHigh: palette.indigo.indigo4,
    brandBorder: palette.indigo.indigo9,
    brandBorderStrong: palette.indigo.indigo10,

    success: palette.indigo.indigo9,
    warning: palette.ruby.ruby9,
    error: palette.ruby.ruby11,
    successSurface: palette.indigo.indigo3,
    successSurfaceHigh: palette.indigo.indigo4,
    warningSurface: palette.ruby.ruby3,
    warningSurfaceHigh: palette.ruby.ruby4,
    errorSurface: palette.ruby.ruby3,
    errorSurfaceHigh: palette.ruby.ruby4,

    border: palette.slate.slate7,
    borderLight: palette.slate.slate8,
    shadow: palette.slate.slate8,
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
  const scheme = useColorScheme();
  return (scheme === "dark" ? dark : light) as Theme;
}
