import type {ReactNode} from "react";
import {StyleSheet, type StyleProp, type ViewStyle} from "react-native";
import {Button as PaperButton, type ButtonProps as PaperButtonProps} from "react-native-paper";

export type MD3ButtonType = "filled" | "filled-tonal" | "outlined" | "text" | "elevated";
export type ButtonVariant = MD3ButtonType | "primary" | "secondary" | "ghost";

export type MD3ButtonProps = Omit<PaperButtonProps, "children" | "mode"> & {
  children?: ReactNode;
  title?: string;
  type?: MD3ButtonType;
  variant?: ButtonVariant;
  contentStyle?: StyleProp<ViewStyle>;
};

const variantToType: Record<ButtonVariant, MD3ButtonType> = {
  filled: "filled",
  "filled-tonal": "filled-tonal",
  outlined: "outlined",
  text: "text",
  elevated: "elevated",
  primary: "filled",
  secondary: "outlined",
  ghost: "text",
};

const typeToMode: Record<MD3ButtonType, PaperButtonProps["mode"]> = {
  filled: "contained",
  "filled-tonal": "contained-tonal",
  outlined: "outlined",
  text: "text",
  elevated: "elevated",
};

function MD3Button({
  children,
  title,
  type,
  variant = "filled",
  contentStyle,
  style,
  ...props
}: MD3ButtonProps) {
  const resolvedType = type ?? variantToType[variant];

  return (
    <PaperButton
      {...props}
      mode={typeToMode[resolvedType]}
      contentStyle={[styles.content, contentStyle]}
      labelStyle={styles.label}
      style={[styles.button, style]}
    >
      {children ?? title}
    </PaperButton>
  );
}

export function FilledButton(props: Omit<MD3ButtonProps, "type" | "variant">) {
  return <MD3Button {...props} type="filled" />;
}

export function FilledTonalButton(props: Omit<MD3ButtonProps, "type" | "variant">) {
  return <MD3Button {...props} type="filled-tonal" />;
}

export function OutlinedButton(props: Omit<MD3ButtonProps, "type" | "variant">) {
  return <MD3Button {...props} type="outlined" />;
}

export function TextButton(props: Omit<MD3ButtonProps, "type" | "variant">) {
  return <MD3Button {...props} type="text" />;
}

export function ElevatedButton(props: Omit<MD3ButtonProps, "type" | "variant">) {
  return <MD3Button {...props} type="elevated" />;
}

export const MD3_MAX_BUTTON_TYPES_PER_SCREEN = 2;
export {MD3Button as Button};
export default MD3Button;

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
  },
  content: {
    minHeight: 40,
    paddingHorizontal: 8,
  },
  label: {
    letterSpacing: 0,
  },
});
