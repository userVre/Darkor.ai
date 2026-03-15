import { Tabs } from "expo-router";

export default function TabsLayoutDiagnostic() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "rgba(255, 255, 255, 0.08)",
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#f8fafc",
        tabBarInactiveTintColor: "#52525b",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Tools" }} />
      <Tabs.Screen name="workspace" options={{ title: "Create" }} />
      <Tabs.Screen name="gallery" options={{ title: "Discover" }} />
      <Tabs.Screen name="settings" options={{ title: "My Profile" }} />
    </Tabs>
  );
}
