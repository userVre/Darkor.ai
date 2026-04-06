import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "@/components/material-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  left?: number;
  right?: number;
  onPress: () => void;
  icon: typeof LayoutGrid;
};

function NavItem({ icon: Icon, label, active, left, right, onPress }: NavItemProps) {
  const color = active ? "#0A0A0A" : "#B0B0B0";

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.item, left !== undefined ? { left } : { right }]}>
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
  return (
    <View style={styles.bar}>
      <NavItem icon={LayoutGrid} label="Tools" active={activeTab === "tools"} left={44} onPress={onToolsPress} />
      <NavItem icon={Sparkles} label="Create" active={activeTab === "create"} left={132} onPress={onCreatePress} />
      <NavItem icon={Compass} label="Discover" active={activeTab === "discover"} left={224} onPress={onDiscoverPress} />
      <NavItem icon={UserCircle2} label="My Profile" active={activeTab === "profile"} right={48} onPress={onProfilePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "relative",
    height: 64,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    backgroundColor: "#FFFFFF",
  },
  item: {
    position: "absolute",
    top: 12,
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

