import {useRouter} from "expo-router";
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {I18nManager, StyleSheet, View, type StyleProp, type ViewStyle} from "react-native";
import {Appbar, Badge, Button, Chip, IconButton, Text} from "react-native-paper";

import {md3Spacing} from "../constants/md3Theme";
import {triggerHaptic} from "../lib/haptics";
import {
getDirectionalAlignment,
getDirectionalOppositeAlignment,
getDirectionalRow,
} from "../lib/i18n/rtl";
import {useTheme, type Theme} from "../styles/theme";
import {useDiamondStore} from "./diamond-store-context";
import {useViewerCredits} from "./viewer-credits-context";

export function HomeHeaderPills({
  style,
  title,
}: {
  style?: StyleProp<ViewStyle>;
  title?: string;
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
      <Appbar.Header elevated mode="center-aligned" style={[styles.appbar, style]}>
        {title ? <Appbar.Content title={title} titleStyle={styles.appbarTitle} /> : null}
        <View style={[styles.sideSlot, {alignItems: getDirectionalAlignment(isRTL)}]}>
          {hasPaidAccess ? (
            <Chip compact icon="fire" mode="flat" style={styles.eliteChip} textStyle={styles.chipText}>
              Elite Pass
            </Chip>
          ) : (
            <View style={styles.iconBadgeWrap}>
              <IconButton
              accessibilityLabel={t("home.accessibility.openCredits")}
              icon="diamond-stone"
              mode="contained-tonal"
              onPress={handleCreditsPress}
              size={20}
              style={styles.iconButton}
            />
              <Badge style={styles.badge}>{credits}</Badge>
            </View>
          )}
        </View>

        <View style={[styles.sideSlot, {alignItems: getDirectionalOppositeAlignment(isRTL)}]}>
          <Button
            accessibilityLabel={t("settings.upgradePro")}
            icon="diamond-stone"
            mode="contained-tonal"
            onPress={handleUpgradeProPress}
            style={styles.upgradeProButton}
            contentStyle={[styles.upgradeProContent, {flexDirection: getDirectionalRow(isRTL)}]}
            labelStyle={styles.upgradeProText}
          >
            {t("settings.upgradePro")}
          </Button>
        </View>
      </Appbar.Header>
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
    appbar: {
      minHeight: 64,
      paddingHorizontal: 0,
      backgroundColor: theme.paperTheme.colors.surface,
    },
    appbarTitle: {
      color: theme.paperTheme.colors.onSurface,
      ...theme.paperTheme.fonts.titleLarge,
      textAlign: "center",
    },
    sideSlot: {
      minWidth: 56,
      flexShrink: 0,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    eliteChip: {
      backgroundColor: theme.paperTheme.colors.secondaryContainer,
    },
    chipText: {
      color: theme.paperTheme.colors.onSecondaryContainer,
      letterSpacing: 0,
    },
    iconBadgeWrap: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButton: {
      margin: 0,
    },
    badge: {
      position: "absolute",
      top: md3Spacing.extraSmall,
      right: md3Spacing.extraSmall,
      backgroundColor: theme.paperTheme.colors.error,
      color: theme.paperTheme.colors.onError,
    },
    upgradeProButton: {
      borderRadius: 20,
    },
    upgradeProContent: {
      minHeight: 40,
      paddingHorizontal: md3Spacing.small,
    },
    upgradeProText: {
      color: theme.paperTheme.colors.onSecondaryContainer,
      letterSpacing: 0,
    },
  });
}
