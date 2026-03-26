import type { TextStyle } from "react-native";

const heroTitle: TextStyle = {
  fontSize: 28,
  fontWeight: "800",
  letterSpacing: -0.8,
};

const sectionTitle: TextStyle = {
  fontSize: 34,
  fontWeight: "700",
  letterSpacing: -1.1,
};

const headerTitle: TextStyle = {
  fontSize: 19,
  fontWeight: "800",
  letterSpacing: -0.35,
};

const headerSubtitle: TextStyle = {
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 0.2,
};

const bodyText: TextStyle = {
  fontSize: 15,
  lineHeight: 24,
};

const compactBodyText: TextStyle = {
  fontSize: 14,
  lineHeight: 22,
};

export const SERVICE_WIZARD_THEME = {
  colors: {
    background: "#000000",
    surface: "rgba(255,255,255,0.04)",
    surfaceRaised: "#08080A",
    surfaceSoft: "#0B0B0E",
    surfaceOverlay: "#050506",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.12)",
    textPrimary: "#ffffff",
    textMuted: "#a1a1aa",
    textSoft: "#d4d4d8",
    accent: "#d946ef",
    accentStrong: "#c026d3",
    accentSecondary: "#7c3aed",
    accentSurface: "rgba(217,70,239,0.1)",
    accentSurfaceStrong: "rgba(217,70,239,0.14)",
    accentBorder: "rgba(217,70,239,0.28)",
    accentBorderStrong: "rgba(217,70,239,0.42)",
    accentGlow: "rgba(217,70,239,0.22)",
    accentGlowSoft: "rgba(217,70,239,0.18)",
    accentText: "#f5d0fe",
    progressTrack: "rgba(255,255,255,0.14)",
    disabledSurface: "rgba(39,39,42,0.92)",
  },
  gradients: {
    accent: ["#d946ef", "#ec4899", "#7c3aed"] as const,
    accentButton: ["#d946ef", "#c026d3"] as const,
    hero: ["#111113", "#050506"] as const,
    accentWash: ["rgba(217,70,239,0.16)", "rgba(255,255,255,0.04)"] as const,
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
