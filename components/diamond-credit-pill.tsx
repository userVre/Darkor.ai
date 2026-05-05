import {
I18nManager,
Pressable,
StyleSheet,
Text,
View,
type AccessibilityRole,
type StyleProp,
type ViewStyle,
} from "react-native";
import Svg, {Path} from "react-native-svg";

import {ambientShadow} from "../lib/design-system";
import {fonts} from "../styles/typography";

type DiamondCreditPillProps = {
  count: number;
  streakCount?: number;
  variant?: "dark" | "light";
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  iconOnly?: boolean;
  onPress?: () => void;
  onElitePassPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const PRIMARY_PURPLE = "#7B61FF";
const PRIMARY_BLUE = "#5AC8FA";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#111827";
const PREMIUM_BLUE_DEEP = "#2563EB";
export const DIAMOND_PILL_BLUE = PRIMARY_BLUE;
export const RADIX_BLUE_9 = PRIMARY_PURPLE;

const VARIANT_STYLES = {
  dark: {
    backgroundColor: WHITE,
    borderColor: "rgba(123, 97, 255, 0.22)",
    textColor: TEXT_DARK,
    prismPrimary: PRIMARY_PURPLE,
  },
  light: {
    backgroundColor: WHITE,
    borderColor: "rgba(17, 24, 39, 0.1)",
    textColor: TEXT_DARK,
    prismPrimary: PRIMARY_BLUE,
  },
} as const;

export function DiamondCreditIcon({
  primaryColor,
  monochrome = false,
  size = 18,
}: {
  primaryColor: string;
  monochrome?: boolean;
  size?: number;
}) {
  const width = size;
  const height = size;

  return (
    <View accessibilityElementsHidden pointerEvents="none" style={[styles.creditIconWrap, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 18 18">
        <Path
          d="M5.108 2.25h7.784l3.108 4.07L9 15.75 1.999 6.32l3.109-4.07Z"
          fill={primaryColor}
        />
        <Path
          d="M5.108 2.25 9 6.32l3.892-4.07"
          stroke={monochrome ? primaryColor : PRIMARY_BLUE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
        />
        <Path
          d="M1.999 6.32h14.001"
          stroke={monochrome ? primaryColor : PREMIUM_BLUE_DEEP}
          strokeLinecap="round"
          strokeWidth={1}
        />
        <Path
          d="M5.108 2.25 9 15.75 12.892 2.25"
          stroke={monochrome ? primaryColor : WHITE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={0.9}
          opacity={0.95}
        />
      </Svg>
    </View>
  );
}

export function ElitePassLineIcon({
  color = PRIMARY_PURPLE,
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.5 19.5h11M8.2 19.5V8.9L12 4.5l3.8 4.4v10.6M9.9 10.2h4.2M9.9 13.2h4.2M9.9 16.2h4.2"
        fill="transparent"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.25}
      />
    </Svg>
  );
}

export function DiamondCreditPill({
  count,
  streakCount,
  variant = "dark",
  accessibilityLabel = "Credits",
  accessibilityRole = "button",
  iconOnly = false,
  onPress,
  onElitePassPress,
  style,
}: DiamondCreditPillProps) {
  const isRTL = I18nManager.isRTL;
  const palette = VARIANT_STYLES[variant];
  const normalizedStreakCount = typeof streakCount === "number" && streakCount > 0 ? Math.floor(streakCount) : 0;
  const content = (
    <>
      <DiamondCreditIcon primaryColor={palette.prismPrimary} size={iconOnly ? 22 : 18} />
      {iconOnly ? null : <Text style={[styles.countText, { color: palette.textColor }]}>{count}</Text>}
      {!iconOnly && normalizedStreakCount > 0 && !onElitePassPress ? (
        <View style={styles.streakWrap}>
          <ElitePassLineIcon color={palette.prismPrimary} size={14} />
          <Text accessibilityElementsHidden style={styles.flameIcon}>
            🔥
          </Text>
          <Text style={[styles.streakText, { color: palette.textColor }]}>{normalizedStreakCount}</Text>
        </View>
      ) : null}
    </>
  );

  const pillStyle = [
    styles.pill,
    iconOnly ? styles.iconOnlyPill : null,
    isRTL ? styles.pillRtl : null,
    onElitePassPress ? styles.pillWithElitePass : null,
    {
      backgroundColor: palette.backgroundColor,
      borderColor: palette.borderColor,
    },
    style,
  ];

  if (onElitePassPress) {
    return (
      <View style={pillStyle}>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole={accessibilityRole}
          disabled={!onPress}
          hitSlop={10}
          onPress={onPress}
          style={styles.creditAction}
        >
          {content}
        </Pressable>

        <View pointerEvents="none" style={styles.headerDivider} />

        <Pressable
          accessibilityLabel="Open Elite Pass"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onElitePassPress}
          style={({ pressed }) => [
            styles.elitePassButton,
            pressed ? styles.elitePassButtonPressed : null,
          ]}
        >
          <ElitePassLineIcon color={PRIMARY_PURPLE} size={18} />
        </Pressable>
      </View>
    );
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        hitSlop={10}
        onPress={onPress}
        style={pillStyle}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={pillStyle}>{content}</View>;
}

export function ProBadge({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.proBadge, style]}>
      <View style={styles.proGlow} />
      <Text style={styles.proText}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 76,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: "continuous",
    ...ambientShadow(0.06, 12, 8),
  },
  iconOnlyPill: {
    minWidth: 44,
    width: 44,
    minHeight: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  pillRtl: {
    flexDirection: "row-reverse",
  },
  pillWithElitePass: {
    gap: 15,
  },
  creditAction: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  elitePassButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(123, 97, 255, 0.26)",
    backgroundColor: "rgba(123, 97, 255, 0.08)",
  },
  headerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: 0,
    backgroundColor: "rgba(123, 97, 255, 0.22)",
  },
  elitePassButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  countText: {
    fontSize: 15,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    textAlign: "center",
    ...fonts.bold,
  },
  streakWrap: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingLeft: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(100, 116, 139, 0.22)",
  },
  flameIcon: {
    width: 0,
    opacity: 0,
    fontSize: 0,
    lineHeight: 0,
    includeFontPadding: false,
  },
  streakText: {
    fontSize: 13,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    textAlign: "center",
    ...fonts.bold,
  },
  creditIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  proBadge: {
    minHeight: 40,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(123, 97, 255, 0.28)",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderCurve: "continuous",
    ...ambientShadow(0.08, 14, 10),
    overflow: "hidden",
  },
  proGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(90, 200, 250, 0.12)",
  },
  proText: {
    color: PRIMARY_PURPLE,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.3,
    ...fonts.bold,
  },
});
