import type {PropsWithChildren} from "react";
import type {StyleProp, TextStyle} from "react-native";
import {Text as PaperText, useTheme, type TextProps as PaperTextProps} from "react-native-paper";

import type {md3LightColors, md3TypeScale} from "../../constants/md3Theme";

export type MD3TextVariant = keyof typeof md3TypeScale;
export type MD3TextColor = keyof typeof md3LightColors;

export type TypographyProps = PropsWithChildren<
  Omit<PaperTextProps<never>, "variant" | "children"> & {
    variant?: Exclude<MD3TextVariant, "default">;
    color?: MD3TextColor;
    style?: StyleProp<TextStyle>;
  }
>;

export function Typography({variant = "bodyMedium", color = "onSurface", style, children, ...props}: TypographyProps) {
  const theme = useTheme();
  const resolvedColor = theme.colors[color as keyof typeof theme.colors] as string | undefined;

  return (
    <PaperText {...props} variant={variant} style={[resolvedColor ? {color: resolvedColor} : null, style]}>
      {children}
    </PaperText>
  );
}

export default Typography;
