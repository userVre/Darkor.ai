import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  ChevronRight,
  FileQuestion,
  FileText,
  Gem,
  Images,
  LayoutDashboard,
  Mail,
  Share2,
  Sparkles,
  Shield,
  Star,
  Trash2,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { useViewerSession } from "../../components/viewer-session-context";
import { triggerHaptic } from "../../lib/haptics";
import { requestStoreReview } from "../../lib/store-review";

const BRAND_COLOR = "#f59e0b";
const SCREEN_BG = "#000000";
const CARD_BG = "#111113";
const BORDER_COLOR = "rgba(255,255,255,0.08)";
const ICON_CONTAINER_SIZE = 44;
const BOARD_GRID_GAP = 12;

type MeResponse = {
  generationStatusLabel?: string;
  generationStatusMessage?: string;
  imagesRemaining?: number;
  imageGenerationLimit?: number;
  hasPaidAccess?: boolean;
};

type ArchiveGeneration = {
  _id: string;
  _creationTime: number;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  status?: "processing" | "ready" | "failed";
  errorMessage?: string | null;
  createdAt?: number;
};

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
          className="mr-4 items-center justify-center rounded-2xl"
          style={{
            width: ICON_CONTAINER_SIZE,
            height: ICON_CONTAINER_SIZE,
            backgroundColor: isDanger ? "rgba(248, 113, 113, 0.14)" : isPremium ? "rgba(245, 158, 11, 0.16)" : "rgba(255,255,255,0.04)",
          }}
        >
          <Icon color={iconColor} size={20} />
        </View>
        <Text className="flex-1 text-base font-semibold" style={{ color: labelColor }}>
          {label}
        </Text>
        <View className="w-5 items-end">
          <ChevronRight color={isDanger ? "#fca5a5" : "#71717a"} size={18} />
        </View>
      </View>
    </LuxPressable>
  );
}

function formatBoardTitle(item: ArchiveGeneration) {
  const styleLabel = item.style?.trim() || "Custom";
  const roomLabel = item.roomType?.trim() || "Design";
  return `${styleLabel} ${roomLabel}`.trim();
}

function formatBoardSubtitle(item: ArchiveGeneration) {
  if (item.status === "processing") {
    return "Generating now";
  }

  if (item.status === "failed") {
    return "Needs review";
  }

  return "Open editor";
}

