import {useTheme} from "@/styles/theme";
import {Tabs, usePathname} from "expo-router";
import {Compass, Flame, House, UserRound, type LucideIcon} from "lucide-react-native";
import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Pressable, View, type PressableProps} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {spacing} from "../../styles/spacing";
import {fonts} from "../../styles/typography";

import {useFlowUI} from "../../components/flow-ui-context";
const ACTIVE_TAB_COLOR = "#111111";

export const DEFAULT_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "#FFFFFF",
  height: 74,
  paddingTop: 7,
  paddingBottom: 8,
  paddingHorizontal: spacing.sm,
  borderTopWidth: 0,
  borderTopColor: "transparent",
  borderRadius: 0,
  boxShadow: "0px -4px 18px rgba(0, 0, 0, 0.05)",
  elevation: 5,
};

type TabButtonProps = PressableProps & {
  children?: ReactNode;
};

function TabBarButton({ children, style, ...props }: TabButtonProps) {
  const colors = useTheme();

  return (
    <Pressable
      {...props}
      className="cursor-pointer"
      style={(state) => {
        const resolvedStyle = typeof style === "function" ? style(state) : style;
        return [resolvedStyle, { cursor: "pointer" as any }];
      }}
      android_ripple={{ color: colors.borderLight, borderless: false }}
    >
      {children}
    </Pressable>
  );
}

function TabIcon({
  Icon,
  color,
  size,
  focused,
}: {
  Icon: LucideIcon;
  color: string;
  size: number;
  focused: boolean;
}) {
  const colors = useTheme();

  return (
    <View style={{ width: 48, height: 30, alignItems: "center", justifyContent: "center" }}>
      {focused ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.brandSurfaceHigh,
          }}
        />
      ) : null}

      <View
        style={{
          minWidth: 34,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
          backgroundColor: "transparent",
        }}
      >
        <Icon color={color} size={size} strokeWidth={focused ? 1.7 : 1.5} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isFlowActive } = useFlowUI();
  const insets = useSafeAreaInsets();
  const shouldHideTabBar = (pathname === "/workspace" || pathname === "/create") && isFlowActive;
  const tabBarBottomPadding = Math.max(insets.bottom, 20);
  const colors = useTheme();
  const activeTabColor = colors.isDark ? "#FFFFFF" : ACTIVE_TAB_COLOR;
  const inactiveTabColor = colors.isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.35)";
  const tabBarStyle = {
    ...DEFAULT_TAB_BAR_STYLE,
    backgroundColor: colors.surfaceOverlay,
    borderTopWidth: 0,
    borderTopColor: "transparent",
    height: 66 + tabBarBottomPadding,
    paddingBottom: tabBarBottomPadding,
    boxShadow: colors.isDark ? "0px -4px 22px rgba(0, 0, 0, 0.30)" : "0px -4px 18px rgba(0, 0, 0, 0.05)",
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: activeTabColor,
        tabBarInactiveTintColor: inactiveTabColor,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          ...fonts.semibold,
        },
        tabBarStyle: shouldHideTabBar ? { display: "none" } : tabBarStyle,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.tools"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={House} color={color} size={21} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="elite-pass"
        options={{
          title: t("tabs.elitePass"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Flame} color={color} size={21} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t("tabs.discover"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Compass} color={color} size={21} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={UserRound} color={color} size={21} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

