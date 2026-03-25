import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { ChevronRight, FileQuestion, LayoutDashboard, Mail, Shield, Sparkles, Star, Trash2, Share2 } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { useViewerSession } from "../../components/viewer-session-context";
import { triggerHaptic } from "../../lib/haptics";
import { requestStoreReview } from "../../lib/store-review";

const POINTER_CLASS = "cursor-pointer";
const SCREEN_BG = "#000000";
const SURFACE_BG = "#09090b";
const CARD_BG = "#0d0d10";
const BORDER_COLOR = "rgba(255,255,255,0.08)";

type MeResponse = {
  hasPaidAccess?: boolean;
};

type RowTone = "danger" | "default";

type SettingsRowItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  tone?: RowTone;
  onPress: () => void | Promise<void>;
};

function SettingsRow({ icon: Icon, label, onPress, tone = "default" }: Omit<SettingsRowItem, "id">) {
  const isDanger = tone === "danger";

  return (
    <LuxPressable
      onPress={() => {
        triggerHaptic();
        void onPress();
      }}
      pressableClassName={POINTER_CLASS}
      className="overflow-hidden rounded-[24px]"
      style={[styles.row, isDanger ? styles.rowDanger : null]}
      glowColor={isDanger ? "rgba(248,113,113,0.16)" : "rgba(255,255,255,0.08)"}
      scale={0.985}
    >
      <View style={styles.rowInner}>
        <View style={[styles.rowIconWrap, isDanger ? styles.rowIconWrapDanger : null]}>
          <Icon color={isDanger ? "#f87171" : "#ffffff"} size={19} strokeWidth={2.2} />
        </View>
        <Text style={[styles.rowLabel, isDanger ? styles.rowLabelDanger : null]}>{label}</Text>
        <ChevronRight color={isDanger ? "#f87171" : "#71717a"} size={18} strokeWidth={2.3} />
      </View>
    </LuxPressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const deleteAccountData = useMutation("users:deleteAccountData" as any);
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery("users:me" as any, viewerReady && isSignedIn ? viewerArgs : "skip") as MeResponse | null | undefined;

  const hasPaidAccess = Boolean(me?.hasPaidAccess);
  const accountTitle = hasPaidAccess ? "Your Account is PRO" : "Your Account is FREE";
  const accountBody = isSignedIn
    ? hasPaidAccess
      ? "Your premium workspace is active. Manage support, privacy, and your design flow from one place."
      : "Upgrade to PRO to unlock premium generations, higher export quality, and a faster design workflow."
    : "Sign in when you want your board, purchases, and account controls synced across devices.";
  const accountMeta = user?.primaryEmailAddress?.emailAddress ?? "Guest session";
  const accountButtonLabel = hasPaidAccess ? "Manage PRO" : "\uD83D\uDC8E Upgrade PRO";

  const handleUpgrade = () => {
    router.push("/paywall");
  };

  const handleDeleteAccount = () => {
    if (!isSignedIn || !user) {
      router.push({ pathname: "/sign-in", params: { returnTo: "/profile" } });
      return;
    }

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
              await user.delete();
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

  const settingsRows: SettingsRowItem[] = [
    {
      id: "board",
      label: "Your Board",
      icon: LayoutDashboard,
      onPress: () => router.push("/gallery"),
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
      label: "Share",
      icon: Share2,
      onPress: () => Share.share({ message: "Darkor.ai helps me redesign spaces in seconds. Check it out." }),
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
      tone: "danger",
      onPress: handleDeleteAccount,
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom + 36, 44),
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>A cleaner account hub built to match Darkor.ai's black-luxury shell.</Text>
        </View>

        <View style={styles.accountCard}>
          <LinearGradient
            colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.01)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View style={styles.accountTopRow}>
            <View style={styles.accountIconWrap}>
              <Sparkles color="#ffffff" size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountEyebrow}>Account</Text>
              <Text style={styles.accountTitle}>{accountTitle}</Text>
              <Text style={styles.accountMeta}>{accountMeta}</Text>
            </View>
          </View>

          <Text style={styles.accountBody}>{accountBody}</Text>

          <LuxPressable
            onPress={handleUpgrade}
            pressableClassName={POINTER_CLASS}
            className="overflow-hidden rounded-[20px]"
            style={styles.accountButtonShadow}
            glowColor="rgba(255,255,255,0.1)"
            scale={0.985}
          >
            <LinearGradient
              colors={["#ffffff", "#d4d4d8"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.accountButton}
            >
              <Text style={styles.accountButtonText}>{accountButtonLabel}</Text>
            </LinearGradient>
          </LuxPressable>
        </View>

        <View style={styles.list}>
          {settingsRows.map((item) => (
            <SettingsRow key={item.id} icon={item.icon} label={item.label} tone={item.tone} onPress={item.onPress} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    marginBottom: 28,
    gap: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  accountCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BG,
    padding: 22,
    marginBottom: 20,
    gap: 18,
  },
  accountTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  accountIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  accountCopy: {
    flex: 1,
    gap: 2,
  },
  accountEyebrow: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  accountTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.55,
  },
  accountMeta: {
    color: "#d4d4d8",
    fontSize: 13,
    fontWeight: "600",
  },
  accountBody: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  accountButtonShadow: {
    alignSelf: "flex-start",
  },
  accountButton: {
    minHeight: 50,
    minWidth: 164,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  accountButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  list: {
    gap: 12,
  },
  row: {
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  rowDanger: {
    borderColor: "rgba(248,113,113,0.16)",
    backgroundColor: "rgba(28,10,12,0.92)",
  },
  rowInner: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  rowIconWrapDanger: {
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  rowLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  rowLabelDanger: {
    color: "#fca5a5",
  },
});
