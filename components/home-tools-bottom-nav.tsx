import { Compass, House, Sparkles, UserRound, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { DS } from "../lib/design-system";
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
  const color = active ? DS.colors.accent : DS.colors.textSecondary;

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
    height: 86,
    backgroundColor: "rgba(255,255,255,0.88)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    boxShadow: "0px 10px 30px rgba(17, 19, 24, 0.05)",
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: DS.colors.accentSurface,
  },
  iconPill: {
    minWidth: 46,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  iconPillActive: {
    backgroundColor: DS.colors.accentSurface,
  },
  iconPillIdle: {
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 10,
    lineHeight: 10,
    ...fonts.medium,
  },
  labelActive: {
    color: DS.colors.textPrimary,
  },
  labelInactive: {
    color: DS.colors.textSecondary,
  },
});

