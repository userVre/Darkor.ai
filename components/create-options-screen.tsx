import {Diamond} from "@/components/material-icons";
import {useAuth} from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Asset} from "expo-asset";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, I18nManager, Modal, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DS, organicRadii, surfaceCard} from "../lib/design-system";
import {ENABLE_GUEST_WIZARD_TEST_MODE} from "../lib/guest-testing";
import {triggerHaptic} from "../lib/haptics";
import {
getDirectionalAlignment,
getDirectionalOppositeAlignment,
getDirectionalRow,
} from "../lib/i18n/rtl";
import {withWorkspaceFlowId} from "../lib/try-it-flow";
import {useDiamondStore} from "./diamond-store-context";
import {DiamondCreditPill, ProBadge} from "./diamond-credit-pill";
import {HomeToolCard, type HomeToolCardItem} from "./home-tool-card";
import {useViewerCredits} from "./viewer-credits-context";
import {useWorkspaceDraft} from "./workspace-context";

const FIRST_LAUNCH_DISCLOSURE_KEY = "homedecor:first-launch-disclosure-accepted";
const PRO_TOOL_LOCK_MESSAGE = "Unlock this with PRO.";

export function CreateOptionsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { clearDraft } = useWorkspaceDraft();
  const {
    credits: creditBalance,
    hasPaidAccess,
    hasProAccess,
  } = useViewerCredits();
  const { openStore } = useDiamondStore();
  const isRTL = I18nManager.isRTL;
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const sidePadding = 20;
  const headerHeight = insets.top + 70;
  const [isDisclosureVisible, setIsDisclosureVisible] = useState(false);
  const toolCards = useMemo<HomeToolCardItem[]>(
    () => [
      {
        id: "interior-design",
        image: require("../assets/media/discover/home/home-dining-room.webp"),
        title: t("home.tools.interior.title"),
        description: t("home.tools.interior.description"),
        serviceParam: "interior",
        topLeftRadius: 40,
      },
      {
        id: "exterior-design",
        image: require("../assets/media/discover/exterior/exterior-modern-villa.webp"),
        title: t("home.tools.exterior.title"),
        description: t("home.tools.exterior.description"),
        serviceParam: "facade",
        topLeftRadius: 40,
      },
      {
        id: "garden-design",
        image: require("../assets/media/discover/garden/garden-fireside-patio.webp"),
        title: t("home.tools.garden.title"),
        description: t("home.tools.garden.description"),
        serviceParam: "garden",
        topLeftRadius: 40,
      },
      {
        id: "paint",
        image: require("../assets/media/discover/wall-scenes/sage-green-suite.webp"),
        title: t("home.tools.paint.title"),
        description: t("home.tools.paint.description"),
        serviceParam: "paint",
        topLeftRadius: 40,
      },
      {
        id: "floor-restyle",
        image: require("../assets/media/discover/floor-scenes/polished-carrara-marble.webp"),
        title: t("home.tools.floor.title"),
        description: t("home.tools.floor.description"),
        serviceParam: "floor",
        topLeftRadius: 40,
      },
      {
        id: "layout-optimization",
        image: require("../assets/media/discover/layout/layout-optimization-hero.webp"),
        title: t("home.tools.smartSpacePlanning.title"),
        description: t("home.tools.smartSpacePlanning.description"),
        serviceParam: "layout",
        topLeftRadius: 40,
        requiresPro: true,
        locked: !hasProAccess,
      },
      {
        id: "replace-objects",
        image: require("../assets/media/discover/injected/home/living-room.webp"),
        title: t("home.tools.replace.title"),
        description: t("home.tools.replace.description"),
        serviceParam: "replace",
        topLeftRadius: 40,
        requiresPro: true,
        locked: !hasProAccess,
      },
      {
        id: "reference-style",
        image: require("../assets/media/discover/collages/living-rooms.webp"),
        title: t("home.tools.referenceStyle.title"),
        description: t("home.tools.referenceStyle.description"),
        href: "/workspace?service=interior&entrySource=reference-style",
        topLeftRadius: 40,
        requiresPro: true,
        locked: !hasProAccess,
      },
    ],
    [hasProAccess, i18n.language, t],
  );

  useEffect(() => {
    void Asset.loadAsync(toolCards.map((card) => card.image as number));
  }, [toolCards]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const accepted = await AsyncStorage.getItem(FIRST_LAUNCH_DISCLOSURE_KEY);
      if (active && accepted !== "true") {
        setIsDisclosureVisible(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const routeToToolFlow = useCallback(
    (redirectTo: string) => {
      router.push(redirectTo as any);
    },
    [router],
  );

  const handleTryIt = useCallback((item: HomeToolCardItem) => {
    clearDraft();

    if (item.href) {
      return withWorkspaceFlowId(item.href);
    }

    if (!item.serviceParam) {
      throw new Error("This tool is not available yet.");
    }

    return withWorkspaceFlowId(`/workspace?service=${item.serviceParam}`);
  }, [clearDraft]);

  const handleToolPress = async (item: HomeToolCardItem) => {
    try {
      triggerHaptic();
      const redirectTo = handleTryIt(item);

      if (!canCreateAsGuest) {
        router.push({ pathname: "/sign-in", params: { returnTo: redirectTo } });
        return;
      }

      if (item.requiresPro && !hasProAccess) {
        Alert.alert(PRO_TOOL_LOCK_MESSAGE);
        return;
      }

      routeToToolFlow(redirectTo);
    } catch (error) {
      Alert.alert(t("home.errors.tryItUnavailableTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    }
  };

  const handleUpgradeProPress = () => {
    triggerHaptic();
    router.push({ pathname: "/paywall", params: { source: "tools-upgrade" } } as any);
  };

  const handleCreditsPress = () => {
    triggerHaptic();
    openStore();
  };

  const handleAcceptDisclosure = useCallback(async () => {
    triggerHaptic();
    await AsyncStorage.setItem(FIRST_LAUNCH_DISCLOSURE_KEY, "true");
    setIsDisclosureVisible(false);
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    triggerHaptic();
    router.push({ pathname: "/legal-viewer", params: { document: "privacy" } } as never);
  }, [router]);

  const handleOpenTerms = useCallback(() => {
    triggerHaptic();
    router.push({ pathname: "/legal-viewer", params: { document: "terms" } } as never);
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.headerShell, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.headerRow, { flexDirection: getDirectionalRow(isRTL) }]}>
          <View style={[styles.sideSlot, { alignItems: getDirectionalAlignment(isRTL) }]}>
            {hasPaidAccess ? (
              <ProBadge style={styles.creditPill} />
            ) : (
              <DiamondCreditPill
                accessibilityLabel={t("home.accessibility.openCredits")}
                count={creditBalance}
                onPress={handleCreditsPress}
                style={styles.creditPill}
                variant="light"
              />
            )}
          </View>

          <View style={[styles.sideSlot, { alignItems: getDirectionalOppositeAlignment(isRTL) }]}>
            <Pressable
              accessibilityLabel={t("settings.upgradePro")}
              accessibilityRole="button"
              onPress={handleUpgradeProPress}
              style={[styles.upgradeProButton, { flexDirection: getDirectionalRow(isRTL) }]}
            >
              <Diamond color="#FFFFFF" size={15} strokeWidth={2.15} />
              <Text numberOfLines={1} style={styles.upgradeProText}>{t("settings.upgradePro")}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + 32,
            paddingHorizontal: sidePadding,
            paddingBottom: Math.max(insets.bottom + 120, 148),
          },
        ]}
      >
        <View style={styles.toolList}>
          {toolCards.map((card, index) => (
            <View key={card.id} style={styles.toolListItem}>
              <HomeToolCard item={card} onPress={handleToolPress} />
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => undefined} transparent visible={isDisclosureVisible}>
        <View style={styles.disclosureOverlay}>
          <View style={[styles.disclosureCard, { marginTop: Math.max(insets.top + 24, 40) }]}>
            <Text style={styles.disclosureEyebrow}>{t("firstLaunchDisclosure.eyebrow")}</Text>
            <Text style={styles.disclosureTitle}>{t("firstLaunchDisclosure.title")}</Text>
            <Text style={styles.disclosureBody}>{t("firstLaunchDisclosure.body")}</Text>

            <View style={styles.disclosureLinkRow}>
              <Pressable accessibilityRole="button" onPress={handleOpenPrivacy} style={styles.disclosureLinkButton}>
                <Text style={styles.disclosureLinkText}>{t("settings.rows.privacyPolicy")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={handleOpenTerms} style={styles.disclosureLinkButton}>
                <Text style={styles.disclosureLinkText}>{t("settings.rows.termsOfUse")}</Text>
              </Pressable>
            </View>

            <Pressable accessibilityRole="button" onPress={() => void handleAcceptDisclosure()} style={styles.disclosurePrimaryButton}>
              <Text style={styles.disclosurePrimaryButtonText}>{t("firstLaunchDisclosure.cta")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: DS.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.colors.border,
    boxShadow: `0px 14px 40px ${DS.colors.shadow}`,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  sideSlot: {
    width: 132,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  creditPill: {
    minHeight: 42,
    paddingHorizontal: 10,
  },
  upgradeProButton: {
    minHeight: 42,
    maxWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "#111318",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    boxShadow: "0px 12px 28px rgba(17, 19, 24, 0.18), inset 0px 0px 0px 1px rgba(255,255,255,0.08)",
  },
  upgradeProText: {
    color: "#FFFFFF",
    ...DS.typography.button,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
    flexShrink: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 0,
  },
  toolList: {
    gap: 18,
  },
  toolListItem: {
    gap: 18,
  },
  disclosureOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  disclosureCard: {
    ...surfaceCard("#FFFFFF"),
    ...organicRadii(44, 18),
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 14,
  },
  disclosureEyebrow: {
    color: DS.colors.textTertiary,
    ...DS.typography.label,
  },
  disclosureTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  disclosureBody: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  disclosureLinkRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  disclosureLinkButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.surfaceHigh,
  },
  disclosureLinkText: {
    color: DS.colors.textPrimary,
    ...DS.typography.bodySm,
  },
  disclosurePrimaryButton: {
    minHeight: 52,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: DS.colors.accent,
  },
  disclosurePrimaryButtonText: {
    color: DS.colors.textInverse,
    ...DS.typography.button,
  },
});
