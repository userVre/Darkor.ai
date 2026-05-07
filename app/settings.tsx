import {
Copy,
Diamond,
FileQuestion,
FileText,
Mail,
MaterialIcon,
RotateCcw,
Share2,
Shield,
Star,
Trash2,
UserRound,
} from "@/components/material-icons";
import {useAuth, useUser} from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {useConvexAuth, useMutation} from "convex/react";
import {BlurView} from "expo-blur";
import * as Clipboard from "expo-clipboard";
import {Image} from "expo-image";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import {useRouter} from "expo-router";
import * as SecureStore from "expo-secure-store";
import {StatusBar} from "expo-status-bar";
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, I18nManager, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useProSuccess} from "../components/pro-success-context";
import {SettingsRow} from "../components/settings-row";
import {useViewerCredits} from "../components/viewer-credits-context";
import {useWorkspaceDraft} from "../components/workspace-context";
import {useAppLanguagePreference, useLocalizedAppFonts} from "../lib/i18n";
import {getLanguageNativeLabel} from "../lib/i18n/language";
import {getDirectionalArrowScale, getDirectionalRow, getDirectionalTextAlign} from "../lib/i18n/rtl";
import {TOOLS_ROUTE} from "../lib/routes";
import {
configureRevenueCat,
getRevenueCatClient,
hasActiveSubscription,
resolveRevenueCatSubscription,
type RevenueCatEntitlement,
} from "../lib/revenuecat";
import {requestStoreReview} from "../lib/store-review";
import {radix, useTheme, type Theme} from "../styles/theme";
import {fonts} from "../styles/typography";

const SUPPORT_EMAIL = "support@homedecor.ai";
const APP_URL = Constants.expoConfig?.extra?.publicEnv?.EXPO_PUBLIC_APP_URL ?? "https://homedecor.ai";
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package ?? "com.homedecor.ai";
const SETTINGS_HERO_IMAGE = require("../assets/media/settings/professional-workspace.webp");
const DARK_ACTION = "#111111";

