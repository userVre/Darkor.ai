export const fonts = {
  regular: { fontFamily: undefined as string | undefined, fontWeight: "400" as const },
  medium: { fontFamily: undefined as string | undefined, fontWeight: "500" as const },
  semibold: { fontFamily: undefined as string | undefined, fontWeight: "600" as const },
  bold: { fontFamily: undefined as string | undefined, fontWeight: "700" as const },
  italic: {
    fontFamily: undefined as string | undefined,
    fontWeight: "400" as const,
    fontStyle: "italic" as const,
  },
};

export const textStyles = {
  h1: { ...fonts.bold, fontSize: 40, lineHeight: 48, letterSpacing: -1.2 },
  h2: { ...fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.9 },
  h3: { ...fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.45 },
  body: { ...fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { ...fonts.medium, fontSize: 16, lineHeight: 24 },
  caption: { ...fonts.regular, fontSize: 12, lineHeight: 18 },
  label: { ...fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.6, textTransform: "uppercase" as const },
  button: { ...fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
};
