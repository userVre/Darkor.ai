import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";

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
  iconColor = "#0A0A0A",
  textColor = "#0A0A0A",
  onPress,
  showChevron = true,
  rightAccessory,
  loading = false,
  loadingColor = "#0A0A0A",
  disabled = false,
  style,
}: SettingsRowProps) {
  const isInteractive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      accessibilityRole={isInteractive ? "button" : undefined}
      disabled={!isInteractive}
      onPress={() => {
        void onPress?.();
      }}
      style={[styles.row, style]}
    >
      <View style={styles.leftSide}>
        <Icon color={iconColor} size={20} strokeWidth={2.1} />
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>

      <View style={styles.rightSide}>
        {loading ? <ActivityIndicator color={loadingColor} /> : null}
        {!loading ? rightAccessory : null}
        {!loading && showChevron ? <ChevronRight color="#B8B8B8" size={18} strokeWidth={1.9} /> : null}
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
    borderColor: "#EFEFEF",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
