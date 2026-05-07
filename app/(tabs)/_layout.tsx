import {useTheme} from "@/styles/theme";
import {useAuth} from "@clerk/expo";
import {Tabs, usePathname, useRouter} from "expo-router";
import {Compass, House, Sparkles, UserRound, type LucideIcon} from "lucide-react-native";
import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Pressable, View, type PressableProps} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {spacing} from "../../styles/spacing";
import {fonts} from "../../styles/typography";

import {useFlowUI} from "../../components/flow-ui-context";
import {useWorkspaceDraft} from "../../components/workspace-context";
import {ENABLE_GUEST_WIZARD_TEST_MODE} from "../../lib/guest-testing";
import {triggerHaptic} from "../../lib/haptics";
import {withWorkspaceFlowId} from "../../lib/try-it-flow";

const ACTIVE_TAB_COLOR = "#111111";
const ACTIVE_TAB_INDICATOR = "rgba(17, 17, 17, 0.10)";
const PURE_WHITE = "#FFFFFF";

export const DEFAULT_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: PURE_WHITE,
  height: 74,
  paddingTop: 7,
  paddingBottom: 8,
  paddingHorizontal: spacing.sm,
  borderTopWidth: 0,
  borderTopColor: "transparent",
  borderRadius: 0,
  boxShadow: "0px -4px 18px rgba(0, 0, 0, 0.05)",
  elevation: 5,
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
  Icon: LucideIcon;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={{ width: 48, height: 30, alignItems: "center", justifyContent: "center" }}>
      {focused ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: ACTIVE_TAB_INDICATOR,
          }}
        />
      ) : null}

      <View
        style={{
          minWidth: 34,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
          backgroundColor: "transparent",
        }}
      >
        <Icon color={color} size={size} strokeWidth={focused ? 1.7 : 1.5} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { clearDraft } = useWorkspaceDraft();
  const { isFlowActive } = useFlowUI();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const canOpenCreateTab = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const shouldHideTabBar = (pathname === "/workspace" || pathname === "/create") && isFlowActive;
  const tabBarBottomPadding = Math.max(insets.bottom, 20);
  const tabBarStyle = {
    ...DEFAULT_TAB_BAR_STYLE,
    backgroundColor: PURE_WHITE,
    borderTopWidth: 0,
    borderTopColor: "transparent",
    height: 66 + tabBarBottomPadding,
    paddingBottom: tabBarBottomPadding,
    boxShadow: "0px -4px 18px rgba(0, 0, 0, 0.05)",
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: ACTIVE_TAB_COLOR,
        tabBarInactiveTintColor: "rgba(0,0,0,0.35)",
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          ...fonts.semibold,
        },
        tabBarStyle: shouldHideTabBar ? { display: "none" } : tabBarStyle,
        sceneStyle: {
          backgroundColor: PURE_WHITE,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.tools"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={House} color={color} size={21} focused={focused} />,
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
          title: t("tabs.create"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Sparkles} color={color} size={21} focused={focused} />,
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              onPress={(event) => {
                triggerHaptic();
                const nextCreateRoute = withWorkspaceFlowId("/create?service=interior&startStep=1&entrySource=create-tab");

                if (!canOpenCreateTab) {
                  event.preventDefault();
                  router.push({ pathname: "/sign-in", params: { returnTo: nextCreateRoute } });
                  return;
                }

                event.preventDefault();
                clearDraft();
                router.navigate(nextCreateRoute as any);
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t("tabs.discover"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Compass} color={color} size={21} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={UserRound} color={color} size={21} focused={focused} />,
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

