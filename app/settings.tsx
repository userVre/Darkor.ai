import {
Copy,
DoorOpen,
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
import {Alert, I18nManager, Platform, ScrollView, Share, StyleSheet, Text, View} from "react-native";
import {Button, Divider, IconButton, List, Switch as PaperSwitch} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useProSuccess} from "../components/pro-success-context";
import {SettingsRow} from "../components/settings-row";
import {useViewerCredits} from "../components/viewer-credits-context";
import {useWorkspaceDraft} from "../components/workspace-context";
import {md3Spacing} from "../constants/md3Theme";
import {useAppLanguagePreference, useLocalizedAppFonts} from "../lib/i18n";
import {getLanguageNativeLabel} from "../lib/i18n/language";
import {getDirectionalTextAlign} from "../lib/i18n/rtl";
import {TOOLS_ROUTE} from "../lib/routes";
import {
configureRevenueCat,
getRevenueCatClient,
hasActiveSubscription,
resolveRevenueCatSubscription,
type RevenueCatEntitlement,
} from "../lib/revenuecat";
import {requestStoreReview} from "../lib/store-review";
import {useTheme, type Theme} from "../styles/theme";

const SUPPORT_EMAIL = "support@homedecor.ai";
const APP_URL = Constants.expoConfig?.extra?.publicEnv?.EXPO_PUBLIC_APP_URL ?? "https://homedecor.ai";
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package ?? "com.homedecor.ai";
const SETTINGS_HERO_IMAGE = require("../assets/media/settings/professional-workspace.webp");

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
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleSignOut = async () => {
    if (!isLoaded || isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      const purchases = getRevenueCatClient() ?? (await configureRevenueCat(user?.id ?? null));
      await purchases?.logOut?.().catch(() => undefined);
      clearDraft();
      await signOut();
      router.replace("/sign-in" as any);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("settings.messages.signOutFailed", { defaultValue: "Impossible de vous déconnecter pour le moment." }));
    } finally {
      setIsSigningOut(false);
    }
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

          <IconButton
            accessibilityLabel={t("common.actions.back", { defaultValue: "Back" })}
            icon={isRTL ? "chevron-right" : "chevron-left"}
            mode="contained-tonal"
            onPress={handleBack}
            style={[styles.backArrow, { top: heroTopInset, [isRTL ? "right" : "left"]: 16 }]}
          />

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
                <List.Item
                  key={item}
                  title={item}
                  titleNumberOfLines={2}
                  titleStyle={[styles.featureText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}
                  left={() => (
                    <List.Icon
                      color={theme.paperTheme.colors.onSecondaryContainer}
                      icon="star-four-points"
                    />
                  )}
                  style={styles.featureRow}
                />
              ))}
            </View>

            <Button
              icon="diamond-stone"
              mode="contained"
              onPress={handleUpgrade}
              style={styles.upgradeButton}
              contentStyle={styles.upgradeButtonContent}
              labelStyle={[styles.upgradeButtonText, localizedFonts.semibold]}
            >
              {t("settings.upgradePro")}
            </Button>
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

          <Divider style={styles.sectionDivider} />

          <SettingsRow
            label="Mode sombre"
            icon={((props: any) => <MaterialIcon name="wb-sunny" {...props} />) as any}
            onPress={theme.toggleThemeMode}
            showChevron={false}
            rightAccessory={
              <PaperSwitch
                accessibilityLabel="Mode sombre"
                onValueChange={(value) => theme.setThemeMode(value ? "dark" : "light")}
                value={theme.isDark}
              />
            }
          />

          <Divider style={styles.sectionDivider} />

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
                  <IconButton
                    accessibilityLabel={t("common.actions.copy", {defaultValue: "Copy"})}
                    icon={({color, size}) => <Copy color={color} size={size} strokeWidth={2.2} />}
                    iconColor={theme.paperTheme.colors.onSurfaceVariant}
                    onPress={() => void handleCopyUserId()}
                    size={16}
                    style={styles.copyButton}
                  />
                ) : null}
              </View>
            }
          />

          <SettingsRow
            label={t("settings.rows.deleteInformation")}
            icon={Trash2}
            iconColor={theme.paperTheme.colors.error}
            textColor={theme.paperTheme.colors.error}
            showChevron={false}
            onPress={handleDeleteInformation}
            loading={isDeleting}
            loadingColor={theme.paperTheme.colors.error}
          />

          {isSignedIn ? (
            <SettingsRow
              label={t("settings.rows.logout", { defaultValue: "Se déconnecter" })}
              icon={DoorOpen}
              iconColor={theme.paperTheme.colors.error}
              textColor={theme.paperTheme.colors.error}
              showChevron={false}
              onPress={handleSignOut}
              loading={isSigningOut}
              loadingColor={theme.paperTheme.colors.error}
              disabled={!isLoaded || isSigningOut}
              style={styles.logoutRow}
            />
          ) : null}
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
    paddingBottom: md3Spacing.quadrupleExtraLarge,
  },
  backArrow: {
    position: "absolute",
    zIndex: 3,
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
    paddingHorizontal: md3Spacing.extraLarge,
    paddingBottom: md3Spacing.large,
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
    borderColor: theme.paperTheme.colors.outlineVariant,
    backgroundColor: theme.paperTheme.colors.surfaceVariant,
    paddingHorizontal: md3Spacing.extraLarge,
    paddingVertical: md3Spacing.large,
  },
  headerTitle: {
    marginBottom: md3Spacing.small,
    color: theme.textSecondary,
    ...theme.paperTheme.fonts.titleMedium,
  },
  heroTitle: {
    color: theme.textPrimary,
    ...theme.paperTheme.fonts.headlineMedium,
  },
  planSection: {
    marginTop: md3Spacing.large,
    marginHorizontal: md3Spacing.large,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.paperTheme.colors.outlineVariant,
    backgroundColor: theme.paperTheme.colors.secondaryContainer,
    padding: md3Spacing.large,
  },
  featureList: {
    marginBottom: md3Spacing.large,
    gap: md3Spacing.small,
  },
  featureRow: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    color: theme.paperTheme.colors.onSecondaryContainer,
  },
  upgradeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  upgradeButtonContent: {
    minHeight: 48,
    paddingHorizontal: md3Spacing.large,
  },
  upgradeButtonText: {
    letterSpacing: 0,
  },
  rowsSection: {
    marginTop: md3Spacing.extraLarge,
  },
  restoreRow: {
    marginTop: md3Spacing.extraLarge,
  },
  logoutRow: {
    marginTop: md3Spacing.small,
  },
  sectionDivider: {
    marginHorizontal: md3Spacing.large,
    marginVertical: md3Spacing.small,
  },
  userIdAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: md3Spacing.small,
    maxWidth: 190,
  },
  userIdText: {
    flexShrink: 1,
    color: theme.textSecondary,
    ...theme.paperTheme.fonts.labelSmall,
  },
  languageValue: {
    maxWidth: 150,
    color: theme.textSecondary,
    textAlign: "auto",
    ...theme.paperTheme.fonts.labelSmall,
  },
  copyButton: {
    width: md3Spacing.doubleExtraLarge,
    height: md3Spacing.doubleExtraLarge,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: md3Spacing.large,
    backgroundColor: theme.surface,
  },
  versionLabel: {
    marginTop: md3Spacing.extraLarge,
    marginBottom: md3Spacing.doubleExtraLarge,
    color: theme.textSecondary,
    textAlign: "auto",
    marginHorizontal: md3Spacing.extraLarge,
    ...theme.paperTheme.fonts.labelSmall,
  },
  });
}


