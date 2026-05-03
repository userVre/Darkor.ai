import { LinearGradient } from "expo-linear-gradient";
import { ReactNode, useCallback } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import theme from "../../constants/theme";

import Typography from "./Typography";

const AnimatedView = Animated.createAnimatedComponent(View);

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  children?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  md: {
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: theme.spacing.xl,
  },
};

const labelVariants: Record<ButtonSize, "caption" | "body" | "subtitle"> = {
  sm: "caption",
  md: "body",
  lg: "subtitle",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  title,
  children,
  leftIcon,
  rightIcon,
  style,
  contentStyle,
  textStyle,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const pressScale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!isDisabled) {
        pressScale.value = withTiming(0.97, { duration: 90 });
      }
      onPressIn?.(event);
    },
    [isDisabled, onPressIn, pressScale],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      pressScale.value = withTiming(1, { duration: 120 });
      onPressOut?.(event);
    },
    [onPressOut, pressScale],
  );

  const textColor =
    variant === "primary"
      ? "textPrimary"
      : variant === "secondary"
        ? "primary"
        : "textSecondary";
  const label = typeof children === "string" ? children : title;
  const customChildren = children != null && typeof children !== "string" ? children : null;

  const content = (
    <View style={[styles.content, contentStyle]}>
      {loading ? (
        <ActivityIndicator color={theme.colors[textColor]} />
      ) : (
        <>
          {leftIcon}
          {typeof label === "string" ? (
            <Typography
              color={textColor}
              variant={labelVariants[size]}
              style={[styles.label, textStyle]}
            >
              {label}
            </Typography>
          ) : (
            customChildren
          )}
          {rightIcon}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <AnimatedView
        style={[
          styles.base,
          sizeStyles[size],
          variantStyles[variant],
          isDisabled ? styles.disabled : null,
          animatedStyle,
          style,
        ]}
      >
        {variant === "primary" ? (
          <LinearGradient
            colors={[theme.colors.accent, theme.colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {content}
      </AnimatedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: theme.borderRadius.pill,
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontWeight: "700",
    textAlign: "center",
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.accent,
    borderColor: "transparent",
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
  },
});

export default Button;
