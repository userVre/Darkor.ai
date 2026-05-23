import {useMemo} from "react";
import {StyleSheet, type StyleProp, type ViewStyle} from "react-native";
import {BottomNavigation, useTheme, type BottomNavigationRoute} from "react-native-paper";

export type NavigationBarRoute = BottomNavigationRoute & {
  key: string;
};

export type NavigationBarProps = {
  routes: NavigationBarRoute[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  style?: StyleProp<ViewStyle>;
};

export function NavigationBar({routes, activeIndex, onIndexChange, style}: NavigationBarProps) {
  const theme = useTheme();
  const safeRoutes = routes.slice(0, 4);
  const navigationState = useMemo(
    () => ({
      index: Math.max(0, Math.min(activeIndex, safeRoutes.length - 1)),
      routes: safeRoutes,
    }),
    [activeIndex, safeRoutes],
  );

  if (__DEV__ && routes.length > 4) {
    console.warn("MD3 NavigationBar supports a maximum of 4 tabs.");
  }

  return (
    <BottomNavigation.Bar
      activeColor={theme.colors.onSecondaryContainer}
      inactiveColor={theme.colors.onSurfaceVariant}
      labeled
      navigationState={navigationState}
      onTabPress={({route}) => {
        const nextIndex = safeRoutes.findIndex((item) => item.key === route.key);
        if (nextIndex >= 0) {
          onIndexChange(nextIndex);
        }
      }}
      shifting
      style={[styles.bar, {backgroundColor: theme.colors.elevation.level2}, style]}
    />
  );
}

export default NavigationBar;

const styles = StyleSheet.create({
  bar: {
    elevation: 0,
  },
});
