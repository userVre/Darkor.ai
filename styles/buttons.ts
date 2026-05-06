import { dark, type Theme } from "./theme";

const DARK_ACTION = "#111111";

export function createButtonStyles(colors: Theme) {
  return {
    primary: {
      backgroundColor: DARK_ACTION,
      borderRadius: 14,
      height: 56,
      paddingHorizontal: 24,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      boxShadow: `0px 10px 30px ${colors.shadow}`,
    },
    secondary: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 14,
      height: 48,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      boxShadow: `0px 10px 30px ${colors.shadow}`,
    },
    disabled: {
      opacity: 0.4,
    },
  };
}

export const buttonStyles = createButtonStyles(dark);
