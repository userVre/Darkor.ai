import { PropsWithChildren } from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";

import theme, { ThemeColor, ThemeTypography } from "../../constants/theme";

export type TypographyProps = PropsWithChildren<
  TextProps & {
    variant?: ThemeTypography;
    color?: ThemeColor;
    style?: StyleProp<TextStyle>;
  }
>;

export function Typography({
  variant = "body",
  color = "textPrimary",
  style,
  children,
  ...props
}: TypographyProps) {
  return (
    <Text
      {...props}
      style={[theme.typography[variant] as TextStyle, { color: theme.colors[color] }, style]}
    >
      {children}
    </Text>
  );
}

export default Typography;