function ProfileBoardCard({
  item,
  width,
  index,
  onPress,
}: {
  item: ArchiveGeneration;
  width: number;
  index: number;
  onPress: (item: ArchiveGeneration) => void;
}) {
  const previewImage = item.imageUrl ?? item.sourceImageUrl ?? null;
  const isProcessing = item.status === "processing";
  const isFailed = item.status === "failed";

  return (
    <LuxPressable
      onPress={() => {
        triggerHaptic();
        onPress(item);
      }}
      pressableClassName="cursor-pointer"
      className="cursor-pointer overflow-hidden rounded-[26px]"
      style={{
        width,
        height: 214,
        marginRight: index % 2 === 0 ? BOARD_GRID_GAP : 0,
        marginBottom: BOARD_GRID_GAP,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: CARD_BG,
      }}
      glowColor="rgba(255,255,255,0.08)"
      scale={0.985}
    >
      {previewImage ? (
        <Image
          source={{ uri: previewImage }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={120}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.boardPlaceholder]}>
          <Sparkles color="#71717a" size={24} />
        </View>
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.84)", "rgba(0,0,0,0.96)"]}
        locations={[0, 0.36, 0.76, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {isProcessing ? (
        <View style={styles.processingBadge}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.processingText}>Processing</Text>
        </View>
      ) : null}

      <View style={styles.boardCopy}>
        <Text style={styles.boardTitle} numberOfLines={2}>
          {formatBoardTitle(item)}
        </Text>
        <Text style={[styles.boardSubtitle, isFailed ? styles.failedText : null]} numberOfLines={1}>
          {formatBoardSubtitle(item)}
        </Text>
      </View>
    </LuxPressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const deleteAccountData = useMutation("users:deleteAccountData" as any);
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery("users:me" as any, viewerReady && isSignedIn ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady && isSignedIn ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;

  useEffect(() => {
    if (!viewerReady || isSignedIn) {
      return;
    }

    router.replace("/(tabs)");
    requestAnimationFrame(() => {
      router.push({ pathname: "/sign-in", params: { returnTo: "/profile" } });
    });
  }, [isSignedIn, router, viewerReady]);

  if (!viewerReady || !isSignedIn) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SCREEN_BG }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ffffff" />
        </View>
      </SafeAreaView>
    );
  }

  const accountStatusLabel = me?.generationStatusLabel ?? (me?.hasPaidAccess ? "PRO Member" : "Free Plan");
  const accountStatusMessage =
    me?.generationStatusMessage ??
    (typeof me?.imagesRemaining === "number" && typeof me?.imageGenerationLimit === "number"
      ? `${me.imagesRemaining} of ${me.imageGenerationLimit} generations remaining.`
      : "Manage your subscription, support, and account settings.");
  const boardItems = generationArchive ?? [];
  const boardCardWidth = Math.max((width - 40 - BOARD_GRID_GAP) / 2, 148);

  const handleBoardItemPress = (item: ArchiveGeneration) => {
    router.push({
      pathname: "/workspace",
      params: {
        boardView: "editor",
        boardItemId: item._id,
        entrySource: "profile",
      },
    });
  };

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

        <View
          className="mb-4 rounded-[28px] border px-5 py-5"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            borderColor: BORDER_COLOR,
            borderWidth: 1,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[1.8px] text-zinc-500">Account Status</Text>
              <Text className="mt-2 text-2xl font-bold text-white">{accountStatusLabel}</Text>
            </View>
            <View
              className="items-center justify-center rounded-2xl"
              style={{
                width: 52,
                height: 52,
                backgroundColor: me?.hasPaidAccess ? "rgba(245, 158, 11, 0.18)" : "rgba(255,255,255,0.06)",
              }}
            >
              <Gem color={me?.hasPaidAccess ? BRAND_COLOR : "#e4e4e7"} size={24} />
            </View>
          </View>
          <Text className="mt-3 text-sm leading-6 text-zinc-400">{accountStatusMessage}</Text>
        </View>

        <View
          className="mb-5 overflow-hidden rounded-[30px]"
          style={{
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.22)",
            backgroundColor: "rgba(245, 158, 11, 0.08)",
          }}
        >
          <View className="flex-row items-center px-5 py-5">
            <View
              className="items-center justify-center rounded-[22px]"
              style={{
                width: 60,
                height: 60,
                backgroundColor: "rgba(245, 158, 11, 0.16)",
              }}
            >
              <LayoutDashboard color={BRAND_COLOR} size={28} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-2xl font-bold text-white">Your Board</Text>
              <Text className="mt-2 text-sm leading-6 text-zinc-300">
                Your generated designs sync here automatically from Convex.
              </Text>
            </View>
            <View className="ml-4 items-center justify-center">
              <Images color="#fde68a" size={22} />
            </View>
          </View>
        </View>

        {boardItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <LayoutDashboard color={BRAND_COLOR} size={28} />
            </View>
            <Text style={styles.emptyTitle}>Your board is ready for its first design.</Text>
            <Text style={styles.emptyCopy}>
              Generate a redesign and every saved image will appear here automatically from Convex.
            </Text>
          </View>
        ) : (
          <View className="mb-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Your Board</Text>
              <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-zinc-500">
                {boardItems.length} saved
              </Text>
            </View>

            <View style={styles.boardGrid}>
              {boardItems.map((item, index) => (
                <ProfileBoardCard
                  key={item._id}
                  item={item}
                  width={boardCardWidth}
                  index={index}
                  onPress={handleBoardItemPress}
                />
              ))}
            </View>
          </View>
        )}

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

const styles = StyleSheet.create({
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  boardPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD_BG,
  },
  processingBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  processingText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  boardCopy: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  boardTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  boardSubtitle: {
    marginTop: 4,
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  failedText: {
    color: "#fca5a5",
  },
  emptyState: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  emptyTitle: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptyCopy: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    textAlign: "center",
  },
});
