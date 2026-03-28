import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "lucide-react-native";
import { useAuth } from "@clerk/expo";

import { DS, HAIRLINE, glowShadow } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";

const ACTIVE_TINT = DS.colors.accentStrong;
const INACTIVE_TINT = "rgba(255,255,255,0.42)";
export const DEFAULT_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 14,
  backgroundColor: "#000000",
  borderTopColor: DS.colors.borderSubtle,
  borderTopWidth: HAIRLINE,
  borderWidth: HAIRLINE,
  borderColor: DS.colors.borderSubtle,
  height: 78,
  paddingTop: 10,
  paddingBottom: 12,
  paddingHorizontal: 8,
  borderRadius: 26,
  elevation: 0,
  shadowOpacity: 0,
  ...glowShadow("rgba(0,0,0,0.42)", 30),
};

type TabButtonProps = PressableProps & {
  children?: ReactNode;
};

function TabBarButton({ children, style, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      className="cursor-pointer"
      style={(state) => {
        const resolvedStyle = typeof style === "function" ? style(state) : style;
        return [resolvedStyle, { cursor: "pointer" as any }];
      }}
      android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: false }}
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
    <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
      {focused ? (
        <LinearGradient
          colors={["rgba(168,85,247,0.2)", "rgba(99,102,241,0.06)"]}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <Icon color={color} size={size} strokeWidth={focused ? 2.45 : 2.2} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const canOpenCreateTab = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarInactiveTintColor: INACTIVE_TINT,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 8,
        },
        tabBarIconStyle: {
          marginBottom: 6,
        },
        tabBarLabelStyle: {
          ...DS.typography.bodySm,
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: DEFAULT_TAB_BAR_STYLE,
        sceneStyle: {
          backgroundColor: "#000000",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tools",
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={LayoutGrid} color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={Sparkles} color={color} size={size} focused={focused} />,
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
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={Compass} color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={UserCircle2} color={color} size={size} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    overflow: "hidden",
  },
  iconWrapActive: {
    borderWidth: HAIRLINE,
    borderColor: "rgba(168,85,247,0.18)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
});
