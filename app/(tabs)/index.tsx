import { useAuth } from "@clerk/expo";
import { Settings } from "@/components/material-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutRectangle } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { HomeToolCard, type HomeToolCardItem } from "../../components/home-tool-card";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { DS, ambientShadow, floatingButton, organicRadii } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { withWorkspaceFlowId } from "../../lib/try-it-flow";

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const { clearDraft } = useWorkspaceDraft();
  const { credits: creditBalance, hasPaidAccess } = useViewerCredits();
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const cardLayoutsRef = useRef<Record<string, LayoutRectangle>>({});
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const sidePadding = DS.spacing[3];
  const toolGap = DS.spacing[2];
  const compactCardWidth = useMemo(
    () => Math.floor((width - sidePadding * 2 - toolGap) / 2),
    [sidePadding, toolGap, width],
  );
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

  const resolveFocusedCard = useCallback(
    (scrollY: number) => {
      const viewportAnchor = scrollY + 260;
      const layouts = Object.entries(cardLayoutsRef.current);
      if (!layouts.length) {
        return;
      }

      let nextFocusedId = layouts[0][0];
      let smallestDistance = Number.POSITIVE_INFINITY;

      for (const [id, layout] of layouts) {
        const cardCenter = layout.y + layout.height / 2;
        const distance = Math.abs(cardCenter - viewportAnchor);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nextFocusedId = id;
        }
      }

      setFocusedCardId((current) => (current === nextFocusedId ? current : nextFocusedId));
    },
    [],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + DS.spacing[4],
            paddingHorizontal: sidePadding,
            paddingBottom: Math.max(insets.bottom + 120, 148),
          },
        ]}
        scrollEventThrottle={16}
        onScroll={(event) => {
          resolveFocusedCard(event.nativeEvent.contentOffset.y);
        }}
      >
        <View style={styles.headerRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Creative Suite</Text>
            <Text style={styles.title}>{t("home.title")}</Text>
            <Text style={styles.subtitle}>{t("home.tools.interior.description")}</Text>
          </View>

          <View style={styles.headerActions}>
            <DiamondCreditPill
              accessibilityLabel="Open credits"
              count={creditBalance}
              onPress={handleCreditsPress}
              style={styles.creditPill}
              variant="dark"
            />
            <Pressable accessibilityRole="button" onPress={handleSettingsPress} style={styles.settingsButton}>
              <Settings color={DS.colors.textPrimary} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.createBanner}>
          <View style={styles.createBannerCopy}>
            <Text style={styles.createBannerLabel}>Fast Start</Text>
            <Text style={styles.createBannerTitle}>Launch a guided concept in one tap.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={handleCreatePress} style={styles.createBannerButton}>
            <Text style={styles.createBannerButtonText}>Start New</Text>
          </Pressable>
        </View>

        <View style={styles.toolGrid}>
          {toolCards.map((card, index) => {
            const isFeature = index === 0;

            return (
              <View
                key={card.id}
                onLayout={(event) => {
                  cardLayoutsRef.current[card.id] = event.nativeEvent.layout;
                  if (!focusedCardId && index === 0) {
                    setFocusedCardId(card.id);
                  }
                }}
                style={isFeature ? styles.featureCard : [styles.compactCard, { width: compactCardWidth }]}
              >
                <HomeToolCard
                  focused={focusedCardId === card.id}
                  index={index}
                  item={card}
                  onPress={handleToolPress}
                  variant={isFeature ? "feature" : "compact"}
                />
              </View>
            );
          })}
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
    backgroundColor: DS.colors.background,
  },
  headerRow: {
    gap: DS.spacing[4],
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    gap: DS.spacing[1],
  },
  eyebrow: {
    color: DS.colors.textSecondary,
    ...DS.typography.label,
  },
  headerActions: {
    alignItems: "center",
    gap: DS.spacing[1],
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
  },
  subtitle: {
    maxWidth: 340,
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  creditPill: {
    minHeight: 42,
  },
  settingsButton: {
    width: 48,
    height: 48,
    ...floatingButton(false),
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: DS.spacing[4],
  },
  createBanner: {
    ...organicRadii(),
    backgroundColor: "rgba(255,255,255,0.78)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: DS.spacing[2],
    padding: DS.spacing[3],
    ...ambientShadow(),
  },
  createBannerCopy: {
    flex: 1,
    gap: DS.spacing[1],
  },
  createBannerLabel: {
    color: DS.colors.textSecondary,
    ...DS.typography.label,
  },
  createBannerTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  createBannerButton: {
    ...floatingButton(true),
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  createBannerButtonText: {
    color: "#FFFFFF",
    ...DS.typography.button,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: DS.spacing[2],
  },
  featureCard: {
    width: "100%",
  },
  compactCard: {
    maxWidth: "48.5%",
  },
});

