import {memo, useEffect, useId} from "react";
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop} from "react-native-svg";

import {fonts} from "../../styles/typography";

export type DayNodeState = "completed" | "current" | "locked";

type DayNodeProps = {
  day: number;
  state: DayNodeState;
  progress?: number;
  isJackpot?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const BLUE = "#2F80FF";
const BLUE_LIGHT = "#8FD3FF";
const GREEN = "#2ECC71";
const LOCKED = "rgba(255,255,255,0.12)";
const LIMITED_RED = "#FF4D5E";

export function DiamondRewardIcon({
  dimmed = false,
  premium = false,
  size = 24,
}: {
  dimmed?: boolean;
  premium?: boolean;
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  const bodyId = `elitePassDiamondBody${id}`;
  const edgeId = `elitePassDiamondEdge${id}`;
  const primary = premium ? BLUE_LIGHT : "#EAF6FF";
  const mid = premium ? "#BCE8FF" : "#F0F8FF";
  const deep = premium ? BLUE : "#8DA7C0";

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.diamondIconWrap, {height: size, width: size}]}>
      <Svg height={size} width={size} viewBox="0 0 34 34">
        <Defs>
          <SvgLinearGradient id={bodyId} x1="7" y1="4" x2="27" y2="30">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dimmed ? 0.42 : 0.92} />
            <Stop offset="0.34" stopColor={mid} stopOpacity={dimmed ? 0.5 : 1} />
            <Stop offset="1" stopColor={primary} stopOpacity={dimmed ? 0.5 : 1} />
          </SvgLinearGradient>
          <SvgLinearGradient id={edgeId} x1="4" y1="10" x2="30" y2="24">
            <Stop offset="0" stopColor={primary} />
            <Stop offset="1" stopColor={deep} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M9.5 5.5h15l6 8.1L17 30 3.5 13.6l6-8.1Z"
          fill={`url(#${bodyId})`}
          opacity={dimmed ? 0.5 : 1}
        />
        <Path d="M3.5 13.6h27" stroke={`url(#${edgeId})`} strokeLinecap="round" strokeWidth={1.4} />
        <Path d="M9.5 5.5 17 13.6l7.5-8.1" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.78} strokeWidth={1.2} />
        <Path d="M9.5 5.5 17 30l7.5-24.5" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.68} strokeWidth={1.1} />
        <Path d="M7.7 10.4 11 7.2" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity={0.85} strokeWidth={1.3} />
      </Svg>
    </View>
  );
}

function Checkmark({size = 28}: {size?: number}) {
  return (
    <Svg height={size} width={size} viewBox="0 0 28 28">
      <Path
        d="M6.7 14.2 11.7 19.2 21.8 8.8"
        fill="transparent"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.2}
      />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg height={27} width={27} viewBox="0 0 27 27">
      <Path d="M8.2 12.1V9.8a5.3 5.3 0 0 1 10.6 0v2.3" fill="transparent" stroke="#9093AA" strokeLinecap="round" strokeWidth={2.2} />
      <Path d="M7.2 12h12.6a1.9 1.9 0 0 1 1.9 1.9v6.9a1.9 1.9 0 0 1-1.9 1.9H7.2a1.9 1.9 0 0 1-1.9-1.9v-6.9A1.9 1.9 0 0 1 7.2 12Z" fill="#171821" stroke="#9093AA" strokeOpacity={0.38} />
      <Circle cx={13.5} cy={17.1} fill="#9093AA" r={1.2} />
    </Svg>
  );
}

