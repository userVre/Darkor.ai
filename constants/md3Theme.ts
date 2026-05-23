import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperLightTheme,
  type MD3Theme,
} from "react-native-paper";

export const MD3_BRAND_SEED = "#3F5EFB";

export const md3Shapes = {
  extraSmall: 8,
  small: 12,
  medium: 16,
  large: 24,
  extraLarge: 32,
  full: 1000,
} as const;

export const md3Spacing = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 24,
  doubleExtraLarge: 32,
  tripleExtraLarge: 40,
  quadrupleExtraLarge: 48,
  related: 8,
  group: 16,
  section: 24,
  screen: 24,
} as const;

export const md3TypeScale = {
  displayLarge: { fontFamily: "Inter", fontWeight: "600", fontSize: 57, lineHeight: 64, letterSpacing: 0 },
  displayMedium: { fontFamily: "Inter", fontWeight: "600", fontSize: 45, lineHeight: 52, letterSpacing: 0 },
  displaySmall: { fontFamily: "Inter", fontWeight: "600", fontSize: 36, lineHeight: 44, letterSpacing: 0 },
  headlineLarge: { fontFamily: "Inter", fontWeight: "600", fontSize: 32, lineHeight: 40, letterSpacing: 0 },
  headlineMedium: { fontFamily: "Inter", fontWeight: "600", fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  headlineSmall: { fontFamily: "Inter", fontWeight: "600", fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  titleLarge: { fontFamily: "Inter", fontWeight: "600", fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  titleMedium: { fontFamily: "Inter", fontWeight: "600", fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  titleSmall: { fontFamily: "Inter", fontWeight: "500", fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodyLarge: { fontFamily: "Inter", fontWeight: "400", fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMedium: { fontFamily: "Inter", fontWeight: "400", fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodySmall: { fontFamily: "Inter", fontWeight: "400", fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  labelLarge: { fontFamily: "Inter", fontWeight: "500", fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  labelMedium: { fontFamily: "Inter", fontWeight: "500", fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  labelSmall: { fontFamily: "Inter", fontWeight: "500", fontSize: 11, lineHeight: 16, letterSpacing: 0 },
  default: { fontFamily: "Inter", fontWeight: "400", letterSpacing: 0 },
} satisfies MD3Theme["fonts"];

export const md3LightColors: MD3Theme["colors"] = {
  primary: "#3F5EFB",
  onPrimary: "#ffffff",
  primaryContainer: "#DDE2FF",
  onPrimaryContainer: "#001452",
  secondary: "#006A60",
  onSecondary: "#ffffff",
  secondaryContainer: "#9FF2E4",
  onSecondaryContainer: "#00201C",
  tertiary: "#984061",
  onTertiary: "#ffffff",
  tertiaryContainer: "#FFD9E4",
  onTertiaryContainer: "#3E001D",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#410002",
  background: "#FCFBFF",
  onBackground: "#1A1B20",
  surface: "#FCFBFF",
  onSurface: "#1A1B20",
  surfaceVariant: "#E2E2EC",
  onSurfaceVariant: "#45464F",
  surfaceDisabled: "rgba(26, 27, 32, 0.12)",
  onSurfaceDisabled: "rgba(26, 27, 32, 0.38)",
  outline: "#757680",
  outlineVariant: "#C6C6D0",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#2F3036",
  inverseOnSurface: "#F1F0F7",
  inversePrimary: "#B7C4FF",
  backdrop: "rgba(22, 24, 31, 0.40)",
  elevation: {
    level0: "transparent",
    level1: "#F2F3FF",
    level2: "#EBEFFF",
    level3: "#E5EAFF",
    level4: "#E2E7FF",
    level5: "#DDE2FF",
  },
};

export const md3DarkColors: MD3Theme["colors"] = {
  primary: "#B7C4FF",
  onPrimary: "#002783",
  primaryContainer: "#1F43D7",
  onPrimaryContainer: "#DDE2FF",
  secondary: "#83D5C8",
  onSecondary: "#003731",
  secondaryContainer: "#005047",
  onSecondaryContainer: "#9FF2E4",
  tertiary: "#FFB0C8",
  onTertiary: "#5E1132",
  tertiaryContainer: "#7B2949",
  onTertiaryContainer: "#FFD9E4",
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffb4ab",
  background: "#121318",
  onBackground: "#E4E2EA",
  surface: "#121318",
  onSurface: "#E4E2EA",
  surfaceVariant: "#45464F",
  onSurfaceVariant: "#C6C6D0",
  surfaceDisabled: "rgba(228, 226, 234, 0.12)",
  onSurfaceDisabled: "rgba(228, 226, 234, 0.38)",
  outline: "#90919A",
  outlineVariant: "#45464F",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#E4E2EA",
  inverseOnSurface: "#2F3036",
  inversePrimary: "#3F5EFB",
  backdrop: "rgba(22, 24, 31, 0.52)",
  elevation: {
    level0: "transparent",
    level1: "#1C1D24",
    level2: "#222532",
    level3: "#282D40",
    level4: "#2B3048",
    level5: "#303653",
  },
};

export const md3LightTheme: MD3Theme = {
  ...PaperLightTheme,
  version: 3,
  isV3: true,
  dark: false,
  roundness: md3Shapes.small,
  colors: md3LightColors,
  fonts: md3TypeScale,
  animation: {
    scale: 1,
    defaultAnimationDuration: 250,
  },
};

export const md3DarkTheme: MD3Theme = {
  ...PaperDarkTheme,
  version: 3,
  isV3: true,
  dark: true,
  mode: "adaptive",
  roundness: md3Shapes.small,
  colors: md3DarkColors,
  fonts: md3TypeScale,
  animation: {
    scale: 1,
    defaultAnimationDuration: 250,
  },
};

export const md3Elevation = {
  level1: {
    elevation: 1,
    surfaceTintOpacity: 0.05,
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.30), 0px 1px 3px rgba(0, 0, 0, 0.15)",
  },
  level2: {
    elevation: 2,
    surfaceTintOpacity: 0.08,
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.30), 0px 2px 6px rgba(0, 0, 0, 0.15)",
  },
  level3: {
    elevation: 3,
    surfaceTintOpacity: 0.11,
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.30), 0px 4px 8px rgba(0, 0, 0, 0.15)",
  },
  level4: {
    elevation: 4,
    surfaceTintOpacity: 0.12,
    boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.30), 0px 6px 10px rgba(0, 0, 0, 0.15)",
  },
  level5: {
    elevation: 5,
    surfaceTintOpacity: 0.14,
    boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.30), 0px 8px 12px rgba(0, 0, 0, 0.15)",
  },
} as const;

export function getMd3Theme(mode: "light" | "dark") {
  return mode === "dark" ? md3DarkTheme : md3LightTheme;
}