function truncateUserId(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 15)}...`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const localizedFonts = useLocalizedAppFonts();
  const languagePreference = useAppLanguagePreference();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const convexAuth = useConvexAuth();
  const { user } = useUser();
  const { clearDraft } = useWorkspaceDraft();
  const { showSuccess, showToast } = useProSuccess();
  const { hasPaidAccess, setOptimisticAccess } = useViewerCredits();
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

    router.replace(TOOLS_ROUTE as any);
  };

  const openExternalUrl = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error(t("settings.messages.destinationUnavailable"));
    }

    await Linking.openURL(url);
  };

  const handleUpgrade = () => {
    if (hasPaidAccess) {
      showSuccess();
      return;
    }

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
    if (!isLoaded || !isSignedIn || !user?.id || convexAuth.isLoading || !convexAuth.isAuthenticated) {
      return;
    }

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

      if (subscriptionState.subscriptionType === "weekly" || subscriptionState.subscriptionType === "yearly") {
        setOptimisticAccess({
          hasPaidAccess: true,
          subscriptionType: subscriptionState.subscriptionType,
        });
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

    try {
      await Clipboard.setStringAsync(fullUserId);
      showToast(t("settings.messages.userIdCopied"));
    } catch {
      showToast(t("common.actions.tryAgain"));
    }
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
      { cancelable: true },
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
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 40, 56) }]}
      >
        <View style={styles.heroSection}>
          <Image contentFit="cover" source={SETTINGS_HERO_IMAGE} style={styles.heroImage} transition={250} />
          <View style={styles.heroImageOverlay} />

          <Pressable
            accessibilityRole="button"
            onPress={handleBack}
            style={[styles.backArrow, { top: heroTopInset, [isRTL ? "right" : "left"]: 16 }]}
          >
            <Text style={[styles.backArrowText, { transform: [{ scaleX: getDirectionalArrowScale(isRTL) }] }]}>{"\u2039"}</Text>
          </Pressable>

          <View style={[styles.heroContent, { paddingTop: heroTopInset }]}>
            <BlurView intensity={28} tint="light" style={styles.heroGlassPanel}>
              <Text style={[styles.headerTitle, localizedFonts.semibold, { textAlign: "center" }]}>{t("settings.title")}</Text>
              <Text style={[styles.heroTitle, localizedFonts.bold, { textAlign: "center" }]}>{t("settings.heroTitle")}</Text>
            </BlurView>
          </View>
        </View>

        {hasPaidAccess ? null : (
          <View style={styles.planSection}>
            <View style={styles.featureList}>
              {featureItems.map((item) => (
                <View key={item} style={[styles.featureRow, { flexDirection: getDirectionalRow(isRTL) }]}>
                  <View style={styles.featureIconBox}>
                    <Star
                      color={theme.textPrimary}
                      size={12}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text style={[styles.featureText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable accessibilityRole="button" onPress={handleUpgrade} style={styles.upgradeButton}>
              <View style={[styles.upgradeButtonContent, { flexDirection: getDirectionalRow(isRTL) }]}>
                <Diamond color={theme.textInverse} size={16} strokeWidth={2.2} />
                <Text style={[styles.upgradeButtonText, localizedFonts.semibold]}>{t("settings.upgradePro")}</Text>
              </View>
            </Pressable>
          </View>
        )}

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
            label="Mode sombre"
            icon={((props: any) => <MaterialIcon name="wb-sunny" {...props} />) as any}
            onPress={theme.toggleThemeMode}
            showChevron={false}
            rightAccessory={
              <Switch
                accessibilityLabel="Mode sombre"
                onValueChange={(value) => theme.setThemeMode(value ? "dark" : "light")}
                thumbColor={theme.isDark ? theme.textInverse : theme.surfaceOverlayHigh}
                trackColor={{false: theme.borderLight, true: DARK_ACTION}}
                value={theme.isDark}
              />
            }
          />

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
                  <Pressable accessibilityRole="button" onPress={() => void handleCopyUserId()} style={styles.copyButton}>
                    <Copy color={theme.textSecondary} size={16} strokeWidth={2.2} />
                  </Pressable>
                ) : null}
              </View>
            }
          />

          <SettingsRow
            label={t("settings.rows.deleteInformation")}
            icon={Trash2}
            iconColor={DARK_ACTION}
            textColor={DARK_ACTION}
            showChevron={false}
            onPress={handleDeleteInformation}
            loading={isDeleting}
            loadingColor={DARK_ACTION}
          />
        </View>

        <Text style={[styles.versionLabel, localizedFonts.regular]}>{t("common.labels.version", { version: APP_VERSION })}</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollContent: {
    paddingBottom: 56,
  },
  backArrow: {
    position: "absolute",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(248, 249, 250, 0.72)",
    zIndex: 3,
  },
  backArrowText: {
    color: theme.textPrimary,
    fontSize: 34,
    lineHeight: 34,
    ...fonts.medium,
  },
  heroSection: {
    position: "relative",
    width: "100%",
    minHeight: 272,
    overflow: "hidden",
    backgroundColor: theme.surface,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248, 249, 250, 0.18)",
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGlassPanel: {
    width: "100%",
    maxWidth: 300,
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(248, 249, 250, 0.7)",
    backgroundColor: "rgba(248, 249, 250, 0.56)",
    paddingHorizontal: 28,
    paddingVertical: 22,
  },
  headerTitle: {
    marginBottom: 8,
    color: theme.textSecondary,
    fontSize: 16,
    lineHeight: 18,
    ...fonts.semibold,
  },
  heroTitle: {
    color: theme.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    ...fonts.bold,
  },
  planSection: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: radix.light.slate.slate6,
    backgroundColor: theme.surface,
    padding: 18,
  },
  featureList: {
    marginBottom: 18,
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
    backgroundColor: radix.light.slate.slate1,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    color: theme.textPrimary,
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  upgradeButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: DARK_ACTION,
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
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    ...fonts.regular,
  },
  languageValue: {
    maxWidth: 150,
    color: theme.textSecondary,
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
    backgroundColor: theme.surface,
  },
  versionLabel: {
    marginTop: 20,
    marginBottom: 32,
    color: theme.textSecondary,
    textAlign: "auto",
    marginHorizontal: 24,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.regular,
  },
  });
}


