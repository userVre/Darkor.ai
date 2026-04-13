import type { ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "@/components/material-icons";
import { useAuth } from "@clerk/expo";
import { useTranslation } from "react-i18next";
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
  backgroundColor: "#FFFDFC",
  borderTopColor: "#E7E3DE",
  borderTopWidth: 1,
  borderWidth: HAIRLINE,
  borderColor: "#ECE6DF",
  height: 82,
  paddingTop: 12,
  paddingBottom: 12,
  paddingHorizontal: spacing.sm,
  borderRadius: 28,
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
  return (
    <View style={{ width: 50, height: 38, alignItems: "center", justifyContent: "center" }}>
      {focused ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(231,162,162,0.32)",
          }}
        />
      ) : null}

      <View
        style={{
          minWidth: 42,
          height: 32,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
          borderWidth: HAIRLINE,
          borderColor: focused ? "#F1CACA" : "transparent",
          backgroundColor: focused ? "#FFF1F1" : "transparent",
        }}
      >
        <Icon color={color} size={size} strokeWidth={focused ? 2.25 : 2.05} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isFlowActive } = useFlowUI();
  const { isSignedIn } = useAuth();
  const canOpenCreateTab = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#A62828",
        tabBarInactiveTintColor: "#7D848E",
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 12,
          ...fonts.medium,
        },
        tabBarStyle: isFlowActive ? { display: "none" } : DEFAULT_TAB_BAR_STYLE,
        sceneStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.tools"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={LayoutGrid} color={color} size={22} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: t("tabs.create"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Sparkles} color={color} size={22} focused={focused} />,
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
          title: t("tabs.discover"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Compass} color={color} size={22} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={UserCircle2} color={color} size={22} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

