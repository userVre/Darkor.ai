import { BlurView, BlurViewProps } from "expo-blur";
import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import theme, { ThemeShadow } from "../../constants/theme";

export type CardGlow = ThemeShadow | "none";

export type CardProps = PropsWithChildren<
  Omit<BlurViewProps, "style"> & {
    glow?: CardGlow;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
  }
>;

export function Card({
  glow = "none",
  style,
  contentStyle,
  children,
  intensity = 28,
  tint = "dark",
  ...props
}: CardProps) {
  const glowStyle = glow === "none" ? null : theme.shadows[glow];

  return (
    <View style={[styles.shell, glowStyle, style]}>
      <BlurView {...props} intensity={intensity} tint={tint} style={[styles.blur, contentStyle]}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  blur: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderCurve: "continuous",
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: theme.spacing.md,
  },
  shell: {
    borderCurve: "continuous",
    borderRadius: theme.borderRadius.lg,
  },
});

export default Card;
