import {useTheme} from "@/styles/theme";
import {useAuth} from "@clerk/expo";
import {Tabs, useRouter} from "expo-router";
import {Compass, House, Sparkles, UserRound, type LucideIcon} from "lucide-react-native";
import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {Pressable, View, type PressableProps} from "react-native";
import {spacing} from "../../styles/spacing";
import {fonts} from "../../styles/typography";

import {useFlowUI} from "../../components/flow-ui-context";
import {useWorkspaceDraft} from "../../components/workspace-context";
import {DS} from "../../lib/design-system";
import {ENABLE_GUEST_WIZARD_TEST_MODE} from "../../lib/guest-testing";
import {triggerHaptic} from "../../lib/haptics";
import {withWorkspaceFlowId} from "../../lib/try-it-flow";

export const DEFAULT_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 20,
  right: 20,
  bottom: 18,
  backgroundColor: DS.colors.surface,
  height: 86,
  paddingTop: 12,
  paddingBottom: 12,
  paddingHorizontal: spacing.sm,
  borderRadius: 32,
  borderWidth: 1,
  borderColor: DS.colors.border,
  boxShadow: `0px 10px 30px ${DS.colors.shadow}`,
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
    <View style={{ width: 50, height: 38, alignItems: "center", justifyContent: "center" }}>
      {focused ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: DS.colors.surfaceHigh,
          }}
        />
      ) : null}

      <View
        style={{
          minWidth: 46,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
          backgroundColor: focused ? DS.colors.surfaceHigh : "transparent",
        }}
      >
        <Icon color={color} size={size} strokeWidth={focused ? 1.7 : 1.5} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isFlowActive } = useFlowUI();
  const { clearDraft } = useWorkspaceDraft();
  const { isSignedIn } = useAuth();
  const canOpenCreateTab = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: DS.colors.textPrimary,
        tabBarInactiveTintColor: DS.colors.textSecondary,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          ...fonts.medium,
        },
        tabBarStyle: isFlowActive ? { display: "none" } : DEFAULT_TAB_BAR_STYLE,
        sceneStyle: {
          backgroundColor: DS.colors.background,
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
        name="workspace"
        options={{
          href: null,
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
    </Tabs>
  );
}

