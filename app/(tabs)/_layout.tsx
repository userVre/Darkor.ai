import type { ReactNode } from "react";
import { useAuth } from "@clerk/expo";
import { Pressable, type PressableProps } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "lucide-react-native";

import { useViewerSession } from "../../components/viewer-session-context";

const BRAND_COLOR = "#f59e0b";

type TabButtonProps = PressableProps & {
  children?: ReactNode;
};

function TabBarButton({ children, style, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      className="cursor-pointer"
      android_ripple={{ color: "rgba(245, 158, 11, 0.12)", borderless: false }}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { isReady: viewerReady } = useViewerSession();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: BRAND_COLOR,
        tabBarInactiveTintColor: "#71717a",
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
          backgroundColor: "#09090b",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
        },
        sceneStyle: {
          backgroundColor: "#09090b",
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
        listeners={{
          tabPress: (event) => {
            if (!viewerReady || isSignedIn) {
              return;
            }

            event.preventDefault();
            router.push({ pathname: "/sign-in", params: { returnTo: "/profile" } });
          },
        }}
      />
      <Tabs.Screen name="home.full" options={{ href: null }} />
      <Tabs.Screen name="workspace.full" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
