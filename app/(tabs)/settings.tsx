import { useAuth, useUser } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { skip, useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef } from "react";
import { Alert, ScrollView, Share, Text, View, useWindowDimensions } from "react-native";
import Purchases from "react-native-purchases";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronRight,
  Copy,
  Diamond,
  FileText,
  Gift,
  HelpCircle,
  MessageCircle,
  RefreshCcw,
  Share2,
  Shield,
  Sparkles,
  Star,
  Trees,
  Trash2,
  Zap,
} from "lucide-react-native";

import { planTitle, type PlanKey } from "../../lib/pricing";
import { triggerHaptic } from "../../lib/haptics";
import { hasProEntitlement } from "../../lib/revenuecat";
import { requestStoreReview } from "../../lib/store-review";
import { GlassBackdrop } from "../../components/glass-backdrop";
import { LuxPressable } from "../../components/lux-pressable";

type MeResponse = {
  plan: "free" | PlanKey;
  credits: number;
  referralCode?: string;
};

const MENU_ITEMS = [
  { id: "whats_new", label: "What's New", icon: Sparkles },
  { id: "feedback", label: "Feedback", icon: MessageCircle },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "rate", label: "Rate Us", icon: Star },
  { id: "share", label: "Share with Friends", icon: Share2 },
  { id: "terms", label: "Terms of Use", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: Shield },
];

