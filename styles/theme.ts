import AsyncStorage from "@react-native-async-storage/async-storage";
import {indigo, indigoDark, ruby, rubyDark, slate, slateDark} from "@radix-ui/colors";
import React from "react";
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from "react";

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

  return {
    mode,
    isDark,
    bg: isDark ? "#0A0A0F" : "#FFFFFF",
    surface: isDark ? "#111119" : "#F9FAFB",
    surfaceHigh: isDark ? "#181820" : "#F3F4F6",
    surfaceMuted: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 24, 39, 0.04)",
    surfaceOverlay: isDark ? "rgba(10, 10, 15, 0.96)" : "rgba(255, 255, 255, 0.96)",
    surfaceOverlayHigh: isDark ? "#181820" : "#FFFFFF",
    surfaceCard: isDark ? "rgba(255, 255, 255, 0.06)" : "#FFFFFF",
    surfaceCardHigh: isDark ? "rgba(255, 255, 255, 0.08)" : "#F9FAFB",
    surfaceSelected: isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(17, 24, 39, 0.08)",
    surfaceDisabled: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 24, 39, 0.05)",

    textPrimary: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "rgba(255, 255, 255, 0.68)" : "#4B5563",
    textMuted: isDark ? "rgba(255, 255, 255, 0.45)" : "#6B7280",
    textInverse: isDark ? "#111827" : "#FFFFFF",
    textBrand: "#111111",
    textSuccess: isDark ? "#4ADE80" : "#16A34A",
    textWarning: isDark ? rubyDark.ruby11 : ruby.ruby11,
    textError: isDark ? "#FF6B66" : ruby.ruby11,

    brand: "#111111",
    brandDark: "#050505",
    brandSoft: isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(17, 24, 39, 0.10)",
    brandSurface: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 24, 39, 0.08)",
    brandSurfaceHigh: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(17, 24, 39, 0.14)",
    brandBorder: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(17, 24, 39, 0.18)",
    brandBorderStrong: isDark ? "rgba(255, 255, 255, 0.32)" : "rgba(17, 24, 39, 0.32)",

    success: "#22C55E",
    warning: isDark ? rubyDark.ruby9 : ruby.ruby9,
    error: isDark ? "#FF6B66" : ruby.ruby11,
    successSurface: isDark ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.10)",
    successSurfaceHigh: isDark ? "rgba(34, 197, 94, 0.22)" : "rgba(34, 197, 94, 0.16)",
    warningSurface: isDark ? rubyDark.ruby3 : ruby.ruby3,
    warningSurfaceHigh: isDark ? rubyDark.ruby4 : ruby.ruby4,
    errorSurface: isDark ? "rgba(255, 107, 102, 0.12)" : ruby.ruby3,
    errorSurfaceHigh: isDark ? "rgba(255, 107, 102, 0.18)" : ruby.ruby4,

    border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 24, 39, 0.10)",
    borderLight: isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(17, 24, 39, 0.16)",
    shadow: isDark ? "rgba(0, 0, 0, 0.38)" : "rgba(17, 24, 39, 0.12)",
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
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  ...light,
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
      setThemeMode,
      toggleThemeMode,
    }),
    [mode, setThemeMode, toggleThemeMode],
  );

  return React.createElement(ThemeContext.Provider, {value}, children);
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
