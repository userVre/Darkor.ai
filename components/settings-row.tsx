import {ChevronRight} from "@/components/material-icons";
import type {ComponentType, ReactNode} from "react";
import {I18nManager, StyleSheet, View, type StyleProp, type ViewStyle} from "react-native";
import {ActivityIndicator, List, TouchableRipple, useTheme as usePaperTheme} from "react-native-paper";

import {md3Shapes, md3Spacing} from "../constants/md3Theme";
import {getDirectionalArrowScale} from "../lib/i18n/rtl";
import {useTheme} from "../styles/theme";

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
  const paperTheme = usePaperTheme();
  const isRTL = I18nManager.isRTL;
  const isInteractive = Boolean(onPress) && !disabled;
  const resolvedIconColor = iconColor ?? paperTheme.colors.onSurfaceVariant;
  const resolvedTextColor = textColor ?? paperTheme.colors.onSurface;
  const resolvedLoadingColor = loadingColor ?? paperTheme.colors.primary;

  return (
    <TouchableRipple
      borderless={false}
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
          backgroundColor: theme.paperTheme.colors.elevation.level1,
          borderColor: theme.paperTheme.colors.outlineVariant,
        },
        style,
      ]}
    >
      <List.Item
        title={label}
        titleNumberOfLines={2}
        titleStyle={[styles.label, {color: resolvedTextColor}]}
        left={() => <Icon color={resolvedIconColor} size={24} strokeWidth={2} />}
        right={() => (
          <View style={styles.rightSide}>
            {loading ? <ActivityIndicator color={resolvedLoadingColor} /> : null}
            {!loading ? rightAccessory : null}
            {!loading && showChevron ? (
              <ChevronRight
                color={paperTheme.colors.onSurfaceVariant}
                size={20}
                strokeWidth={1.9}
                style={{transform: [{scaleX: getDirectionalArrowScale(isRTL)}]}}
              />
            ) : null}
          </View>
        )}
        style={styles.listItem}
      />
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: md3Spacing.large,
    marginBottom: md3Spacing.medium,
    borderRadius: md3Shapes.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  listItem: {
    minHeight: 72,
    paddingHorizontal: md3Spacing.large,
    paddingVertical: md3Spacing.small,
  },
  label: {
    letterSpacing: 0,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: md3Spacing.small,
    flexShrink: 1,
    minWidth: 0,
  },
});
