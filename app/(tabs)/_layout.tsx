import { Tabs } from "expo-router";
import { CreditCard, GalleryHorizontalEnd, Sparkles } from "lucide-react-native";

import Logo from "../../components/logo";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#27272a",
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#f4f4f5",
        tabBarInactiveTintColor: "#71717a",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <Logo size={focused ? 22 : 20} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Workspace",
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color, size }) => <GalleryHorizontalEnd color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

