import {useRouter} from "expo-router";
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {I18nManager, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from "react-native";

import {DS} from "../lib/design-system";
import {triggerHaptic} from "../lib/haptics";
import {
getDirectionalAlignment,
getDirectionalOppositeAlignment,
getDirectionalRow,
} from "../lib/i18n/rtl";
import {useTheme, type Theme} from "../styles/theme";
import {useDiamondStore} from "./diamond-store-context";
import {ProBadge} from "./diamond-credit-pill";
import {useViewerCredits} from "./viewer-credits-context";

const HEADER_PILL_HEIGHT = 36;
const DIAMOND_EMOJI = "\u{1F48E}";

export function HomeHeaderPills({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {t} = useTranslation();
  const {credits, hasPaidAccess} = useViewerCredits();
  const {openStore} = useDiamondStore();
  const isRTL = I18nManager.isRTL;

  const handleCreditsPress = () => {
    triggerHaptic();
    openStore();
  };

  const handleUpgradeProPress = () => {
    triggerHaptic();
    router.push({pathname: "/paywall", params: {source: "tools-upgrade"}} as any);
  };

  return (
      <View style={[styles.headerRow, {flexDirection: getDirectionalRow(isRTL)}, style]}>
        <View style={[styles.sideSlot, {alignItems: getDirectionalAlignment(isRTL)}]}>
          {hasPaidAccess ? (
            <ProBadge style={styles.creditPill} />
          ) : (
            <Pressable
              accessibilityLabel={t("home.accessibility.openCredits")}
              accessibilityRole="button"
              hitSlop={10}
              onPress={handleCreditsPress}
              style={styles.creditPill}
            >
              <Text style={styles.creditPillText}>{`${DIAMOND_EMOJI} ${credits}`}</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.sideSlot, {alignItems: getDirectionalOppositeAlignment(isRTL)}]}>
          <Pressable
            accessibilityLabel={t("settings.upgradePro")}
            accessibilityRole="button"
            onPress={handleUpgradeProPress}
            style={[styles.upgradeProButton, {flexDirection: getDirectionalRow(isRTL)}]}
          >
            <Text numberOfLines={1} style={styles.upgradeProText}>
              {`${DIAMOND_EMOJI} ${t("settings.upgradePro")}`}
            </Text>
          </Pressable>
        </View>
      </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 48,
      gap: 8,
    },
    sideSlot: {
      minWidth: 64,
      flexShrink: 0,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    creditPill: {
      height: HEADER_PILL_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: theme.surfaceHigh,
    },
    creditPillText: {
      ...DS.typography.button,
      color: theme.textPrimary,
      fontSize: 13,
      lineHeight: 16,
      fontVariant: ["tabular-nums"],
      fontWeight: "700",
      letterSpacing: 0,
    },
    upgradeProButton: {
      minWidth: 138,
      height: HEADER_PILL_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceHigh,
    },
    upgradeProText: {
      ...DS.typography.button,
      color: theme.textPrimary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      letterSpacing: 0,
    },
  });
}
