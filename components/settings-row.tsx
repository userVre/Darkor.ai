import { ActivityIndicator, I18nManager, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronRight } from "@/components/material-icons";
import type { ComponentType, ReactNode } from "react";

import { useLocalizedAppFonts } from "../lib/i18n";
import { DS } from "../lib/design-system";
import { getDirectionalArrowScale, getDirectionalRow, getDirectionalTextAlign } from "../lib/i18n/rtl";
import { fonts } from "../styles/typography";

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
  iconColor = DS.colors.textPrimary,
  textColor = DS.colors.textPrimary,
  onPress,
  showChevron = true,
  rightAccessory,
  loading = false,
  loadingColor = DS.colors.textPrimary,
  disabled = false,
  style,
}: SettingsRowProps) {
  const localizedFonts = useLocalizedAppFonts();
  const isRTL = I18nManager.isRTL;
  const isInteractive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      accessibilityRole={isInteractive ? "button" : undefined}
      disabled={!isInteractive}
      onPress={() => {
        void onPress?.();
      }}
      style={[styles.row, { flexDirection: getDirectionalRow(isRTL) }, style]}
    >
      <View style={[styles.leftSide, { flexDirection: getDirectionalRow(isRTL) }]}>
        <Icon color={iconColor} size={20} strokeWidth={2.1} />
        <Text
          numberOfLines={2}
          style={[
            styles.label,
            localizedFonts.medium,
            { color: textColor, textAlign: getDirectionalTextAlign(isRTL) },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={[styles.rightSide, { flexDirection: getDirectionalRow(isRTL) }]}>
        {loading ? <ActivityIndicator color={loadingColor} /> : null}
        {!loading ? rightAccessory : null}
        {!loading && showChevron ? (
          <ChevronRight
            color={DS.colors.textMuted}
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
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.surfaceHigh,
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

