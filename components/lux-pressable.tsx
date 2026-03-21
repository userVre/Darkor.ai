import { MotiView } from "moti";
import { PropsWithChildren, useMemo, useState } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

import { LUX_SPRING } from "../lib/motion";

type LuxPressableProps = PressableProps &
  PropsWithChildren<{
    className?: string;
    pressableClassName?: string;
    style?: StyleProp<ViewStyle>;
    glowColor?: string;
    scale?: number;
  }>;

export function LuxPressable({
  children,
  className,
  pressableClassName,
  style,
  glowColor,
  scale = 0.96,
  disabled,
  ...props
}: LuxPressableProps) {
  const [pressed, setPressed] = useState(false);

  const glowStyle = useMemo(() => {
    if (!pressed || disabled) return null;
    const glow = glowColor ?? "rgba(255, 255, 255, 0.18)";
    return {
      shadowColor: glow,
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    } as ViewStyle;
  }, [disabled, glowColor, pressed]);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      className={pressableClassName ?? "cursor-pointer"}
      onPressIn={(event) => {
        setPressed(true);
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        props.onPressOut?.(event);
      }}
    >
      <MotiView
        className={className}
        style={[style, glowStyle, disabled ? { opacity: 0.6 } : null]}
        animate={{ scale: pressed ? scale : 1 }}
        transition={LUX_SPRING}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}
