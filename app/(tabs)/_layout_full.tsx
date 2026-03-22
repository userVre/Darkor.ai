import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { Tabs } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle } from "lucide-react-native";

type TabButtonProps = PressableProps & {
  children?: ReactNode;
};

function TabBarButton({ children, style, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      style={style}
      android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
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
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "rgba(255, 255, 255, 0.08)",
          borderTopWidth: 0.5,
          height: 78,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarHideOnKeyboard: true,
        lazy: true,
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
          tabBarStyle: { display: "none" },
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
        name="settings"
        options={{
          title: "My Profile",
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
        }}
      />

      <Tabs.Screen name="home.full" options={{ href: null }} />
      <Tabs.Screen name="workspace.full" options={{ href: null }} />
    </Tabs>
  );
}
