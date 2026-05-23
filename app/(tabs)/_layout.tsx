import {NavigationBar, type NavigationBarRoute} from "@/components/ui/NavigationBar";
import {useTheme} from "@/styles/theme";
import {Tabs, usePathname} from "expo-router";
import {useTranslation} from "react-i18next";

import {useFlowUI} from "../../components/flow-ui-context";

const VISIBLE_TAB_NAMES = ["index", "elite-pass", "gallery", "profile"] as const;

function MD3TabBar({state, descriptors, navigation}: any) {
  const pathname = usePathname();
  const {isFlowActive} = useFlowUI();
  const colors = useTheme();
  const shouldHideTabBar = (pathname === "/workspace" || pathname === "/create") && isFlowActive;
  const visibleRoutes = state.routes.filter((route: {name: string}) =>
    VISIBLE_TAB_NAMES.includes(route.name as (typeof VISIBLE_TAB_NAMES)[number]),
  );
  const activeRouteKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route: {key: string}) => route.key === activeRouteKey),
  );
  const routes: NavigationBarRoute[] = visibleRoutes.map((route: {key: string; name: string}) => {
    const options = descriptors[route.key]?.options ?? {};

    return {
      key: route.key,
      title: options.title ?? route.name,
      focusedIcon: getTabIcon(route.name, true),
      unfocusedIcon: getTabIcon(route.name, false),
      accessibilityLabel: options.tabBarAccessibilityLabel,
      testID: options.tabBarTestID,
    };
  });

  if (shouldHideTabBar) {
    return null;
  }

  return (
    <NavigationBar
      activeIndex={activeIndex}
      routes={routes}
      style={{
        backgroundColor: colors.paperTheme.colors.elevation.level2,
      }}
      onIndexChange={(nextIndex) => {
        const route = visibleRoutes[nextIndex];
        if (!route) {
          return;
        }

        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });

        if (route.key !== activeRouteKey && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }}
    />
  );
}

function getTabIcon(routeName: string, focused: boolean) {
  switch (routeName) {
    case "elite-pass":
      return focused ? "fire" : "fire";
    case "gallery":
      return focused ? "compass" : "compass-outline";
    case "profile":
      return focused ? "account" : "account-outline";
    case "index":
    default:
      return focused ? "home" : "home-outline";
  }
}

export default function TabsLayout() {
  const {t} = useTranslation();
  const colors = useTheme();

  return (
    <Tabs
      tabBar={(props) => <MD3TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.tools"),
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
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t("tabs.discover"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
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
