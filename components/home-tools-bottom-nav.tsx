import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "@/components/material-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { fonts } from "../styles/typography";

type HomeToolsBottomNavProps = {
  activeTab: "tools" | "create" | "discover" | "profile";
  onToolsPress: () => void;
  onCreatePress: () => void;
  onDiscoverPress: () => void;
  onProfilePress: () => void;
};

type NavItemProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: typeof LayoutGrid;
};

function NavItem({ icon: Icon, label, active, onPress }: NavItemProps) {
  const color = active ? "#0A0A0A" : "#B0B0B0";

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.item}>
      <Icon color={color} size={24} strokeWidth={2.15} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function HomeToolsBottomNav({
  activeTab,
  onToolsPress,
  onCreatePress,
  onDiscoverPress,
  onProfilePress,
}: HomeToolsBottomNavProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.bar}>
      <NavItem icon={LayoutGrid} label={t("tabs.tools")} active={activeTab === "tools"} onPress={onToolsPress} />
      <NavItem icon={Sparkles} label={t("tabs.create")} active={activeTab === "create"} onPress={onCreatePress} />
      <NavItem icon={Compass} label={t("tabs.discover")} active={activeTab === "discover"} onPress={onDiscoverPress} />
      <NavItem icon={UserCircle2} label={t("tabs.profile")} active={activeTab === "profile"} onPress={onProfilePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },
  item: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 10,
    lineHeight: 10,
    ...fonts.medium,
  },
});

