import { dark, type Theme } from "./theme";

export function createButtonStyles(colors: Theme) {
  return {
    primary: {
      backgroundColor: colors.brand,
      borderRadius: 14,
      height: 56,
      paddingHorizontal: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    secondary: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 14,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    disabled: {
      opacity: 0.4,
    },
  };
}

export const buttonStyles = createButtonStyles(dark);
