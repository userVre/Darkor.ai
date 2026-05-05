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

const ACCENT_PURPLE = "#7B61FF";
const ACCENT_BLUE = "#5AC8FA";
const LOCKED_LINE = "#D1D5DB";
const LINE_X = 18;

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
            <Stop offset="0" stopColor={ACCENT_PURPLE} />
            <Stop offset="1" stopColor={ACCENT_BLUE} />
          </LinearGradient>
        </Defs>

        {nodeOffsets.slice(0, -1).map((_, index) => {
          const y1 = centers[index] + 18;
          const y2 = centers[index + 1] - 18;
          const isUnlocked = index < currentSegmentIndex;

          return (
            <Line
              key={`segment-${index}`}
              opacity={isUnlocked ? 0.85 : 0.72}
              stroke={isUnlocked ? "url(#elitePassUnlockedLine)" : LOCKED_LINE}
              strokeLinecap="round"
              strokeWidth={2}
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
