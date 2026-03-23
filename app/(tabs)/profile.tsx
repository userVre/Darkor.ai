import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { Alert, ScrollView, Share, Text, View } from "react-native";
import {
  ChevronRight,
  FileQuestion,
  FileText,
  Gem,
  Mail,
  Share2,
  Shield,
  Star,
  Trash2,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { triggerHaptic } from "../../lib/haptics";
import { requestStoreReview } from "../../lib/store-review";

const BRAND_COLOR = "#f59e0b";
const SCREEN_BG = "#09090b";
const CARD_BG = "#111113";
const BORDER_COLOR = "rgba(255,255,255,0.08)";

type Tint = "premium" | "danger" | undefined;

type MenuItem = {
  id: string;
  label: string;
  icon: typeof Gem;
  tint?: Tint;
  onPress: () => void | Promise<void>;
};

type SettingsRowProps = {
  icon: MenuItem["icon"];
  label: string;
  tint?: Tint;
  onPress: MenuItem["onPress"];
};

function SettingsRow({ icon: Icon, label, tint, onPress }: SettingsRowProps) {
  const isPremium = tint === "premium";
  const isDanger = tint === "danger";
  const iconColor = isDanger ? "#f87171" : isPremium ? BRAND_COLOR : "#e4e4e7";
  const labelColor = isDanger ? "#fca5a5" : "#fafafa";

  return (
    <LuxPressable
      onPress={() => {
        triggerHaptic();
        void onPress();
      }}
      pressableClassName="cursor-pointer"
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: isDanger ? "rgba(127, 29, 29, 0.22)" : isPremium ? "rgba(245, 158, 11, 0.12)" : CARD_BG,
        borderWidth: 1,
        borderColor: isDanger ? "rgba(248, 113, 113, 0.28)" : isPremium ? "rgba(245, 158, 11, 0.22)" : BORDER_COLOR,
      }}
    >
      <View className="flex-row items-center px-4 py-4">
        <View
          className="mr-4 h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: isDanger ? "rgba(248, 113, 113, 0.14)" : isPremium ? "rgba(245, 158, 11, 0.16)" : "rgba(255,255,255,0.04)",
          }}
        >
          <Icon color={iconColor} size={20} />
        </View>
        <Text className="flex-1 text-base font-semibold" style={{ color: labelColor }}>
          {label}
        </Text>
        <ChevronRight color={isDanger ? "#fca5a5" : "#71717a"} size={18} />
      </View>
    </LuxPressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const deleteAccountData = useMutation("users:deleteAccountData" as any);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently removes your Darkor.ai account and saved data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccountData({});
              if (user) {
                await user.delete();
              }
              await signOut();
              router.replace("/");
            } catch {
              Alert.alert("Delete failed", "Please contact support@darkor.ai so we can help complete the deletion.");
            }
          },
        },
      ],
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: "upgrade",
      label: "Upgrade PRO",
      icon: Gem,
      tint: "premium",
      onPress: () => router.push("/paywall"),
    },
    {
      id: "feedback",
      label: "Feedback",
      icon: Mail,
      onPress: () => Linking.openURL("mailto:support@darkor.ai?subject=Darkor.ai%20Feedback"),
    },
    {
      id: "faq",
      label: "FAQ",
      icon: FileQuestion,
      onPress: () => router.push("/faq"),
    },
    {
      id: "rate",
      label: "Rate Us",
      icon: Star,
      onPress: () => requestStoreReview(),
    },
    {
      id: "share",
      label: "Share with Friends",
      icon: Share2,
      onPress: () => Share.share({ message: "Darkor.ai helps me redesign spaces in seconds. Check it out." }),
    },
    {
      id: "terms",
      label: "Terms of Use",
      icon: FileText,
      onPress: () => router.push("/terms-of-service"),
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: Shield,
      onPress: () => router.push("/privacy-policy"),
    },
    {
      id: "delete",
      label: "Delete Account",
      icon: Trash2,
      tint: "danger",
      onPress: handleDeleteAccount,
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: SCREEN_BG }}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom + 32, 40),
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View className="pb-8">
          <Text className="text-3xl font-bold text-white">My Profile</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-400">
            Manage your subscription, support, and account settings.
          </Text>
        </View>

        <View className="gap-3">
          {menuItems.map((item) => (
            <SettingsRow
              key={item.id}
              icon={item.icon}
              label={item.label}
              tint={item.tint}
              onPress={item.onPress}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
