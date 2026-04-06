import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, type PressableProps } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "@/components/material-icons";
import { useAuth } from "@clerk/expo";
import { fonts } from "../../styles/typography";
import { spacing } from "../../styles/spacing";
import { useTheme } from "@/styles/theme";

import { DS, HAIRLINE } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { useFlowUI } from "../../components/flow-ui-context";

export const DEFAULT_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 14,
  backgroundColor: "#FFFFFF",
  borderTopColor: "#E8E8E8",
  borderTopWidth: HAIRLINE,
  borderWidth: HAIRLINE,
  borderColor: "#E8E8E8",
  height: 74,
  paddingTop: 10,
  paddingBottom: 10,
  paddingHorizontal: spacing.sm,
  borderRadius: 26,
  elevation: 0,
  shadowOpacity: 0,
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
  Icon: typeof LayoutGrid;
  color: string;
  size: number;
  focused: boolean;
}) {
  return <Icon color={color} size={size} strokeWidth={focused ? 2.2 : 2.05} />;
}

export default function TabsLayout() {
  const colors = useTheme();
  const router = useRouter();
  const { isFlowActive } = useFlowUI();
  const { isSignedIn } = useAuth();
  const canOpenCreateTab = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const defaultTabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: 16,
      right: 16,
      bottom: 14,
      backgroundColor: "#FFFFFF",
      borderTopColor: "#E8E8E8",
      borderTopWidth: HAIRLINE,
      borderWidth: HAIRLINE,
      borderColor: "#E8E8E8",
      height: 74,
      paddingTop: 10,
      paddingBottom: 10,
      paddingHorizontal: spacing.sm,
      borderRadius: 26,
      elevation: 0,
      shadowOpacity: 0,
    }),
    [],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#0A0A0A",
        tabBarInactiveTintColor: "#B0B0B0",
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 10,
          ...fonts.medium,
        },
        tabBarStyle: isFlowActive ? { display: "none" } : defaultTabBarStyle,
        sceneStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tools",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={LayoutGrid} color={color} size={24} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Create",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Sparkles} color={color} size={24} focused={focused} />,
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              onPress={(event) => {
                if (!canOpenCreateTab) {
                  event.preventDefault();
                  triggerHaptic();
                  router.push({ pathname: "/sign-in", params: { returnTo: "/workspace" } });
                  return;
                }

                props.onPress?.(event);
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Compass} color={color} size={24} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={UserCircle2} color={color} size={24} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

