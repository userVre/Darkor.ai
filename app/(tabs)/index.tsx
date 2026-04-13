import { useAuth } from "@clerk/expo";
import { Settings } from "@/components/material-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { HomeToolsBottomNav } from "../../components/home-tools-bottom-nav";
import { HomeToolCard, type HomeToolCardItem } from "../../components/home-tool-card";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { withWorkspaceFlowId } from "../../lib/try-it-flow";
import { fonts } from "../../styles/typography";

const STICKY_HEADER_HEIGHT = 56;
const FIRST_CARD_TOP_GAP = 16;
const TOOL_GRID_GAP = 20;

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const {
    clearDraft,
  } = useWorkspaceDraft();
  const { credits: creditBalance, hasPaidAccess } = useViewerCredits();
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const stickyHeaderOffset = insets.top + STICKY_HEADER_HEIGHT;
  const gridWidth = width - 40;
  const compactCardWidth = useMemo(() => Math.floor((gridWidth - TOOL_GRID_GAP) / 2), [gridWidth]);
  const toolCards: HomeToolCardItem[] = [
    {
      id: "interior-design",
      image: require("../../assets/media/discover/home/home-dining-room.jpg"),
      title: t("home.tools.interior.title"),
      description: t("home.tools.interior.description"),
      serviceParam: "interior",
    },
    {
      id: "exterior-design",
      image: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
      title: t("home.tools.exterior.title"),
      description: t("home.tools.exterior.description"),
      descriptionPaddingRight: 80,
      serviceParam: "facade",
    },
    {
      id: "garden-design",
      image: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
      title: t("home.tools.garden.title"),
      description: t("home.tools.garden.description"),
      serviceParam: "garden",
    },
    {
      id: "paint",
      image: require("../../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
      title: t("home.tools.paint.title"),
      description: t("home.tools.paint.description"),
      serviceParam: "paint",
    },
    {
      id: "floor-restyle",
      image: require("../../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
      title: t("home.tools.floor.title"),
      description: t("home.tools.floor.description"),
      descriptionPaddingRight: 80,
      serviceParam: "floor",
    },
  ];

  const openDesignFlowPaywall = useCallback((redirectTo: string) => {
    router.push({
      pathname: "/paywall",
      params: {
        source: "design-flow",
        redirectTo,
      },
    } as any);
  }, [router]);

  const routeToToolFlow = useCallback(
    (redirectTo: string) => {
      if (hasPaidAccess || creditBalance > 0) {
        router.push(redirectTo as any);
        return;
      }

      openDesignFlowPaywall(redirectTo);
    },
    [creditBalance, hasPaidAccess, openDesignFlowPaywall, router],
  );

  const handleTryIt = useCallback((item: HomeToolCardItem) => {
    clearDraft();
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

      routeToToolFlow(redirectTo);
    } catch (error) {
      Alert.alert(t("home.errors.tryItUnavailableTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    }
  };

  const handleCreatePress = () => {
    triggerHaptic();
    const nextWorkspaceRoute = withWorkspaceFlowId("/workspace");

    if (!canCreateAsGuest) {
      clearDraft();
      router.push({ pathname: "/sign-in", params: { returnTo: nextWorkspaceRoute } });
      return;
    }

    clearDraft();
    routeToToolFlow(nextWorkspaceRoute);
  };

  const handleDiscoverPress = () => {
    triggerHaptic();
    router.navigate("/gallery");
  };

  const handleProfilePress = () => {
    triggerHaptic();
    router.push("/profile");
  };

  const handleToolsPress = () => {
    triggerHaptic();
    router.navigate("/");
  };

  const handleSettingsPress = () => {
    triggerHaptic();
    router.push("/settings" as any);
  };

  const handleCreditsPress = () => {
    setIsCreditModalVisible(true);
  };

  const handleCreditModalClose = () => {
    setIsCreditModalVisible(false);
  };

  const handleCreditModalUpgrade = () => {
    setIsCreditModalVisible(false);
    router.push("/paywall");
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.stickyHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Text numberOfLines={1} style={styles.title}>{t("home.title")}</Text>

          <View style={styles.headerActions}>
            <DiamondCreditPill
              accessibilityLabel="Open credits"
              count={creditBalance}
              onPress={handleCreditsPress}
              style={styles.creditPill}
              variant="dark"
            />
            <Pressable accessibilityRole="button" onPress={handleSettingsPress} style={styles.settingsButton}>
              <Settings color="#0A0A0A" size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        horizontal={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: stickyHeaderOffset + FIRST_CARD_TOP_GAP }]}
      >
        <View style={styles.toolGrid}>
          {toolCards.map((card, index) => {
            const isFeature = index === 0;

            return (
              <HomeToolCard
                key={card.id}
                index={index}
                item={card}
                onPress={handleToolPress}
                variant={isFeature ? "feature" : "compact"}
                style={isFeature ? styles.featureCard : [styles.compactCard, { width: compactCardWidth }]}
              />
            );
          })}
        </View>
      </ScrollView>

      <HomeToolsBottomNav
        activeTab="tools"
        onToolsPress={handleToolsPress}
        onCreatePress={handleCreatePress}
        onDiscoverPress={handleDiscoverPress}
        onProfilePress={handleProfilePress}
      />

      <CreditLimitModal
        visible={isCreditModalVisible}
        onClose={handleCreditModalClose}
        onUpgrade={handleCreditModalUpgrade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECE7E1",
  },
  headerRow: {
    height: STICKY_HEADER_HEIGHT,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 22,
    lineHeight: 22,
    textAlign: "left",
    ...fonts.bold,
  },
  creditPill: {
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E8EC",
    backgroundColor: "#F7F8FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 112,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: TOOL_GRID_GAP,
  },
  featureCard: {
    width: "100%",
  },
  compactCard: {
    maxWidth: "48%",
  },
});

