import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Compass, LayoutGrid, Sparkles, UserCircle2 } from "lucide-react-native";
import { useAuth } from "@clerk/expo";
import { fonts } from "../../styles/typography";
import { spacing } from "../../styles/spacing";
import { dark, type Theme, useTheme } from "@/styles/theme";

import { DS, HAIRLINE, glowShadow } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";

export const DEFAULT_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 14,
  backgroundColor: dark.bg,
  borderTopColor: dark.border,
  borderTopWidth: HAIRLINE,
  borderWidth: HAIRLINE,
  borderColor: dark.border,
  height: 78,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  paddingHorizontal: spacing.sm,
  borderRadius: 26,
  elevation: 0,
  shadowOpacity: 0,
  ...glowShadow(dark.shadow, 30),
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
  theme,
}: {
  Icon: typeof LayoutGrid;
  color: string;
  size: number;
  focused: boolean;
  theme: Theme;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
      <Icon color={color} size={size} strokeWidth={focused ? 2.45 : 2.2} />
    </View>
  );
}

export default function TabsLayout() {
  const colors = useTheme();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const canOpenCreateTab = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const defaultTabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: 16,
      right: 16,
      bottom: 14,
      backgroundColor: colors.bg,
      borderTopColor: colors.border,
      borderTopWidth: HAIRLINE,
      borderWidth: HAIRLINE,
      borderColor: colors.border,
      height: 78,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: 26,
      elevation: 0,
      shadowOpacity: 0,
      ...glowShadow(colors.shadow, 30),
    }),
    [colors],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing.sm,
        },
        tabBarIconStyle: {
          marginBottom: spacing.xs,
        },
        tabBarLabelStyle: {
          ...DS.typography.bodySm,
          fontSize: 11,
          fontFamily: fonts.regular.fontFamily,
          fontWeight: "600",
        },
        tabBarStyle: defaultTabBarStyle,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tools",
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={LayoutGrid} color={color} size={size} focused={focused} theme={colors} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={Sparkles} color={color} size={size} focused={focused} theme={colors} />,
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
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={Compass} color={color} size={size} focused={focused} theme={colors} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => <TabIcon Icon={UserCircle2} color={color} size={size} focused={focused} theme={colors} />,
        }}
      />
    </Tabs>
  );
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
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
      borderColor: colors.brand,
      backgroundColor: colors.surfaceHigh,
    },
  });
}
