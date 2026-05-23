import AsyncStorage from "@react-native-async-storage/async-storage";
import {indigo, indigoDark, ruby, rubyDark, slate, slateDark} from "@radix-ui/colors";
import React from "react";
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from "react";
import {PaperProvider, type MD3Theme} from "react-native-paper";

import {getMd3Theme} from "../constants/md3Theme";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "homedecor:theme-mode";

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

function createTheme(mode: ThemeMode) {
  const isDark = mode === "dark";
  const paperTheme = getMd3Theme(mode);
  const md3 = paperTheme.colors;

  return {
    mode,
    isDark,
    paperTheme,
    bg: md3.background,
    surface: md3.surface,
    surfaceHigh: md3.elevation.level1,
    surfaceMuted: md3.surfaceVariant,
    surfaceOverlay: md3.elevation.level2,
    surfaceOverlayHigh: md3.elevation.level3,
    surfaceCard: md3.elevation.level1,
    surfaceCardHigh: md3.elevation.level2,
    surfaceSelected: md3.secondaryContainer,
    surfaceDisabled: md3.surfaceDisabled,

    textPrimary: md3.onBackground,
    textSecondary: md3.onSurfaceVariant,
    textMuted: md3.outline,
    textInverse: md3.inverseOnSurface,
    textBrand: md3.primary,
    textSuccess: isDark ? "#7fdc8a" : "#246b35",
    textWarning: md3.tertiary,
    textError: md3.error,

    brand: md3.primary,
    brandDark: md3.primaryContainer,
    brandSoft: md3.primaryContainer,
    brandSurface: md3.secondaryContainer,
    brandSurfaceHigh: md3.tertiaryContainer,
    brandBorder: md3.outlineVariant,
    brandBorderStrong: md3.outline,

    success: isDark ? "#7fdc8a" : "#246b35",
    warning: md3.tertiary,
    error: md3.error,
    successSurface: isDark ? "#16371e" : "#d7f8d6",
    successSurfaceHigh: isDark ? "#214b2a" : "#bfedbf",
    warningSurface: md3.tertiaryContainer,
    warningSurfaceHigh: md3.tertiaryContainer,
    errorSurface: md3.errorContainer,
    errorSurfaceHigh: md3.errorContainer,

    border: md3.outlineVariant,
    borderLight: md3.outline,
    shadow: isDark ? "rgba(0, 0, 0, 0.50)" : "rgba(0, 0, 0, 0.18)",
  } as const;
}

export const light = createTheme("light");
export const dark = createTheme("dark");

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

export type Theme = ReturnType<typeof createTheme>;

type ThemeContextValue = Theme & {
  paperTheme: MD3Theme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  ...light,
  paperTheme: getMd3Theme("light"),
  setThemeMode: () => undefined,
  toggleThemeMode: () => undefined,
});

export function AppThemeProvider({children}: {children: ReactNode}) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedMode) => {
      if (!mounted) return;
      if (storedMode === "dark" || storedMode === "light") {
        setMode(storedMode);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setMode((current) => {
      const nextMode = current === "dark" ? "light" : "dark";
      void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
      return nextMode;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...(mode === "dark" ? dark : light),
      paperTheme: getMd3Theme(mode),
      setThemeMode,
      toggleThemeMode,
    }),
    [mode, setThemeMode, toggleThemeMode],
  );

  return React.createElement(
    ThemeContext.Provider,
    {value},
    React.createElement(PaperProvider, {theme: value.paperTheme, children}),
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
