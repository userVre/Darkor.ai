import {ChevronRight} from "@/components/material-icons";
import type {ComponentType, ReactNode} from "react";
import {ActivityIndicator, I18nManager, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from "react-native";

import {useLocalizedAppFonts} from "../lib/i18n";
import {getDirectionalArrowScale, getDirectionalRow, getDirectionalTextAlign} from "../lib/i18n/rtl";
import {useTheme} from "../styles/theme";
import {fonts} from "../styles/typography";

type SettingsRowProps = {
  label: string;
  icon: ComponentType<any>;
  iconColor?: string;
  textColor?: string;
  onPress?: () => void | Promise<void>;
  showChevron?: boolean;
  rightAccessory?: ReactNode;
  loading?: boolean;
  loadingColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SettingsRow({
  label,
  icon: Icon,
  iconColor,
  textColor,
  onPress,
  showChevron = true,
  rightAccessory,
  loading = false,
  loadingColor,
  disabled = false,
  style,
}: SettingsRowProps) {
  const theme = useTheme();
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = I18nManager.isRTL;
  const isInteractive = Boolean(onPress) && !disabled;
  const resolvedIconColor = iconColor ?? theme.textPrimary;
  const resolvedTextColor = textColor ?? theme.textPrimary;
  const resolvedLoadingColor = loadingColor ?? theme.textPrimary;

  return (
    <Pressable
      accessibilityRole={isInteractive ? "button" : undefined}
      disabled={!isInteractive}
      onPress={() => {
        try {
          const result = onPress?.();
          void Promise.resolve(result).catch(() => undefined);
        } catch {
          // Keep settings rows from crashing the current screen on tap.
        }
      }}
      style={[
        styles.row,
        {
          backgroundColor: theme.surfaceHigh,
          borderColor: theme.border,
          flexDirection: getDirectionalRow(isRTL),
        },
        style,
      ]}
    >
      <View style={[styles.leftSide, { flexDirection: getDirectionalRow(isRTL) }]}>
        <Icon color={resolvedIconColor} size={20} strokeWidth={2.1} />
        <Text
          numberOfLines={2}
          style={[
            styles.label,
            localizedFonts.medium,
            { color: resolvedTextColor, textAlign: getDirectionalTextAlign(isRTL) },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={[styles.rightSide, { flexDirection: getDirectionalRow(isRTL) }]}>
        {loading ? <ActivityIndicator color={resolvedLoadingColor} /> : null}
        {!loading ? rightAccessory : null}
        {!loading && showChevron ? (
          <ChevronRight
          color={theme.textMuted}
            size={18}
            strokeWidth={1.9}
            style={{ transform: [{ scaleX: getDirectionalArrowScale(isRTL) }] }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSide: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
});

