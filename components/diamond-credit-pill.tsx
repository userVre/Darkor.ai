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

import {ambientShadow, organicRadii} from "../lib/design-system";
import {fonts} from "../styles/typography";

type DiamondCreditPillProps = {
  count: number;
  streakCount?: number;
  variant?: "dark" | "light";
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  onPress?: () => void;
  onElitePassPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const DIAMOND_PILL_BLUE = "#007AFF";
export const RADIX_BLUE_9 = "#0090FF";

const VARIANT_STYLES = {
  dark: {
    backgroundColor: "#09090B",
    borderColor: "rgba(255,255,255,0.08)",
    textColor: "#FFFFFF",
    prismPrimary: DIAMOND_PILL_BLUE,
  },
  light: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0,122,255,0.12)",
    textColor: DIAMOND_PILL_BLUE,
    prismPrimary: DIAMOND_PILL_BLUE,
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
          stroke={monochrome ? primaryColor : "#7DCBFF"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
        />
        <Path
          d="M1.999 6.32h14.001"
          stroke={monochrome ? primaryColor : "#005BBB"}
          strokeLinecap="round"
          strokeWidth={1}
        />
        <Path
          d="M5.108 2.25 9 15.75 12.892 2.25"
          stroke={monochrome ? primaryColor : "#D8EEFF"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={0.9}
          opacity={0.95}
        />
      </Svg>
    </View>
  );
}

export function ElitePassFlameIcon({
  color = RADIX_BLUE_9,
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12.12 22c-3.92 0-6.95-2.82-6.95-6.61 0-2.46 1.25-4.49 3.48-6.37 1.78-1.5 2.72-3.18 2.82-5.02.01-.29.34-.46.58-.29 2.93 2.08 4.24 4.35 3.93 6.8 1.02-.61 1.74-1.48 2.15-2.61.1-.28.47-.35.66-.11 1.37 1.68 2.06 3.44 2.06 5.28 0 5.21-3.9 8.93-8.73 8.93Z"
        fill={color}
      />
      <Path
        d="M12.34 20.28c-2.02 0-3.54-1.43-3.54-3.32 0-1.25.63-2.29 1.75-3.24.9-.76 1.38-1.61 1.43-2.55.01-.22.27-.34.45-.21 1.52 1.08 2.19 2.26 2 3.54.51-.31.87-.75 1.08-1.32.08-.2.34-.25.48-.08.7.86 1.05 1.76 1.05 2.7 0 2.75-2.09 4.48-4.7 4.48Z"
        fill="#FFFFFF"
        opacity={0.82}
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
  onPress,
  onElitePassPress,
  style,
}: DiamondCreditPillProps) {
  const isRTL = I18nManager.isRTL;
  const palette = VARIANT_STYLES[variant];
  const normalizedStreakCount = typeof streakCount === "number" && streakCount > 0 ? Math.floor(streakCount) : 0;
  const content = (
    <>
      <DiamondCreditIcon primaryColor={palette.prismPrimary} />
      <Text style={[styles.countText, { color: palette.textColor }]}>{count}</Text>
      {normalizedStreakCount > 0 && !onElitePassPress ? (
        <View style={styles.streakWrap}>
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
    isRTL ? styles.pillRtl : null,
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
          <ElitePassFlameIcon color={RADIX_BLUE_9} size={18} />
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
    ...organicRadii(20, 14),
    ...ambientShadow(0.06, 12, 8),
  },
  pillRtl: {
    flexDirection: "row-reverse",
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
    marginLeft: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RADIX_BLUE_9,
    backgroundColor: "#FFFFFF",
    boxShadow: `0px 0px 16px ${RADIX_BLUE_9}40`,
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
    fontSize: 14,
    lineHeight: 17,
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
    borderColor: "rgba(56, 189, 248, 0.45)",
    backgroundColor: "#082F49",
    ...organicRadii(20, 14),
    ...ambientShadow(0.16, 16, 12),
    overflow: "hidden",
  },
  proGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 211, 238, 0.16)",
  },
  proText: {
    color: "#BAE6FD",
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 1.2,
    ...fonts.bold,
  },
});
