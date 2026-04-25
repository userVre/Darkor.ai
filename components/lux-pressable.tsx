import {MotiView} from "moti";
import {PropsWithChildren, useMemo, useState} from "react";
import {Pressable, PressableProps, StyleProp, ViewStyle} from "react-native";

import {DS, glowShadow} from "../lib/design-system";
import {LUX_SPRING} from "../lib/motion";

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
  scale = 0.95,
  disabled,
  ...props
}: LuxPressableProps) {
  const [pressed, setPressed] = useState(false);

  const glowStyle = useMemo(() => {
    if (!pressed || disabled) return null;
    return glowShadow(glowColor ?? DS.colors.accentGlow);
  }, [disabled, glowColor, pressed]);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      className={pressableClassName ?? "cursor-pointer"}
      style={{ cursor: "pointer" as any }}
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
        style={[style, glowStyle, disabled ? { opacity: 0.4 } : null]}
        animate={{ scale: pressed ? scale : 1 }}
        transition={LUX_SPRING}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}
