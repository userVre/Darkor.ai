import { useAuth, useUser } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, I18nManager, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
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
import { MaterialIcon } from "@/components/material-icons";

import { SettingsRow } from "../components/settings-row";
import { useProSuccess } from "../components/pro-success-context";
import { useWorkspaceDraft } from "../components/workspace-context";
import { useAppLanguagePreference, useLocalizedAppFonts } from "../lib/i18n";
import { getLanguageNativeLabel } from "../lib/i18n/language";
import { getDirectionalArrowScale, getDirectionalRow, getDirectionalTextAlign } from "../lib/i18n/rtl";
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

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
  const languagePreference = useAppLanguagePreference();
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
  const currentLanguageLabel =
    languagePreference.mode === "auto"
      ? `${t("settings.language.autoShort")} - ${getLanguageNativeLabel(languagePreference.resolvedLanguage)}`
      : getLanguageNativeLabel(languagePreference.resolvedLanguage);
  const isRTL = I18nManager.isRTL;

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
    router.push("/faq");
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
    router.push({ pathname: "/legal-viewer", params: { document: "terms" } } as never);
  };

  const handlePrivacy = async () => {
    router.push({ pathname: "/legal-viewer", params: { document: "privacy" } } as never);
  };

  const handleLanguageSettings = () => {
    router.push("/language-settings" as any);
  };

  const persistPurchasedPlan = async (
    plan: "pro" | "trial",
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

      if (isSignedIn && subscriptionState.plan !== "free" && subscriptionState.subscriptionType !== "free") {
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
    {
      id: "language",
      label: t("settings.rows.language"),
      icon: ((props: any) => <MaterialIcon name="language" {...props} />) as any,
      onPress: handleLanguageSettings,
      rightAccessory: <Text numberOfLines={1} style={[styles.languageValue, localizedFonts.regular]}>{currentLanguageLabel}</Text>,
    },
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
          <Pressable
            accessibilityRole="button"
            onPress={handleBack}
            style={[styles.backArrow, { top: heroTopInset, [isRTL ? "right" : "left"]: 16 }]}
          >
            <Text style={[styles.backArrowText, { transform: [{ scaleX: getDirectionalArrowScale(isRTL) }] }]}>{"\u2039"}</Text>
          </Pressable>

          <View style={[styles.heroContent, { paddingTop: heroTopInset + 48 }]}>
            <Text style={[styles.headerTitle, localizedFonts.semibold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("settings.title")}</Text>
            <Text style={[styles.heroTitle, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("settings.heroTitle")}</Text>

            <View style={styles.featureList}>
              {featureItems.map((item) => (
                <View key={item} style={[styles.featureRow, { flexDirection: getDirectionalRow(isRTL) }]}>
                  <View style={styles.featureIconBox}>
                    <ChevronRight
                      color="#0A0A0A"
                      size={14}
                      strokeWidth={2.4}
                      style={{ transform: [{ scaleX: getDirectionalArrowScale(isRTL) }] }}
                    />
                  </View>
                  <Text style={[styles.featureText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable accessibilityRole="button" onPress={handleUpgrade} style={styles.upgradeButton}>
              <View style={[styles.upgradeButtonContent, { flexDirection: getDirectionalRow(isRTL) }]}>
                <Diamond color="#FFFFFF" size={16} strokeWidth={2.2} />
                <Text style={[styles.upgradeButtonText, localizedFonts.semibold]}>{t("settings.upgradePro")}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.rowsSection}>
          {firstGroupRows.map((row) => (
            <SettingsRow
              key={row.id}
              label={row.label}
              icon={row.icon}
              onPress={row.onPress}
              rightAccessory={row.rightAccessory}
            />
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
                <Text numberOfLines={1} selectable style={[styles.userIdText, localizedFonts.regular]}>
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

        <Text style={[styles.versionLabel, localizedFonts.regular]}>{t("common.labels.version", { version: APP_VERSION })}</Text>
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
    paddingHorizontal: 24,
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
    flex: 1,
    flexShrink: 1,
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
    flexShrink: 1,
    color: "#A0A0A0",
    fontSize: 12,
    lineHeight: 14,
    ...fonts.regular,
  },
  languageValue: {
    maxWidth: 150,
    color: "#6B6B6B",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "auto",
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
    textAlign: "auto",
    marginHorizontal: 24,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.regular,
  },
});


