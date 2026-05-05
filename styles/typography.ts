export const fonts = {
  regular: { fontFamily: "Inter" as const, fontWeight: "400" as const },
  medium: { fontFamily: "Inter" as const, fontWeight: "500" as const },
  semibold: { fontFamily: "Inter" as const, fontWeight: "600" as const },
  bold: { fontFamily: "Inter" as const, fontWeight: "700" as const },
  premiumSerif: {
    fontFamily: process.env.EXPO_OS === "ios" ? "Georgia" as const : "serif" as const,
    fontWeight: "700" as const,
  },
};

export const textStyles = {
  h1: { ...fonts.premiumSerif, fontSize: 40, lineHeight: 48, letterSpacing: 0 },
  h2: { ...fonts.premiumSerif, fontSize: 32, lineHeight: 38, letterSpacing: 0 },
  h3: { ...fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: 0.3 },
  body: { ...fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { ...fonts.medium, fontSize: 16, lineHeight: 24 },
  caption: { ...fonts.regular, fontSize: 12, lineHeight: 18 },
  label: { ...fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textTransform: "uppercase" as const },
  button: { ...fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.3 },
};
