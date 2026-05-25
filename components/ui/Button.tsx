import type {ReactNode} from "react";
import {StyleSheet, type StyleProp, type ViewStyle} from "react-native";
import {Button as PaperButton, type ButtonProps as PaperButtonProps} from "react-native-paper";

type MD3ButtonProps = Omit<PaperButtonProps, "children" | "mode"> & {
  children?: ReactNode;
  title?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export function FilledTonalButton({
  children,
  title,
  contentStyle,
  style,
  ...props
}: MD3ButtonProps) {
  return (
    <PaperButton
      {...props}
      mode="contained-tonal"
      contentStyle={[styles.content, contentStyle]}
      labelStyle={styles.label}
      style={[styles.button, style]}
    >
      {children ?? title}
    </PaperButton>
  );
}

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
