import { useAuth, useUser } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  ArrowRight,
  Copy,
  FileQuestion,
  FileText,
  Gem,
  Mail,
  RotateCcw,
  Share2,
  Shield,
  Star,
  Trash2,
  UserRound,
} from "lucide-react-native";

import { SettingsRow } from "../components/settings-row";
import { useProSuccess } from "../components/pro-success-context";
import { useWorkspaceDraft } from "../components/workspace-context";
import {
  configureRevenueCat,
  getRevenueCatClient,
  hasActiveSubscription,
  resolveRevenueCatSubscription,
  type RevenueCatEntitlement,
} from "../lib/revenuecat";
import { requestStoreReview } from "../lib/store-review";
import { fonts } from "../styles/typography";

const SUPPORT_EMAIL = "support@darkor.ai";
const APP_URL = Constants.expoConfig?.extra?.publicEnv?.EXPO_PUBLIC_APP_URL ?? "https://darkor.ai";
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package ?? "com.darkor.ai";

const FEATURE_ITEMS = [
  "Advanced AI Model",
  "Fast Processing",
  "Remove All Ads",
] as const;

function truncateUserId(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 15)}...`;
}

function joinAppUrl(path: string) {
  const normalizedBase = APP_URL.endsWith("/") ? APP_URL.slice(0, -1) : APP_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { clearDraft } = useWorkspaceDraft();
  const { showSuccess, showToast } = useProSuccess();
  const deleteAccountData = useMutation("users:deleteAccountData" as any);
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fullUserId = user?.id ?? "";
  const truncatedUserId = fullUserId ? truncateUserId(fullUserId) : "Not signed in";
  const shouldShowCopy = Boolean(fullUserId);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const openExternalUrl = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error("This destination is unavailable right now.");
    }

    await Linking.openURL(url);
  };

  const openBrowserOrRoute = async (path: string, fallbackRoute: "/faq" | "/terms-of-service" | "/privacy-policy") => {
    try {
      if (APP_URL.startsWith("http")) {
        await WebBrowser.openBrowserAsync(joinAppUrl(path));
        return;
      }
    } catch {
      // Fall back to in-app route below.
    }

    router.push(fallbackRoute);
  };

  const handleUpgrade = () => {
    router.push("/paywall");
  };

  const handleFeedback = async () => {
    try {
      await openExternalUrl(`mailto:${SUPPORT_EMAIL}?subject=Darkor%20AI%20Feedback`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to open your email client.");
    }
  };

  const handleFaq = async () => {
    await openBrowserOrRoute("/faq", "/faq");
  };

  const handleRateUs = async () => {
    const openedNativeReview = await requestStoreReview();
    if (openedNativeReview) {
      return;
    }

    try {
      if (Platform.OS === "android") {
        await openExternalUrl(`market://details?id=${ANDROID_PACKAGE}`);
        return;
      }

      showToast("Review requests are unavailable right now.");
    } catch {
      showToast("Review requests are unavailable right now.");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Design your space with Darkor AI: ${APP_URL}`,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to open the share sheet.");
    }
  };

  const handleTerms = async () => {
    await openBrowserOrRoute("/terms-of-service", "/terms-of-service");
  };

  const handlePrivacy = async () => {
    await openBrowserOrRoute("/privacy-policy", "/privacy-policy");
  };

  const persistPurchasedPlan = async (
    plan: "pro",
    subscriptionType: "weekly" | "yearly",
    subscriptionEntitlement: RevenueCatEntitlement,
    purchasedAt?: number | null,
    subscriptionEnd?: number | null,
  ) => {
    await setPlan({
      plan,
      subscriptionType,
      subscriptionEntitlement,
      purchasedAt: typeof purchasedAt === "number" ? purchasedAt : undefined,
      subscriptionEnd: typeof subscriptionEnd === "number" ? subscriptionEnd : undefined,
    });
  };

  const handleRestorePurchase = async () => {
    if (isRestoring) {
      return;
    }

    try {
      setIsRestoring(true);

      const purchases = getRevenueCatClient() ?? (await configureRevenueCat(user?.id ?? null));
      if (!purchases) {
        showToast("Subscriptions are unavailable right now.");
        return;
      }

      const info = await purchases.restorePurchases();
      if (!hasActiveSubscription(info)) {
        showToast("No active subscriptions were found.");
        return;
      }

      const subscriptionState = resolveRevenueCatSubscription(info);

      if (isSignedIn && subscriptionState.plan === "pro" && subscriptionState.subscriptionType !== "free") {
        await persistPurchasedPlan(
          subscriptionState.plan,
          subscriptionState.subscriptionType,
          subscriptionState.entitlement,
          subscriptionState.purchasedAt,
          subscriptionState.subscriptionEnd,
        );
      }

      showSuccess();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Restore failed. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopyUserId = async () => {
    if (!fullUserId) {
      showToast("No authenticated user ID is available.");
      return;
    }

    await Clipboard.setStringAsync(fullUserId);
    showToast("User ID copied");
  };

  const clearLocalAppState = async () => {
    clearDraft();
    await AsyncStorage.clear();
    await Promise.allSettled([
      SecureStore.deleteItemAsync("clerk"),
      SecureStore.deleteItemAsync("Clerk"),
      SecureStore.deleteItemAsync("__clerk_client_jwt"),
      SecureStore.deleteItemAsync("__clerk_session_jwt"),
    ]);
  };

  const executeDeleteAccount = async () => {
    if (!isSignedIn || !user) {
      router.push({ pathname: "/sign-in", params: { returnTo: "/settings" } });
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccountData({});

      const purchases = getRevenueCatClient() ?? (await configureRevenueCat(user.id));
      await purchases?.logOut?.().catch(() => undefined);

      await user.delete();
      await signOut();
      await clearLocalAppState();
      router.replace("/sign-in");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to delete your account right now.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteInformation = () => {
    Alert.alert(
      "Delete Account?",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void executeDeleteAccount();
          },
        },
      ],
    );
  };

  const firstGroupRows = [
    { id: "feedback", label: "Feedback", icon: Mail, onPress: handleFeedback },
    { id: "faq", label: "FAQ", icon: FileQuestion, onPress: handleFaq },
    { id: "rate-us", label: "Rate Us", icon: Star, onPress: handleRateUs },
    { id: "share", label: "Share with Friends", icon: Share2, onPress: handleShare },
    { id: "terms", label: "Terms of Use", icon: FileText, onPress: handleTerms },
    { id: "privacy", label: "Privacy Policy", icon: Shield, onPress: handlePrivacy },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text accessibilityRole="button" onPress={handleBack} style={styles.backArrow}>
            {"<"}
          </Text>
        </View>

        <View style={styles.heroSection}>
          <Image
            source={require("../assets/media/paywall/paywall-luxury-lounge.png")}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View pointerEvents="none" style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Your Account is FREE</Text>

            <View style={styles.featureList}>
              {FEATURE_ITEMS.map((item) => (
                <View key={item} style={styles.featureRow}>
                  <ArrowRight color="#FFFFFF" size={18} strokeWidth={2.2} />
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable accessibilityRole="button" onPress={handleUpgrade} style={styles.upgradeButton}>
              <View style={styles.upgradeButtonInner}>
                <Gem color="#0A0A0A" size={16} strokeWidth={2.2} />
              </View>
              <Text style={styles.upgradeButtonText}>Upgrade PRO</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.rowsSection}>
          {firstGroupRows.map((row) => (
            <SettingsRow key={row.id} label={row.label} icon={row.icon} onPress={row.onPress} />
          ))}

          <SettingsRow
            label="Restore Purchase"
            icon={RotateCcw}
            onPress={handleRestorePurchase}
            showChevron={false}
            loading={isRestoring}
            style={styles.restoreRow}
          />

          <SettingsRow
            label="User ID"
            icon={UserRound}
            showChevron={false}
            disabled
            rightAccessory={
              <View style={styles.userIdAccessory}>
                <Text numberOfLines={1} selectable style={styles.userIdText}>
                  {truncatedUserId}
                </Text>
                {shouldShowCopy ? (
                  <Pressable accessibilityRole="button" onPress={handleCopyUserId} style={styles.copyButton}>
                    <Copy color="#A0A0A0" size={16} strokeWidth={2.2} />
                  </Pressable>
                ) : null}
              </View>
            }
          />

          <SettingsRow
            label="Delete Information"
            icon={Trash2}
            iconColor="#EF4444"
            textColor="#EF4444"
            showChevron={false}
            onPress={handleDeleteInformation}
            loading={isDeleting}
            loadingColor="#EF4444"
          />
        </View>

        <Text style={styles.versionLabel}>{`Version ${APP_VERSION}`}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerBlock: {
    position: "relative",
    height: 126,
    backgroundColor: "#0A0A0A",
  },
  headerTitle: {
    marginTop: 56,
    marginBottom: 52,
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 18,
    lineHeight: 18,
    ...fonts.bold,
  },
  backArrow: {
    position: "absolute",
    left: 16,
    top: 56,
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 20,
    ...fonts.regular,
  },
  heroSection: {
    position: "relative",
    width: "100%",
    height: 320,
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroContent: {
    flex: 1,
    paddingTop: 32,
    paddingLeft: 24,
    paddingRight: 24,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 26,
    ...fonts.bold,
  },
  featureList: {
    marginTop: 24,
    marginBottom: 16,
    gap: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 0,
  },
  featureText: {
    marginLeft: 10,
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  upgradeButton: {
    height: 44,
    marginRight: 256,
    marginBottom: 32,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  upgradeButtonInner: {
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonText: {
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 16,
    ...fonts.semibold,
  },
  rowsSection: {
    marginTop: 0,
  },
  restoreRow: {
    marginTop: 28,
  },
  userIdAccessory: {
    position: "absolute",
    right: 16,
    top: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 180,
  },
  userIdText: {
    color: "#A0A0A0",
    fontSize: 12,
    lineHeight: 14,
    ...fonts.regular,
  },
  copyButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  versionLabel: {
    marginTop: 24,
    marginBottom: 32,
    color: "#A0A0A0",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.regular,
  },
});