const ACCOUNT_BULLETS = [
  { id: "model", label: "Advanced AI Model", icon: Sparkles },
  { id: "speed", label: "Fast Processing", icon: Zap },
  { id: "ads", label: "Remove All Ads", icon: Shield },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { height } = useWindowDimensions();
  const me = useQuery("users:me" as any, isSignedIn ? {} : skip) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);
  const whatsNewRef = useRef<BottomSheetModal>(null);
  const isCompact = height < 740;
  const whatsNewSnapPoints = useMemo(() => [isCompact ? "94%" : "70%"], [isCompact]);

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const plan = me?.plan && me.plan !== "free" ? me.plan : "free";
  const planLabel = plan === "free" ? "FREE" : planTitle(plan).toUpperCase();

  const handleUpgrade = () => {
    triggerHaptic();
    router.push("/paywall");
  };

  const handleRateStore = async () => {
    triggerHaptic();
    await requestStoreReview();
  };

  const handleNav = (id: string) => {
    triggerHaptic();
    switch (id) {
      case "whats_new":
        whatsNewRef.current?.present();
        break;
      case "feedback":
        Alert.alert("Feedback", "Thanks for sharing feedback. We'll open a form soon.");
        break;
      case "faq":
        Alert.alert("FAQ", "The FAQ section is coming next.");
        break;
      case "rate":
        Alert.alert("Rate Us", "Thanks! We'll link to the store rating soon.");
        break;
      case "share":
        Alert.alert("Share", "Share link copied soon. We'll enable native share next.");
        break;
      case "terms":
        Alert.alert("Terms", "Terms of Use will open here.");
        break;
      case "privacy":
        Alert.alert("Privacy", "Privacy Policy will open here.");
        break;
      default:
        break;
    }
  };

  const handleCopyId = async () => {
    triggerHaptic();
    const value = user?.id ?? "eRBJziTFTy6tMa...";
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", "User ID copied to clipboard.");
  };

  const referralCode = me?.referralCode ?? user?.id ?? "";
  const referralLink = referralCode ? Linking.createURL("ref", { queryParams: { code: referralCode } }) : "";

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    triggerHaptic();
    await Clipboard.setStringAsync(referralLink);
    Alert.alert("Link copied", "Your referral link is ready to share.");
  };

  const handleShareReferral = async () => {
    if (!referralLink) return;
    triggerHaptic();
    const message = `Join Darkor.ai and get started: ${referralLink}`;
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      await Share.share({ message });
      return;
    }
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!baseDir) {
      await Share.share({ message });
      return;
    }
    const fileUri = `${baseDir}darkor-referral.txt`;
    await FileSystem.writeAsStringAsync(fileUri, message);
    await Sharing.shareAsync(fileUri, { dialogTitle: "Invite friends" });
  };

  const handleRestore = async () => {
    triggerHaptic();
    try {
      const info = await Purchases.restorePurchases();
      const hasPro = hasProEntitlement(info);
      if (hasPro && isSignedIn) {
        await setPlan({ plan: "pro", credits: 100 });
      }
      Alert.alert("Restored", hasPro ? "Your subscription is active." : "No active subscriptions found.");
    } catch (error) {
      Alert.alert("Restore failed", "Please try again in a moment.");
    }
  };

  const handleDelete = () => {
    triggerHaptic();
    Alert.alert("Delete Information", "This removes your account information. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (user) {
              await user.delete();
            }
            await signOut();
          } catch (error) {
            Alert.alert("Delete failed", "Please contact support to delete your account.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <ScrollView
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="flex-row items-center justify-between">
        <LuxPressable
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          className="cursor-pointer h-10 w-10 items-center justify-center rounded-full border border-white/10"
          style={{ borderWidth: 0.5 }}
        >
          <ArrowLeft color="#e4e4e7" size={18} />
        </LuxPressable>
        <Text className="text-lg font-medium text-white">Settings</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black" style={{ borderWidth: 0.5 }}>
        <Image
          source={require("../../assets/media/after-luxury.jpg")}
          className="absolute inset-0 h-full w-full"
          contentFit="cover"
        />
        <View className="absolute inset-0 bg-black/50" />
        <BlurView intensity={70} tint="dark" className="absolute inset-0" />
        <View className="gap-4 p-6">
          <Text className="text-lg font-medium text-white">Your Account is {planLabel}</Text>
          <View className="gap-3">
            {ACCOUNT_BULLETS.map((bullet) => {
              const Icon = bullet.icon;
              return (
                <View key={bullet.id} className="flex-row items-center gap-2">
                  <Icon color="#ffffff" size={14} />
                  <Text className="text-sm font-semibold text-white">{bullet.label}</Text>
                </View>
              );
            })}
          </View>
          <LuxPressable
            onPress={handleUpgrade}
            className="cursor-pointer flex-row items-center justify-center gap-2 rounded-full border border-white/70 bg-white px-4 py-3"
            style={{ boxShadow: "0 0 24px rgba(255, 255, 255, 0.4)" }}
          >
            <Diamond color="#0f172a" size={14} />
            <Text className="text-sm font-semibold text-slate-900">Upgrade PRO</Text>
          </LuxPressable>
        </View>
      </View>

      <View className="mt-6 overflow-hidden rounded-2xl border border-amber-300/30 bg-black" style={{ borderWidth: 0.5 }}>
        <View className="px-5 py-4">
          <View className="flex-row items-center gap-2">
            <Gift color="#facc15" size={16} />
            <Text className="text-base font-medium text-amber-200">?? Invite Friends & Earn Credits</Text>
          </View>
          <Text className="mt-2 text-xs text-amber-200/80">Earn 3 credits for every friend who joins!</Text>
          <View className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3" style={{ borderWidth: 0.5 }}>
            <Text selectable className="text-xs text-zinc-200">
              {referralLink || "Sign in to generate your referral link."}
            </Text>
          </View>
          <View className="mt-4 flex-row gap-3">
            <LuxPressable
              onPress={handleCopyReferral}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3"
              style={{ borderWidth: 0.5 }}
            >
              <Copy color="#e4e4e7" size={14} />
              <Text className="text-xs font-semibold text-zinc-200">Copy Link</Text>
            </LuxPressable>
            <LuxPressable
              onPress={handleShareReferral}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-amber-400/20 py-3"
            >
              <Share2 color="#facc15" size={14} />
              <Text className="text-xs font-semibold text-amber-200">Share</Text>
            </LuxPressable>
          </View>
        </View>
      </View>

      <View className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black" style={{ borderWidth: 0.5 }}>
        <LuxPressable
          onPress={handleRateStore}
          className="cursor-pointer overflow-hidden px-4 py-4"
          style={{ borderBottomWidth: 0.5, borderBottomColor: "rgba(255, 255, 255, 0.06)" }}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
              <Star color="#facc15" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-amber-200">{"\uD83C\uDF1F"} Rate Darkor.ai on the Store</Text>
              <Text className="mt-1 text-xs text-amber-200/70">Help us reach more creators</Text>
            </View>
          </View>
        </LuxPressable>

        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === MENU_ITEMS.length - 1;
          return (
            <LuxPressable
              key={item.id}
              onPress={() => handleNav(item.id)}
              className={`cursor-pointer flex-row items-center justify-between px-4 py-4 ${
                isLast ? "" : "border-b border-white/5"
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Icon color="#e4e4e7" size={16} />
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-semibold text-zinc-100">{item.label}</Text>
                  {item.id === "whats_new" ? (
                    <View className="rounded-full bg-amber-400/20 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-amber-200">NEW</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <ChevronRight color="#71717a" size={18} />
            </LuxPressable>
          );
        })}
      </View>

        <View className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black" style={{ borderWidth: 0.5 }}>
        <LuxPressable onPress={handleRestore} className="cursor-pointer px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <RefreshCcw color="#e4e4e7" size={16} />
            </View>
            <Text className="text-sm font-semibold text-zinc-100">Restore Purchase</Text>
          </View>
        </LuxPressable>

        <View className="h-px bg-white/5" />

        <View className="flex-row items-center justify-between px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Shield color="#e4e4e7" size={16} />
            </View>
            <View>
              <Text className="text-sm font-semibold text-zinc-100">User ID</Text>
              <Text selectable className="mt-1 text-xs text-zinc-500">
                {user?.id ?? "eRBJziTFTy6tMa..."}
              </Text>
            </View>
          </View>
          <LuxPressable
            onPress={handleCopyId}
            className="cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/10"
            style={{ borderWidth: 0.5 }}
          >
            <Copy color="#e4e4e7" size={14} />
          </LuxPressable>
        </View>

        <View className="h-px bg-white/5" />

        <LuxPressable onPress={handleDelete} className="cursor-pointer px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-rose-500/20">
              <Trash2 color="#fee2e2" size={16} />
            </View>
            <Text className="text-sm font-semibold text-zinc-100">Delete Information</Text>
          </View>
        </LuxPressable>
      </View>
      </ScrollView>

      <BottomSheetModal
        ref={whatsNewRef}
        snapPoints={whatsNewSnapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <View className="flex-row items-center gap-2">
            <BadgeCheck color="#f5f3ff" size={18} />
            <Text className="text-lg font-medium text-white">What's New</Text>
          </View>
          <Text className="mt-2 text-sm text-zinc-400">
            Fresh features designed to make Darkor.ai feel effortless.
          </Text>

          <View className="mt-6 gap-4">
            <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Building2 color="#f9a8d4" size={18} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">Exterior Facades</Text>
                <Text className="mt-1 text-xs text-zinc-400">Architectural-grade redesigns in seconds.</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Trees color="#fef08a" size={18} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">Garden Design</Text>
                <Text className="mt-1 text-xs text-zinc-400">Lush outdoor concepts with cinematic lighting.</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Sparkles color="#a5b4fc" size={18} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">3D Walkthroughs</Text>
                <Text className="mt-1 text-xs text-zinc-400">Preview rooms as if you're already inside.</Text>
              </View>
            </View>
          </View>

          <LuxPressable
            onPress={() => whatsNewRef.current?.dismiss()}
            className="mt-8 overflow-hidden rounded-2xl"
          >
            <LinearGradient
              colors={["#f43f5e", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 14, alignItems: "center", borderRadius: 18 }}
            >
              <Text className="text-sm font-semibold text-white">Got it</Text>
            </LinearGradient>
          </LuxPressable>
        </View>
      </BottomSheetModal>
    </View>
  );
}










