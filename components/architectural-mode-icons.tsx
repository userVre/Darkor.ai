import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

type ArchitecturalModeIconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function StructuralDraftIcon({
  color = "#0A0A0A",
  size = 24,
  strokeWidth = 2,
}: ArchitecturalModeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4.5" y="10.5" width="9" height="8" rx="1.75" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M3.75 11.25L9 6.75L14.25 11.25" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      <Line x1="7.25" y1="14" x2="10.75" y2="14" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Line x1="7.25" y1="16.5" x2="10.25" y2="16.5" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Line x1="15.5" y1="6.5" x2="20.5" y2="6.5" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Line x1="15.5" y1="10" x2="20.5" y2="10" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Line x1="15.5" y1="13.5" x2="19" y2="13.5" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Circle cx="18.75" cy="17.5" r="1.75" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function RenovationSparkIcon({
  color = "#0A0A0A",
  size = 24,
  strokeWidth = 2,
}: ArchitecturalModeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.25 18.25L13.25 11.25" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Path d="M8.25 20.25L15.25 13.25" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
      <Rect
        x="4.8"
        y="17.2"
        width="4.2"
        height="2.8"
        rx="1.1"
        transform="rotate(-45 4.8 17.2)"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path d="M15.75 4.5L16.4 6.35L18.25 7L16.4 7.65L15.75 9.5L15.1 7.65L13.25 7L15.1 6.35L15.75 4.5Z" stroke={color} strokeLinejoin="round" strokeWidth={strokeWidth} />
      <Path d="M19 10.25L19.4 11.35L20.5 11.75L19.4 12.15L19 13.25L18.6 12.15L17.5 11.75L18.6 11.35L19 10.25Z" stroke={color} strokeLinejoin="round" strokeWidth={strokeWidth} />
      <Path d="M11.4 3.75L11.75 4.7L12.7 5.05L11.75 5.4L11.4 6.35L11.05 5.4L10.1 5.05L11.05 4.7L11.4 3.75Z" stroke={color} strokeLinejoin="round" strokeWidth={strokeWidth} />
    </Svg>
  );
}
