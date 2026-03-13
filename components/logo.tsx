import type { StyleProp, ImageStyle } from "react-native";
import { Image } from "expo-image";

const logoSource = require("../assets/logo-minimal.png");

type LogoProps = {
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export default function Logo({ size = 40, width, height, style }: LogoProps) {
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;

  return (
    <Image
      source={logoSource}
      contentFit="contain"
      style={[{ width: resolvedWidth, height: resolvedHeight }, style]}
    />
  );
}
