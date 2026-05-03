import {memo} from "react";
import {StyleSheet, View} from "react-native";
import Svg, {Defs, LinearGradient, Line, Stop} from "react-native-svg";

type ProgressPathProps = {
  currentDay: number;
  nodeOffsets: number[];
  slotHeight: number;
  width: number;
};

const BLUE = "#00B4FF";
const PINK = "#FF4FD8";
const LOCKED_LINE = "rgba(255,255,255,0.2)";
const LINE_X = 34;

export const ProgressPath = memo(function ProgressPath({
  currentDay,
  nodeOffsets,
  slotHeight,
  width,
}: ProgressPathProps) {
  const height = nodeOffsets.length * slotHeight;
  const currentSegmentIndex = currentDay - 1;

  return (
    <View pointerEvents="none" style={[styles.wrap, {height, width}]}>
      <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="elitePassUnlockedLine" x1="0" y1="0" x2="0" y2={height}>
            <Stop offset="0" stopColor={BLUE} />
            <Stop offset="0.5" stopColor={PINK} />
            <Stop offset="1" stopColor={BLUE} />
          </LinearGradient>
        </Defs>

        {nodeOffsets.slice(0, -1).map((_, index) => {
          const y1 = slotHeight / 2 + index * slotHeight + 34;
          const y2 = slotHeight / 2 + (index + 1) * slotHeight - 34;
          const isUnlocked = index < currentSegmentIndex;

          return (
            <Line
              key={`segment-${index}`}
              opacity={isUnlocked ? 1 : 0.82}
              stroke={isUnlocked ? "url(#elitePassUnlockedLine)" : LOCKED_LINE}
              strokeDasharray={isUnlocked ? undefined : "7 9"}
              strokeLinecap="round"
              strokeWidth={isUnlocked ? 6 : 4}
              x1={LINE_X}
              x2={LINE_X}
              y1={y1}
              y2={y2}
            />
          );
        })}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
