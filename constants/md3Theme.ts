import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperLightTheme,
  type MD3Theme,
} from "react-native-paper";

export const MD3_BRAND_SEED = "#E83A5A";

export const md3Shapes = {
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
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
} as const;

export const md3TypeScale = {
  displayLarge: { fontFamily: "Inter", fontWeight: "400", fontSize: 57, lineHeight: 64, letterSpacing: 0 },
  displayMedium: { fontFamily: "Inter", fontWeight: "400", fontSize: 45, lineHeight: 52, letterSpacing: 0 },
  displaySmall: { fontFamily: "Inter", fontWeight: "400", fontSize: 36, lineHeight: 44, letterSpacing: 0 },
  headlineLarge: { fontFamily: "Inter", fontWeight: "400", fontSize: 32, lineHeight: 40, letterSpacing: 0 },
  headlineMedium: { fontFamily: "Inter", fontWeight: "400", fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  headlineSmall: { fontFamily: "Inter", fontWeight: "400", fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  titleLarge: { fontFamily: "Inter", fontWeight: "400", fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  titleMedium: { fontFamily: "Inter", fontWeight: "500", fontSize: 16, lineHeight: 24, letterSpacing: 0 },
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
  primary: "#bb113d",
  onPrimary: "#ffffff",
  primaryContainer: "#ffdadb",
  onPrimaryContainer: "#40000e",
  secondary: "#765658",
  onSecondary: "#ffffff",
  secondaryContainer: "#ffdadb",
  onSecondaryContainer: "#2c1517",
  tertiary: "#775930",
  onTertiary: "#ffffff",
  tertiaryContainer: "#ffddb4",
  onTertiaryContainer: "#291800",
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#410002",
  background: "#fffbff",
  onBackground: "#201a1a",
  surface: "#fffbff",
  onSurface: "#201a1a",
  surfaceVariant: "#f4ddde",
  onSurfaceVariant: "#524344",
  surfaceDisabled: "rgba(32, 26, 26, 0.12)",
  onSurfaceDisabled: "rgba(32, 26, 26, 0.38)",
  outline: "#857373",
  outlineVariant: "#d7c1c2",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#362f2f",
  inverseOnSurface: "#fbeeed",
  inversePrimary: "#ffb2b7",
  backdrop: "rgba(47, 31, 35, 0.40)",
  elevation: {
    level0: "transparent",
    level1: "#fceff5",
    level2: "#fae8ef",
    level3: "#f8e1ea",
    level4: "#f7dfe8",
    level5: "#f5dae4",
  },
};

export const md3DarkColors: MD3Theme["colors"] = {
  primary: "#ffb2b7",
  onPrimary: "#67001c",
  primaryContainer: "#91002b",
  onPrimaryContainer: "#ffdadb",
  secondary: "#e6bdbe",
  onSecondary: "#44292b",
  secondaryContainer: "#5c3f41",
  onSecondaryContainer: "#ffdadb",
  tertiary: "#e7c08e",
  onTertiary: "#432c06",
  tertiaryContainer: "#5d421b",
  onTertiaryContainer: "#ffddb4",
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffb4ab",
  background: "#201a1a",
  onBackground: "#ece0df",
  surface: "#201a1a",
  onSurface: "#ece0df",
  surfaceVariant: "#524344",
  onSurfaceVariant: "#d7c1c2",
  surfaceDisabled: "rgba(236, 224, 223, 0.12)",
  onSurfaceDisabled: "rgba(236, 224, 223, 0.38)",
  outline: "#9f8c8d",
  outlineVariant: "#524344",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#ece0df",
  inverseOnSurface: "#362f2f",
  inversePrimary: "#bb113d",
  backdrop: "rgba(47, 31, 35, 0.40)",
  elevation: {
    level0: "transparent",
    level1: "#2b2222",
    level2: "#322627",
    level3: "#392b2b",
    level4: "#3b2c2d",
    level5: "#3f2f30",
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
