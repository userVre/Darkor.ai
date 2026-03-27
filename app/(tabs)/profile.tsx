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
import { DS, HAIRLINE, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../../lib/design-system";
import { triggerHaptic } from "../../lib/haptics";
import { requestStoreReview } from "../../lib/store-review";

const POINTER_CLASS = "cursor-pointer";
const SCREEN_BG = DS.colors.background;
const SURFACE_BG = DS.colors.surface;
const CARD_BG = DS.colors.surfaceRaised;
const BORDER_COLOR = DS.colors.borderSubtle;

type MeResponse = {
  hasPaidAccess?: boolean;
  imagesRemaining?: number;
  imageGenerationLimit?: number;
  imageGenerationCount?: number;
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
      scale={0.96}
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
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;

  const hasPaidAccess = Boolean(me?.hasPaidAccess);
  const renderLimit = me?.imageGenerationLimit ?? 3;
  const rendersRemaining = me?.imagesRemaining ?? 3;
  const rendersUsed = Math.max(0, renderLimit - rendersRemaining);
  const usageProgress = renderLimit > 0 ? Math.min(rendersUsed / renderLimit, 1) : 0;
  const accountTitle = hasPaidAccess ? "PRO Plan Active" : `Free Plan: ${rendersRemaining} Renders Remaining`;
  const accountBody = hasPaidAccess
    ? "Your premium workspace is active with faster output, 4K exports, and watermark-free delivery."
    : "Free access is limited to 3 renders a day. Upgrade now to remove the cap and keep your redesign momentum going.";
  const accountMeta = hasPaidAccess
    ? user?.primaryEmailAddress?.emailAddress ?? "Premium access enabled"
    : `${rendersUsed}/${renderLimit} used today`;
  const accountButtonLabel = hasPaidAccess ? "Manage PRO Access" : "Upgrade to PRO";

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
          paddingTop: DS.spacing[3],
          paddingBottom: Math.max(insets.bottom + DS.spacing[5], DS.spacing[6]),
          paddingHorizontal: SCREEN_SIDE_PADDING,
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

          {!hasPaidAccess ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={["#d946ef", "#4f46e5"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.progressFill, { width: `${Math.max(usageProgress * 100, rendersUsed > 0 ? 10 : 0)}%` }]}
                />
              </View>
              <Text style={styles.progressLabel}>{`${rendersUsed}/${renderLimit} used`}</Text>
            </View>
          ) : null}

          <LuxPressable
            onPress={handleUpgrade}
            pressableClassName={POINTER_CLASS}
            className="overflow-hidden rounded-[20px]"
            style={styles.accountButtonShadow}
            glowColor="rgba(217,70,239,0.34)"
            scale={0.985}
          >
            <LinearGradient
              colors={["#d946ef", "#4f46e5"]}
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
    marginBottom: DS.spacing[4],
    gap: DS.spacing[1],
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
  },
  subtitle: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  accountCard: {
    position: "relative",
    overflow: "hidden",
    ...surfaceCard(CARD_BG),
    ...glowShadow("rgba(0,0,0,0.34)", 22),
    padding: DS.spacing[3],
    marginBottom: DS.spacing[3],
    gap: DS.spacing[2.5],
  },
  accountTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  accountIconWrap: {
    width: 56,
    height: 56,
    borderRadius: DS.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
  },
  accountCopy: {
    flex: 1,
    gap: 2,
  },
  accountEyebrow: {
    color: DS.colors.textTertiary,
    ...DS.typography.label,
  },
  accountTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.sectionTitle,
  },
  accountMeta: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  accountBody: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  progressBlock: {
    gap: 8,
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.08)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabel: {
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  accountButtonShadow: {
    alignSelf: "stretch",
    borderRadius: DS.radius.lg,
  },
  accountButton: {
    minHeight: 60,
    width: "100%",
    paddingHorizontal: DS.spacing[3],
    borderRadius: DS.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow("rgba(217,70,239,0.26)", 26),
  },
  accountButtonText: {
    color: "#ffffff",
    ...DS.typography.button,
    fontSize: 17,
    fontWeight: "800",
  },
  list: {
    gap: DS.spacing[2],
  },
  row: {
    backgroundColor: SURFACE_BG,
    borderWidth: HAIRLINE,
    borderColor: BORDER_COLOR,
  },
  rowDanger: {
    borderColor: "rgba(248,113,113,0.16)",
    backgroundColor: "rgba(28,10,12,0.92)",
  },
  rowInner: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: DS.spacing[2],
    paddingHorizontal: DS.spacing[3],
  },
  rowIconWrap: {
    width: 48,
    height: 48,
    borderRadius: DS.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  rowIconWrapDanger: {
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  rowLabel: {
    flex: 1,
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
  rowLabelDanger: {
    color: "#fca5a5",
  },
});
