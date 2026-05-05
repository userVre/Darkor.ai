import {memo, useId} from "react";
import {LinearGradient} from "expo-linear-gradient";
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

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

const ACCENT_PURPLE = "#7B61FF";
const ACCENT_BLUE = "#5AC8FA";
const TEXT = "#000000";
const SECONDARY = "#6B7280";
const CARD_GRAY = "#F3F4F6";
const CARD_BORDER = "#E5E7EB";
const GREEN = "#22C55E";

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
  const fillId = `elitePassDiamond${id}`;
  const edge = premium ? ACCENT_PURPLE : ACCENT_BLUE;

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.iconWrap, {height: size, width: size}]}>
      <Svg height={size} width={size} viewBox="0 0 34 34">
        <Defs>
          <SvgLinearGradient id={fillId} x1="4" y1="4" x2="30" y2="30">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dimmed ? 0.55 : 1} />
            <Stop offset="0.38" stopColor={ACCENT_BLUE} stopOpacity={dimmed ? 0.5 : 0.95} />
            <Stop offset="1" stopColor={ACCENT_PURPLE} stopOpacity={dimmed ? 0.48 : 1} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M9.5 5.5h15l6 8.1L17 30 3.5 13.6l6-8.1Z"
          fill={`url(#${fillId})`}
          opacity={dimmed ? 0.5 : 1}
        />
        <Path d="M9.5 5.5 17 13.6 3.5 13.6Z" fill="#FFFFFF" opacity={dimmed ? 0.18 : 0.45} />
        <Path d="M24.5 5.5 17 13.6h13.5Z" fill="#FFFFFF" opacity={dimmed ? 0.14 : 0.32} />
        <Path d="M3.5 13.6h27" stroke={edge} strokeLinecap="round" strokeOpacity={dimmed ? 0.45 : 0.9} strokeWidth={1.3} />
        <Path d="M9.5 5.5 17 13.6l7.5-8.1" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.78} strokeWidth={1} />
        <Path d="M9.5 5.5 17 30l7.5-24.5" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.62} strokeWidth={0.95} />
      </Svg>
    </View>
  );
}

function CrownIcon({size = 26}: {size?: number}) {
  const id = useId().replace(/:/g, "");
  const fillId = `elitePassCrown${id}`;

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.iconWrap, {height: size, width: size}]}>
      <Svg height={size} width={size} viewBox="0 0 36 36">
        <Defs>
          <SvgLinearGradient id={fillId} x1="5" y1="6" x2="31" y2="31">
            <Stop offset="0" stopColor={ACCENT_BLUE} />
            <Stop offset="1" stopColor={ACCENT_PURPLE} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M7 13.3 13.2 18.5 18 7l4.8 11.5 6.2-5.2-2.1 15.5H9.1L7 13.3Z"
          fill="transparent"
          stroke={`url(#${fillId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <Path d="M10.5 29h15" stroke={`url(#${fillId})`} strokeLinecap="round" strokeWidth={2} />
      </Svg>
    </View>
  );
}