export const DayNode = memo(function DayNode({
  day,
  state,
  progress = 100,
  isJackpot = false,
  onPress,
  style,
}: DayNodeProps) {
  const pulse = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.55);
  const isCurrent = state === "current";
  const isCompleted = state === "completed";
  const isLocked = state === "locked";
  const canClaim = Boolean(isCurrent && onPress);
  const isWaiting = isLocked || (isCurrent && !canClaim);
  const accentColor = isJackpot ? LIMITED_RED : isCompleted ? GREEN : BLUE;
  const isDayOne = day === 1;
  const isDayTwo = day === 2;
  const rewardLabel = isJackpot
    ? "PRO ACCESS"
    : isDayOne && isCompleted
    ? "Claimed"
    : canClaim
    ? "1 Diamond"
    : isDayTwo && isLocked
    ? "Unlocks Tomorrow"
    : isLocked
    ? "Locked"
    : "1 Diamond";
  const statePillLabel = isCompleted
    ? "Claimed"
    : canClaim
    ? "TAP"
    : isJackpot
    ? "LIMITED"
    : "";

  useEffect(() => {
    if (!canClaim) {
      cancelAnimation(pulse);
      cancelAnimation(pulseOpacity);
      pulse.value = 1;
      pulseOpacity.value = 0.55;
      return;
    }

    pulse.value = withRepeat(withTiming(1.2, {duration: 1100, easing: Easing.inOut(Easing.quad)}), -1, true);
    pulseOpacity.value = withRepeat(withTiming(0.12, {duration: 1100, easing: Easing.inOut(Easing.quad)}), -1, true);
  }, [canClaim, pulse, pulseOpacity]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: typeof pulseOpacity.value === "number" ? pulseOpacity.value : 0.55,
    transform: [{scale: typeof pulse.value === "number" ? pulse.value : 1}],
  }));

  const diamondStyle = useAnimatedStyle(() => {
    const pulseScale = typeof pulse.value === "number" ? pulse.value : 1;

    return {
      transform: [{scale: canClaim ? 1 + (pulseScale - 1) * 0.18 : 1}],
    };
  });

  const content = (
    <View
      style={[
        styles.wrap,
        isWaiting ? styles.wrapLocked : null,
        isJackpot ? styles.wrapJackpot : null,
        style,
      ]}
    >
      <View style={styles.nodeColumn}>
        <View
          style={[
            styles.node,
            isCompleted ? styles.nodeCompleted : null,
            canClaim ? styles.nodeCurrent : null,
            isJackpot && !isLocked ? styles.nodeJackpot : null,
            isWaiting ? styles.nodeLocked : null,
          ]}
        >
          {canClaim ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {borderColor: "rgba(47, 128, 255, 0.76)"},
                pulseRingStyle,
              ]}
            />
          ) : null}

          {isCompleted ? (
            <View style={styles.claimedIconStack}>
              <DiamondRewardIcon premium={isJackpot} size={isJackpot ? 38 : 42} />
              <View style={[styles.checkBadge, isJackpot ? styles.checkBadgeJackpot : null]}>
                <Checkmark size={15} />
              </View>
            </View>
          ) : null}
          {canClaim ? (
            <Animated.View style={diamondStyle}>
              <DiamondRewardIcon premium={isJackpot} size={isJackpot ? 38 : 42} />
            </Animated.View>
          ) : null}
          {!isCompleted && !canClaim ? <LockIcon /> : null}
        </View>
      </View>

      <View
        style={[
          styles.card,
          isCompleted ? styles.cardCompleted : null,
          canClaim ? styles.cardCurrent : null,
          isWaiting ? styles.cardLocked : null,
          isJackpot ? styles.cardJackpot : null,
          canClaim && isJackpot ? styles.cardCurrentJackpot : null,
        ]}
      >
        {canClaim ? (
          <View pointerEvents="none" style={styles.glassHighlight} />
        ) : null}

        <View style={styles.cardTopRow}>
          <View style={styles.dayCopy}>
            <Text style={[styles.dayLabel, isWaiting ? styles.dayLabelLocked : null]}>Day {day}</Text>
            <Text
              style={[
                styles.rewardText,
                isCompleted ? styles.rewardTextCompleted : null,
                canClaim ? styles.rewardTextCurrent : null,
                isWaiting ? styles.rewardTextLocked : null,
                isJackpot ? styles.rewardTextJackpot : null,
              ]}
            >
              {rewardLabel}
            </Text>
          </View>

          {statePillLabel ? (
            <View
              style={[
                styles.statePill,
                isCompleted ? styles.statePillCompleted : null,
                canClaim ? styles.statePillCurrent : null,
                isWaiting ? styles.statePillLocked : null,
                isJackpot ? styles.statePillJackpot : null,
              ]}
            >
              {isCompleted ? <Checkmark size={13} /> : null}
              <Text style={[styles.statePillText, isWaiting ? styles.statePillTextLocked : null, isJackpot && !isCompleted ? styles.statePillTextLimited : null]}>
                {statePillLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {!isJackpot && isCompleted ? (
          <View style={styles.glowLine} />
        ) : null}

        {isJackpot ? (
          <View
            style={[
              styles.accessRule,
              {backgroundColor: isWaiting ? "rgba(255, 77, 94, 0.24)" : "rgba(47, 128, 255, 0.54)"},
            ]}
          >
            <View style={[styles.accessRuleDot, {backgroundColor: accentColor}]} />
          </View>
        ) : null}
      </View>
    </View>
  );

  if (isCurrent && onPress) {
    return (
      <Pressable
        accessibilityLabel={`Claim Day ${day} Elite Pass reward`}
        accessibilityRole="button"
        onPress={onPress}
        style={({pressed}) => [styles.pressable, pressed ? styles.pressed : null]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.985}],
  },
  wrap: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wrapLocked: {
    opacity: 0.78,
  },
  wrapJackpot: {
    minHeight: 112,
  },
  nodeColumn: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0B0D12",
  },
  nodeCompleted: {
    borderColor: "rgba(255, 255, 255, 0.24)",
    backgroundColor: "rgba(47, 128, 255, 0.1)",
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.22)",
  },
  nodeCurrent: {
    borderColor: "rgba(47, 128, 255, 0.74)",
    backgroundColor: "rgba(8, 18, 35, 0.96)",
    boxShadow: "0px 0px 24px rgba(47, 128, 255, 0.34)",
  },
  nodeJackpot: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderColor: "rgba(255, 77, 94, 0.62)",
    backgroundColor: "rgba(35, 10, 17, 0.82)",
    boxShadow: "0px 0px 24px rgba(255, 77, 94, 0.22)",
  },
  nodeLocked: {
    borderColor: LOCKED,
    backgroundColor: "#0B0C10",
    boxShadow: "0px 6px 14px rgba(0, 0, 0, 0.18)",
  },
  pulseRing: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
  },
  claimedIconStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    position: "absolute",
    right: -5,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.74)",
    backgroundColor: GREEN,
    boxShadow: "0px 6px 14px rgba(46, 204, 113, 0.36)",
  },
  checkBadgeJackpot: {
    backgroundColor: BLUE,
    boxShadow: "0px 6px 14px rgba(47, 128, 255, 0.32)",
  },
  card: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(12, 14, 20, 0.92)",
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.18)",
  },
  cardCompleted: {
    borderColor: "rgba(47, 128, 255, 0.28)",
    backgroundColor: "rgba(13, 21, 32, 0.92)",
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.18)",
  },
  cardCurrent: {
    borderColor: "rgba(47, 128, 255, 0.66)",
    backgroundColor: "rgba(10, 22, 40, 0.98)",
    boxShadow: "0px 0px 28px rgba(47, 128, 255, 0.22)",
  },
  cardCurrentJackpot: {
    borderColor: "rgba(47, 128, 255, 0.68)",
    boxShadow: "0px 0px 30px rgba(47, 128, 255, 0.22)",
  },
  cardLocked: {
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(9, 10, 14, 0.78)",
  },
  cardJackpot: {
    borderWidth: 1.5,
    minHeight: 104,
    paddingVertical: 16,
    borderColor: "rgba(255, 77, 94, 0.5)",
    backgroundColor: "rgba(22, 12, 18, 0.94)",
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "rgba(47, 128, 255, 0.09)",
    opacity: 0.78,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dayCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dayLabel: {
    color: "rgba(255, 255, 255, 0.64)",
    fontSize: 12,
    lineHeight: 15,
    textTransform: "uppercase",
    ...fonts.bold,
  },
  dayLabelLocked: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  statePill: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statePillCompleted: {
    borderColor: "rgba(46, 204, 113, 0.38)",
    backgroundColor: "rgba(46, 204, 113, 0.16)",
  },
  statePillCurrent: {
    borderColor: "rgba(47, 128, 255, 0.7)",
    backgroundColor: "rgba(47, 128, 255, 0.18)",
  },
  statePillLocked: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statePillJackpot: {
    borderColor: "rgba(255, 77, 94, 0.72)",
    backgroundColor: "rgba(255, 77, 94, 0.16)",
  },
  statePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 14,
    ...fonts.bold,
  },
  statePillTextLocked: {
    color: "#B7B9CA",
  },
  statePillTextLimited: {
    color: LIMITED_RED,
  },
  diamondIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  rewardText: {
    color: "#F7FAFF",
    fontSize: 17,
    lineHeight: 21,
    ...fonts.bold,
  },
  rewardTextCompleted: {
    color: "#FFFFFF",
  },
  rewardTextCurrent: {
    color: "#FFFFFF",
  },
  rewardTextLocked: {
    color: "#B9BCCB",
    fontSize: 15,
    lineHeight: 19,
  },
  rewardTextJackpot: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 30,
  },
  glowLine: {
    width: 52,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(47, 128, 255, 0.48)",
    boxShadow: "0px 0px 0px rgba(0, 0, 0, 0)",
  },
  accessRule: {
    width: 72,
    height: 2,
    borderRadius: 1,
  },
  accessRuleDot: {
    position: "absolute",
    right: -3,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
