import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { Tabs } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "lucide-react-native";

const ACTIVE_TINT = "#ffffff";
const INACTIVE_TINT = "rgba(255,255,255,0.44)";

type TabButtonProps = PressableProps & {
  children?: ReactNode;
};

function TabBarButton({ children, style, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      className="cursor-pointer"
      android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: false }}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export default function TabsLayout() {
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
          paddingVertical: 6,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "transparent",
          borderTopWidth: 0,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        sceneStyle: {
          backgroundColor: "#000000",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tools",
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarIcon: ({ color, size }) => <UserCircle2 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
