import {memo} from "react";
import {StyleSheet, View} from "react-native";
import Svg, {Defs, LinearGradient, Line, Stop} from "react-native-svg";

type ProgressPathProps = {
  currentDay: number;
  nodeOffsets: number[];
  slotHeights?: number[];
  slotHeight: number;
  width: number;
};

const BLUE = "#2F80FF";
const BLUE_DEEP = "#0A4FD7";
const LOCKED_LINE = "rgba(255,255,255,0.12)";
const LINE_X = 34;

export const ProgressPath = memo(function ProgressPath({
  currentDay,
  nodeOffsets,
  slotHeights,
  slotHeight,
  width,
}: ProgressPathProps) {
  const resolvedSlotHeights = slotHeights ?? nodeOffsets.map(() => slotHeight);
  const height = resolvedSlotHeights.reduce((total, next) => total + next, 0);
  const centers = resolvedSlotHeights.reduce<number[]>((acc, nextHeight, index) => {
    const previousTop = index === 0 ? 0 : resolvedSlotHeights.slice(0, index).reduce((total, next) => total + next, 0);
    acc.push(previousTop + nextHeight / 2);
    return acc;
  }, []);
  const currentSegmentIndex = currentDay - 1;

  return (
    <View pointerEvents="none" style={[styles.wrap, {height, width}]}>
      <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="elitePassUnlockedLine" x1="0" y1="0" x2="0" y2={height}>
            <Stop offset="0" stopColor="#7BC7FF" />
            <Stop offset="0.52" stopColor={BLUE} />
            <Stop offset="1" stopColor={BLUE_DEEP} />
          </LinearGradient>
        </Defs>

        {nodeOffsets.slice(0, -1).map((_, index) => {
          const y1 = centers[index] + 25;
          const y2 = centers[index + 1] - 25;
          const isUnlocked = index < currentSegmentIndex;

          return (
            <Line
              key={`segment-${index}`}
              opacity={isUnlocked ? 0.72 : 0.58}
              stroke={isUnlocked ? "url(#elitePassUnlockedLine)" : LOCKED_LINE}
              strokeDasharray={isUnlocked ? undefined : "5 10"}
              strokeLinecap="round"
              strokeWidth={isUnlocked ? 3 : 2}
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