function Checkmark({color = "#FFFFFF", size = 18}: {color?: string; size?: number}) {
  return (
    <Svg height={size} width={size} viewBox="0 0 24 24">
      <Path
        d="M5.4 12.4 9.7 16.7 18.8 7.3"
        fill="transparent"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

function GiftIcon({opacity = 0.5, size = 26}: {opacity?: number; size?: number}) {
  return (
    <Svg height={size} width={size} opacity={opacity} viewBox="0 0 28 28">
      <Path d="M5.5 11.2h17v12h-17v-12Z" fill="transparent" stroke={SECONDARY} strokeLinejoin="round" strokeWidth={1.7} />
      <Path d="M4.2 7.8h19.6v4H4.2v-4Z" fill="transparent" stroke={SECONDARY} strokeLinejoin="round" strokeWidth={1.7} />
      <Path d="M14 7.8v15.4" stroke={SECONDARY} strokeLinecap="round" strokeWidth={1.7} />
      <Path d="M14 7.8c-1.7-4.1-6.6-3.3-5.9.1 2.1.6 4 .5 5.9-.1Z" fill="transparent" stroke={SECONDARY} strokeLinejoin="round" strokeWidth={1.5} />
      <Path d="M14 7.8c1.7-4.1 6.6-3.3 5.9.1-2.1.6-4 .5-5.9-.1Z" fill="transparent" stroke={SECONDARY} strokeLinejoin="round" strokeWidth={1.5} />
    </Svg>
  );
}

function LockIcon({size = 19}: {size?: number}) {
  return (
    <Svg height={size} width={size} viewBox="0 0 24 24">
      <Path d="M7.5 10.4V8.1a4.5 4.5 0 0 1 9 0v2.3" fill="transparent" stroke={SECONDARY} strokeLinecap="round" strokeWidth={1.8} />
      <Path d="M6.2 10.2h11.6a1.7 1.7 0 0 1 1.7 1.7v6.2a1.7 1.7 0 0 1-1.7 1.7H6.2a1.7 1.7 0 0 1-1.7-1.7v-6.2a1.7 1.7 0 0 1 1.7-1.7Z" fill="transparent" stroke={SECONDARY} strokeWidth={1.8} />
      <Circle cx={12} cy={15.2} fill={SECONDARY} r={1} />
    </Svg>
  );
}

function GradientText({
  height,
  size,
  text,
  width,
}: {
  height: number;
  size: number;
  text: string;
  width: number;
}) {
  const id = useId().replace(/:/g, "");

  return (
    <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id={`text${id}`} x1="0" y1="0" x2={width} y2="0">
          <Stop offset="0" stopColor={ACCENT_BLUE} />
          <Stop offset="1" stopColor={ACCENT_PURPLE} />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        fill={`url(#text${id})`}
        fontFamily="Inter"
        fontSize={size}
        fontWeight="700"
        x="0"
        y={height - 6}
      >
        {text}
      </SvgText>
    </Svg>
  );
}

export const DayNode = memo(function DayNode({
  day,
  state,
  isJackpot = false,
  onPress,
  style,
}: DayNodeProps) {
  const isCompleted = state === "completed";
  const canClaim = state === "current" && Boolean(onPress);
  const isTomorrow = day === 2 && state === "locked";

  const content = (
    <View style={[styles.wrap, isJackpot ? styles.wrapJackpot : null, style]}>
      <View style={styles.nodeColumn}>
        <View style={[styles.node, isCompleted ? styles.nodeCompleted : null, isJackpot ? styles.nodeJackpot : null]}>
          {isCompleted ? (
            <>
              <DiamondRewardIcon premium size={25} />
              <View style={styles.nodeCheck}>
                <Checkmark size={12} />
              </View>
            </>
          ) : isJackpot ? (
            <CrownIcon size={26} />
          ) : (
            <LockIcon />
          )}
        </View>
      </View>

      {isJackpot ? (
        <LinearGradient
          colors={[ACCENT_PURPLE, ACCENT_BLUE]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.heroBorder}
        >
          <View style={styles.heroCard}>
            <View style={styles.dayCopy}>
              <Text style={styles.dayLabel}>JOUR 7</Text>
              <Text style={styles.heroTitle}>ACCÈS PRO</Text>
            </View>
            <View style={styles.limitedBadge}>
              <Text style={styles.limitedText}>LIMITÉ</Text>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.card, canClaim ? styles.cardCurrent : null]}>
          <View style={styles.dayCopy}>
            <Text style={styles.dayLabel}>JOUR {day}</Text>
            {isTomorrow ? (
              <GradientText height={25} size={18} text="Débloqué demain" width={176} />
            ) : (
              <Text style={[styles.rewardText, isCompleted ? styles.rewardClaimed : null]}>
                {isCompleted ? "Réclamé" : "Verrouillé"}
              </Text>
            )}
          </View>

          {isCompleted ? (
            <View style={styles.claimedBadge}>
              <Checkmark size={15} />
              <Text style={styles.claimedBadgeText}>Réclamé</Text>
            </View>
          ) : (
            <GiftIcon opacity={isTomorrow ? 0.5 : 0.34} />
          )}
        </View>
      )}
    </View>
  );

  if (canClaim && onPress) {
    return (
      <Pressable
        accessibilityLabel={`Réclamer la récompense du jour ${day} du Pass Elite`}
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
    opacity: 0.88,
    transform: [{scale: 0.985}],
  },
  wrap: {
    width: "100%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wrapJackpot: {
    minHeight: 90,
  },
  nodeColumn: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  nodeCompleted: {
    borderColor: ACCENT_PURPLE,
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 8px 18px rgba(123, 97, 255, 0.18)",
  },
  nodeJackpot: {
    borderColor: ACCENT_PURPLE,
    backgroundColor: "#F8F7FF",
    boxShadow: "0px 8px 18px rgba(90, 200, 250, 0.18)",
  },
  nodeCheck: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: GREEN,
  },
  card: {
    flex: 1,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_GRAY,
  },
  cardCurrent: {
    borderColor: "rgba(123, 97, 255, 0.35)",
    backgroundColor: "#F7F5FF",
  },
  dayCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  dayLabel: {
    color: SECONDARY,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0,
    ...fonts.bold,
  },
  rewardText: {
    color: TEXT,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: 0,
    ...fonts.bold,
  },
  rewardClaimed: {
    color: TEXT,
  },
  claimedBadge: {
    height: 34,
    minWidth: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: GREEN,
  },
  claimedBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
    ...fonts.bold,
  },
  heroBorder: {
    flex: 1,
    height: 90,
    borderRadius: 20,
    borderCurve: "continuous",
    padding: 1.5,
  },
  heroCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 18.5,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
  },
  heroTitle: {
    color: TEXT,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: 0,
    ...fonts.bold,
  },
  limitedBadge: {
    height: 34,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(123, 97, 255, 0.32)",
    backgroundColor: "#F4F1FF",
  },
  limitedText: {
    color: ACCENT_PURPLE,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
    ...fonts.bold,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
