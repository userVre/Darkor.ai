import { Asset } from "expo-asset";
import { useAuth } from "@clerk/expo";
import { LinearGradient } from "expo-linear-gradient";
import { Settings } from "@/components/material-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { HomeToolCard, type HomeToolCardItem } from "../../components/home-tool-card";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { DS } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { withWorkspaceFlowId } from "../../lib/try-it-flow";

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { clearDraft } = useWorkspaceDraft();
  const { credits: creditBalance, hasPaidAccess } = useViewerCredits();
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const sidePadding = 20;
  const headerHeight = insets.top + 70;
  const toolCards = useMemo<HomeToolCardItem[]>(
    () => [
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
        serviceParam: "floor",
      },
    ],
    [t],
  );

  useEffect(() => {
    void Asset.loadAsync(toolCards.map((card) => card.image as number));
  }, [toolCards]);

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
      <LinearGradient
        colors={["#FFFDFC", "#F8F3EC", "#F3EEE6"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0.08, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbLeft]} />
      <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbRight]} />

      <View style={[styles.headerShell, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <DiamondCreditPill
            accessibilityLabel="Open credits"
            count={creditBalance}
            onPress={handleCreditsPress}
            style={styles.creditPill}
            variant="light"
          />

          <View pointerEvents="none" style={styles.centerBrand}>
            <Text numberOfLines={1} style={styles.brandTitle}>
              HomeDecor AI
            </Text>
          </View>

          <Pressable accessibilityRole="button" onPress={handleSettingsPress} style={styles.settingsButton}>
            <Settings color={DS.colors.textPrimary} size={20} strokeWidth={2} />
          </Pressable>
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
          {toolCards.map((card) => (
            <HomeToolCard key={card.id} item={card} onPress={handleToolPress} />
          ))}
        </View>
      </ScrollView>

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
    backgroundColor: "#F8F3EC",
  },
  backdropOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(117, 188, 255, 0.18)",
  },
  backdropOrbLeft: {
    top: -42,
    left: -28,
    width: 176,
    height: 176,
  },
  backdropOrbRight: {
    top: 22,
    right: -54,
    width: 148,
    height: 148,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "rgba(248, 243, 236, 0.92)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17, 19, 24, 0.05)",
    boxShadow: "0px 14px 40px rgba(17, 19, 24, 0.06)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    position: "relative",
  },
  centerBrand: {
    position: "absolute",
    left: 88,
    right: 88,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#12161B",
    ...DS.typography.button,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.35,
  },
  creditPill: {
    minHeight: 42,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    boxShadow: "0px 10px 24px rgba(74, 113, 157, 0.14)",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.84)",
    boxShadow: "0px 10px 24px rgba(17, 19, 24, 0.08)",
    alignItems: "center",
    justifyContent: "center",
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
});

