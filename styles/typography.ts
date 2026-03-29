export const fonts = {
  regular:  { fontFamily: 'Inter', fontWeight: '400' as const },
  medium:   { fontFamily: 'Inter', fontWeight: '500' as const },
  semibold: { fontFamily: 'Inter', fontWeight: '600' as const },
  bold:     { fontFamily: 'Inter', fontWeight: '700' as const },
  italic:   { fontFamily: 'Inter-Italic', fontWeight: '400' as const },
}

export const textStyles = {
  h1:      { ...fonts.bold,    fontSize: 32, lineHeight: 40 },
  h2:      { ...fonts.bold,    fontSize: 24, lineHeight: 32 },
  h3:      { ...fonts.semibold,fontSize: 20, lineHeight: 28 },
  body:    { ...fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMd:  { ...fonts.medium,  fontSize: 15, lineHeight: 22 },
  caption: { ...fonts.regular, fontSize: 12, lineHeight: 18 },
  label:   { ...fonts.semibold,fontSize: 13, lineHeight: 18 },
  button:  { ...fonts.semibold,fontSize: 16, lineHeight: 24 },
}
