import {LinearGradient as ExpoLinearGradient} from "expo-linear-gradient";
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

const BLUE = "#00B4FF";
const PINK = "#FF4FD8";
const GOLD = "#FFD700";
const GREEN = "#2ECC71";
const LOCKED = "rgba(255,255,255,0.2)";

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
  const primary = premium ? GOLD : BLUE;
  const mid = premium ? "#FFF1A6" : "#7DCBFF";
  const deep = premium ? "#B97800" : "#005BBB";

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

function Checkmark() {
  return (
    <Svg height={28} width={28} viewBox="0 0 28 28">
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
      <Path d="M8.2 12.1V9.8a5.3 5.3 0 0 1 10.6 0v2.3" fill="transparent" stroke="#A0A3B8" strokeLinecap="round" strokeWidth={2.2} />
      <Path d="M7.2 12h12.6a1.9 1.9 0 0 1 1.9 1.9v6.9a1.9 1.9 0 0 1-1.9 1.9H7.2a1.9 1.9 0 0 1-1.9-1.9v-6.9A1.9 1.9 0 0 1 7.2 12Z" fill="#2A2A4A" stroke="#A0A3B8" strokeOpacity={0.5} />
      <Circle cx={13.5} cy={17.1} fill="#A0A3B8" r={1.2} />
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
  const rewardAmount = isJackpot ? 3 : 1;
  const canClaim = Boolean(isCurrent && onPress);
  const accentColor = isJackpot ? GOLD : isCompleted ? GREEN : BLUE;
  const rewardLabel = isJackpot ? "3 Diamonds + Pro Access" : `${rewardAmount} Diamond`;
  const statusLabel = isCompleted ? "Claimed" : isCurrent ? (canClaim ? "Ready to claim" : "In progress") : "Locked";

  useEffect(() => {
    if (!isCurrent) {
      cancelAnimation(pulse);
      cancelAnimation(pulseOpacity);
      pulse.value = 1;
      pulseOpacity.value = 0.55;
      return;
    }

    pulse.value = withRepeat(withTiming(1.28, {duration: 980, easing: Easing.inOut(Easing.quad)}), -1, true);
    pulseOpacity.value = withRepeat(withTiming(0.14, {duration: 980, easing: Easing.inOut(Easing.quad)}), -1, true);
  }, [isCurrent, pulse, pulseOpacity]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{scale: pulse.value}],
  }));

  const diamondStyle = useAnimatedStyle(() => ({
    transform: [{scale: isCurrent ? 1 + (pulse.value - 1) * 0.22 : 1}],
  }));

  const content = (
    <View
      style={[
        styles.wrap,
        isLocked ? styles.wrapLocked : null,
        isJackpot ? styles.wrapJackpot : null,
        style,
      ]}
    >
      <View style={styles.nodeColumn}>
        <View
          style={[
            styles.node,
            isCompleted ? styles.nodeCompleted : null,
            isCurrent ? styles.nodeCurrent : null,
            isJackpot && !isLocked ? styles.nodeJackpot : null,
            isLocked ? styles.nodeLocked : null,
          ]}
        >
          {isCurrent ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {borderColor: isJackpot ? "rgba(255, 215, 0, 0.72)" : "rgba(0, 180, 255, 0.72)"},
                pulseRingStyle,
              ]}
            />
          ) : null}

          {isCompleted ? <Checkmark /> : null}
          {isCurrent ? (
            <Animated.View style={diamondStyle}>
              <DiamondRewardIcon premium={isJackpot} size={32} />
            </Animated.View>
          ) : null}
          {isLocked ? <LockIcon /> : null}
        </View>
      </View>

      <View
        style={[
          styles.card,
          isCompleted ? styles.cardCompleted : null,
          isCurrent ? styles.cardCurrent : null,
          isLocked ? styles.cardLocked : null,
          isJackpot ? styles.cardJackpot : null,
          isCurrent && isJackpot ? styles.cardCurrentJackpot : null,
        ]}
      >
        {isCurrent ? (
          <View pointerEvents="none" style={styles.glassHighlight} />
        ) : null}

        <View style={styles.cardTopRow}>
          <View style={styles.dayCopy}>
            <Text style={[styles.dayLabel, isLocked ? styles.dayLabelLocked : null]}>Day {day}</Text>
            <Text style={[styles.statusLabel, {color: isLocked ? "#8C8FA8" : accentColor}]}>{statusLabel}</Text>
          </View>

          <View
            style={[
              styles.statePill,
              isCompleted ? styles.statePillCompleted : null,
              isCurrent ? styles.statePillCurrent : null,
              isLocked ? styles.statePillLocked : null,
              isJackpot ? styles.statePillJackpot : null,
            ]}
          >
            <Text style={[styles.statePillText, isLocked ? styles.statePillTextLocked : null]}>
              {isJackpot ? "Final" : `+${rewardAmount}`}
            </Text>
          </View>
        </View>

        <View style={styles.rewardRow}>
          <DiamondRewardIcon dimmed={isLocked} premium={isJackpot} size={isJackpot ? 28 : 24} />
          <Text
            style={[
              styles.rewardText,
              isCompleted ? styles.rewardTextCompleted : null,
              isCurrent ? styles.rewardTextCurrent : null,
              isLocked ? styles.rewardTextLocked : null,
              isJackpot ? styles.rewardTextJackpot : null,
            ]}
          >
            {rewardLabel}
          </Text>
        </View>

        {isJackpot ? (
          <Text style={[styles.proText, isLocked ? styles.proTextLocked : null]}>Ultimate milestone reward</Text>
        ) : null}

        {isCurrent ? (
          <ExpoLinearGradient
            colors={canClaim ? [PINK, BLUE] : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.08)"]}
            end={{x: 1, y: 1}}
            start={{x: 0, y: 0}}
            style={[styles.claimButton, canClaim ? styles.claimButtonActive : styles.claimButtonMuted]}
          >
            <Text style={styles.claimButtonText}>{canClaim ? "Claim Reward" : `${Math.round(progress)}% Ready`}</Text>
          </ExpoLinearGradient>
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
    minHeight: 116,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wrapLocked: {
    opacity: 0.5,
  },
  wrapJackpot: {
    minHeight: 132,
  },
  nodeColumn: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: "#10111D",
  },
  nodeCompleted: {
    borderColor: "rgba(46, 204, 113, 0.92)",
    backgroundColor: GREEN,
    boxShadow: "0px 0px 22px rgba(46, 204, 113, 0.56)",
  },
  nodeCurrent: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderColor: BLUE,
    backgroundColor: "rgba(8, 19, 38, 0.94)",
    boxShadow: `0px 0px 30px ${BLUE}90`,
  },
  nodeJackpot: {
    borderColor: GOLD,
    boxShadow: "0px 0px 28px rgba(255, 215, 0, 0.58)",
  },
  nodeLocked: {
    borderColor: LOCKED,
    backgroundColor: "#17182A",
  },
  pulseRing: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
  },
  card: {
    flex: 1,
    minHeight: 100,
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(14, 15, 28, 0.82)",
  },
  cardCompleted: {
    borderColor: "rgba(46, 204, 113, 0.4)",
    backgroundColor: "rgba(16, 38, 30, 0.78)",
    boxShadow: "0px 0px 22px rgba(46, 204, 113, 0.22)",
  },
  cardCurrent: {
    minHeight: 124,
    borderColor: "rgba(0, 180, 255, 0.72)",
    backgroundColor: "rgba(13, 31, 60, 0.72)",
    boxShadow: `0px 18px 38px ${BLUE}38`,
  },
  cardCurrentJackpot: {
    borderColor: "rgba(255, 215, 0, 0.86)",
    boxShadow: "0px 18px 42px rgba(255, 215, 0, 0.32)",
  },
  cardLocked: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(22, 23, 39, 0.62)",
  },
  cardJackpot: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.72)",
    backgroundColor: "rgba(42, 31, 9, 0.64)",
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.09)",
    opacity: 0.9,
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
    gap: 2,
  },
  dayLabel: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 23,
    ...fonts.bold,
  },
  dayLabelLocked: {
    color: "#C5C7D8",
  },
  statusLabel: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 0,
    ...fonts.bold,
  },
  statePill: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statePillCompleted: {
    borderColor: "rgba(46, 204, 113, 0.44)",
    backgroundColor: "rgba(46, 204, 113, 0.14)",
  },
  statePillCurrent: {
    borderColor: "rgba(0, 180, 255, 0.55)",
    backgroundColor: "rgba(0, 180, 255, 0.16)",
  },
  statePillLocked: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statePillJackpot: {
    borderColor: "rgba(255, 215, 0, 0.72)",
    backgroundColor: "rgba(255, 215, 0, 0.14)",
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
  rewardRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diamondIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  rewardText: {
    flex: 1,
    color: "#DCEEFF",
    fontSize: 15,
    lineHeight: 20,
    ...fonts.bold,
  },
  rewardTextCompleted: {
    color: "#D9FFE9",
  },
  rewardTextCurrent: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 21,
  },
  rewardTextLocked: {
    color: "#B4B7CC",
  },
  rewardTextJackpot: {
    color: "#FFF2A8",
  },
  proText: {
    color: "rgba(255, 242, 168, 0.86)",
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  proTextLocked: {
    color: "#B4B7CC",
  },
  claimButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
  },
  claimButtonActive: {
    borderColor: "rgba(255,255,255,0.34)",
    boxShadow: `0px 10px 24px ${PINK}40`,
  },
  claimButtonMuted: {
    borderColor: "rgba(255,255,255,0.12)",
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.bold,
  },
});
