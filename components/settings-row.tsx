import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { ArrowRight } from "lucide-react-native";
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
      <Icon color={iconColor} size={20} strokeWidth={2.2} style={styles.leftIcon} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>

      {loading ? <ActivityIndicator color={loadingColor} style={styles.spinner} /> : null}
      {!loading && showChevron ? <ArrowRight color="#A0A0A0" size={20} strokeWidth={2.2} style={styles.chevron} /> : null}
      {!loading ? rightAccessory : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "relative",
    height: 76,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  leftIcon: {
    position: "absolute",
    left: 20,
    top: 28,
  },
  label: {
    marginLeft: 52,
    marginTop: 32,
    marginBottom: 32,
    fontSize: 15,
    lineHeight: 15,
    ...fonts.medium,
  },
  chevron: {
    position: "absolute",
    right: 16,
    top: 24,
  },
  spinner: {
    position: "absolute",
    right: 16,
    top: 28,
  },
});
