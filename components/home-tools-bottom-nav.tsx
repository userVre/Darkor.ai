import { Compass, House, Sparkles, UserRound, type LucideIcon } from "lucide-react-native";
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
  icon: LucideIcon;
};

function NavItem({ icon: Icon, label, active, onPress }: NavItemProps) {
  const color = active ? "#A62828" : "#77808B";

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.item}>
      <View style={styles.iconFrame}>
        {active ? <View pointerEvents="none" style={styles.iconGlow} /> : null}
        <View style={[styles.iconPill, active ? styles.iconPillActive : styles.iconPillIdle]}>
          <Icon color={color} size={21} strokeWidth={active ? 1.7 : 1.5} />
        </View>
      </View>
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{label}</Text>
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
      <NavItem icon={House} label={t("tabs.tools")} active={activeTab === "tools"} onPress={onToolsPress} />
      <NavItem icon={Sparkles} label={t("tabs.create")} active={activeTab === "create"} onPress={onCreatePress} />
      <NavItem icon={Compass} label={t("tabs.discover")} active={activeTab === "discover"} onPress={onDiscoverPress} />
      <NavItem icon={UserRound} label={t("tabs.profile")} active={activeTab === "profile"} onPress={onProfilePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 72,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7E3DE",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  iconFrame: {
    width: 48,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlow: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(231,162,162,0.32)",
  },
  iconPill: {
    minWidth: 42,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconPillActive: {
    borderColor: "#F1CACA",
    backgroundColor: "#FFF1F1",
  },
  iconPillIdle: {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 10,
    lineHeight: 10,
    ...fonts.medium,
  },
  labelActive: {
    color: "#0A0A0A",
  },
  labelInactive: {
    color: "#7D848E",
  },
});

