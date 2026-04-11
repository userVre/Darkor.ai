import { useAuth, useUser } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronRight,
  Copy,
  Diamond,
  FileQuestion,
  FileText,
  Mail,
  RotateCcw,
  Share2,
  Shield,
  Star,
  Trash2,
  UserRound,
} from "@/components/material-icons";

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

const SUPPORT_EMAIL = "support@homedecor.ai";
const APP_URL = Constants.expoConfig?.extra?.publicEnv?.EXPO_PUBLIC_APP_URL ?? "https://homedecor.ai";
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package ?? "com.homedecor.ai";

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { clearDraft } = useWorkspaceDraft();
  const { showSuccess, showToast } = useProSuccess();
  const deleteAccountData = useMutation("users:deleteAccountData" as any);
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);

  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fullUserId = user?.id ?? "";
  const truncatedUserId = fullUserId ? truncateUserId(fullUserId) : t("settings.states.notSignedIn");
  const shouldShowCopy = Boolean(fullUserId);
  const heroTopInset = Math.max(insets.top + 8, 48);

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
      throw new Error(t("settings.messages.destinationUnavailable"));
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
      await openExternalUrl(`mailto:${SUPPORT_EMAIL}?subject=HomeDecor%20AI%20Feedback`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("settings.messages.emailClientUnavailable"));
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

      showToast(t("settings.messages.reviewUnavailable"));
    } catch {
      showToast(t("settings.messages.reviewUnavailable"));
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("settings.shareMessage", { url: APP_URL }),
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("settings.messages.shareUnavailable"));
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
        showToast(t("settings.messages.subscriptionsUnavailable"));
        return;
      }

      const info = await purchases.restorePurchases();
      if (!hasActiveSubscription(info)) {
        showToast(t("settings.messages.noActiveSubscriptions"));
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
      showToast(error instanceof Error ? error.message : t("settings.messages.restoreFailed"));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopyUserId = async () => {
    if (!fullUserId) {
      showToast(t("settings.messages.noUserId"));
      return;
    }

    await Clipboard.setStringAsync(fullUserId);
    showToast(t("settings.messages.userIdCopied"));
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
      showToast(error instanceof Error ? error.message : t("settings.messages.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteInformation = () => {
    Alert.alert(
      t("settings.deleteAccount.title"),
      t("settings.deleteAccount.body"),
      [
        { text: t("common.actions.cancel"), style: "cancel" },
        {
          text: t("common.actions.delete"),
          style: "destructive",
          onPress: () => {
            void executeDeleteAccount();
          },
        },
      ],
    );
  };

  const firstGroupRows = [
    { id: "feedback", label: t("settings.rows.feedback"), icon: Mail, onPress: handleFeedback },
    { id: "faq", label: t("settings.rows.faq"), icon: FileQuestion, onPress: handleFaq },
    { id: "rate-us", label: t("settings.rows.rateUs"), icon: Star, onPress: handleRateUs },
    { id: "share", label: t("settings.rows.shareWithFriends"), icon: Share2, onPress: handleShare },
    { id: "terms", label: t("settings.rows.termsOfUse"), icon: FileText, onPress: handleTerms },
    { id: "privacy", label: t("settings.rows.privacyPolicy"), icon: Shield, onPress: handlePrivacy },
  ];
  const featureItems = [
    t("settings.featureItems.advancedAi"),
    t("settings.featureItems.fastProcessing"),
    t("settings.featureItems.removeAds"),
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
        <View style={styles.heroSection}>
          <Pressable accessibilityRole="button" onPress={handleBack} style={[styles.backArrow, { top: heroTopInset }]}>
            <Text style={styles.backArrowText}>{"\u2039"}</Text>
          </Pressable>

          <View style={[styles.heroContent, { paddingTop: heroTopInset + 48 }]}>
            <Text style={styles.headerTitle}>{t("settings.title")}</Text>
            <Text style={styles.heroTitle}>{t("settings.heroTitle")}</Text>

            <View style={styles.featureList}>
              {featureItems.map((item) => (
                <View key={item} style={styles.featureRow}>
                  <View style={styles.featureIconBox}>
                    <ChevronRight color="#0A0A0A" size={14} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable accessibilityRole="button" onPress={handleUpgrade} style={styles.upgradeButton}>
              <View style={styles.upgradeButtonContent}>
                <Diamond color="#FFFFFF" size={16} strokeWidth={2.2} />
                <Text style={styles.upgradeButtonText}>{t("settings.upgradePro")}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.rowsSection}>
          {firstGroupRows.map((row) => (
            <SettingsRow key={row.id} label={row.label} icon={row.icon} onPress={row.onPress} />
          ))}

          <SettingsRow
            label={t("settings.rows.restorePurchase")}
            icon={RotateCcw}
            onPress={handleRestorePurchase}
            showChevron={false}
            loading={isRestoring}
            style={styles.restoreRow}
          />

          <SettingsRow
            label={t("settings.rows.userId")}
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
            label={t("settings.rows.deleteInformation")}
            icon={Trash2}
            iconColor="#EF4444"
            textColor="#EF4444"
            showChevron={false}
            onPress={handleDeleteInformation}
            loading={isDeleting}
            loadingColor="#EF4444"
          />
        </View>

        <Text style={styles.versionLabel}>{t("common.labels.version", { version: APP_VERSION })}</Text>
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
  backArrow: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  backArrowText: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 34,
    ...fonts.medium,
  },
  heroSection: {
    position: "relative",
    width: "100%",
    minHeight: 312,
    backgroundColor: "#F5F5F5",
  },
  heroContent: {
    flex: 1,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 24,
    justifyContent: "flex-end",
  },
  headerTitle: {
    marginBottom: 12,
    color: "#6B6B6B",
    fontSize: 16,
    lineHeight: 18,
    ...fonts.semibold,
  },
  heroTitle: {
    color: "#0A0A0A",
    fontSize: 28,
    lineHeight: 32,
    ...fonts.bold,
  },
  featureList: {
    marginTop: 22,
    marginBottom: 22,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  upgradeButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  upgradeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
  rowsSection: {
    marginTop: 20,
  },
  restoreRow: {
    marginTop: 20,
  },
  userIdAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 190,
  },
  userIdText: {
    color: "#A0A0A0",
    fontSize: 12,
    lineHeight: 14,
    ...fonts.regular,
  },
  copyButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
  },
  versionLabel: {
    marginTop: 20,
    marginBottom: 32,
    color: "#A0A0A0",
    textAlign: "left",
    marginLeft: 24,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.regular,
  },
});

