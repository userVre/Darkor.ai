import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { ChevronRight, FileQuestion, LayoutDashboard, Mail, Shield, Sparkles, Star, Trash2, Share2 } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../../styles/typography";
import { spacing } from "../../styles/spacing";
import { dark as colors } from "@/styles/theme";
import { buttonStyles } from "../../styles/buttons";

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
      glowColor={isDanger ? colors.error : colors.surfaceHigh}
      scale={0.96}
    >
      <View style={styles.rowInner}>
        <View style={[styles.rowIconWrap, isDanger ? styles.rowIconWrapDanger : null]}>
          <Icon color={isDanger ? colors.error : colors.textPrimary} size={19} strokeWidth={2.2} />
        </View>
        <Text style={[styles.rowLabel, isDanger ? styles.rowLabelDanger : null]}>{label}</Text>
        <ChevronRight color={isDanger ? colors.error : colors.textMuted} size={18} strokeWidth={2.3} />
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
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject} />

          <View style={styles.accountTopRow}>
            <View style={styles.accountIconWrap}>
              <Sparkles color={colors.textPrimary} size={20} strokeWidth={2.2} />
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
                <View style={[styles.progressFill, { width: `${Math.max(usageProgress * 100, rendersUsed > 0 ? 10 : 0)}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{`${rendersUsed}/${renderLimit} used`}</Text>
            </View>
          ) : null}

          <LuxPressable
            onPress={handleUpgrade}
            pressableClassName={POINTER_CLASS}
            className="overflow-hidden rounded-[20px]"
            style={styles.accountButtonShadow}
            glowColor={colors.brand}
            scale={0.985}
          >
            <View style={styles.accountButton}>
              <Text style={styles.accountButtonText}>{accountButtonLabel}</Text>
            </View>
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
    marginBottom: spacing.xl,
    gap: spacing.sm,
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
    ...glowShadow(colors.shadow, 22),
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  accountTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  accountIconWrap: {
    width: 56,
    height: 56,
    borderRadius: DS.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHigh,
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
  },
  accountCopy: {
    flex: 1,
    gap: spacing.xs,
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
    gap: spacing.sm,
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.border,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  accountButtonShadow: {
    alignSelf: "stretch",
    borderRadius: DS.radius.lg,
  },
  accountButton: {
    ...buttonStyles.primary,
    width: "100%",
    height: 56,
    paddingHorizontal: DS.spacing[3],
    borderRadius: DS.radius.lg,
  },
  accountButtonText: {
    color: colors.textPrimary,
    ...DS.typography.button,
    fontSize: 17,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: SURFACE_BG,
    borderWidth: HAIRLINE,
    borderColor: BORDER_COLOR,
  },
  rowDanger: {
    borderColor: colors.error,
    backgroundColor: colors.errorSurface,
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
    backgroundColor: colors.surfaceHigh,
  },
  rowIconWrapDanger: {
    backgroundColor: colors.errorSurfaceHigh,
  },
  rowLabel: {
    flex: 1,
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
  rowLabelDanger: {
    color: colors.textError,
  },
});


