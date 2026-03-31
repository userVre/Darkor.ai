import { useAuth } from "@clerk/expo";
import { Gem, Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { HomeToolsBottomNav } from "../../components/home-tools-bottom-nav";
import { HomeToolCard, type HomeToolCardItem } from "../../components/home-tool-card";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { FEATURED_TRY_IT_BY_ID } from "../../lib/featured-try-it";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { normalizeFeaturedTryItExample, prepareTryItFlow, withWorkspaceFlowId } from "../../lib/try-it-flow";
import { fonts } from "../../styles/typography";

const FLOATING_TITLE_TOP = 48;
const FLOATING_TITLE_LINE_HEIGHT = 22;
const FIRST_CARD_TOP_GAP = 36;
const SCROLL_TOP_SPACER = FLOATING_TITLE_TOP + FLOATING_TITLE_LINE_HEIGHT + FIRST_CARD_TOP_GAP;

const TOOL_CARDS: HomeToolCardItem[] = [
  {
    id: "interior-design",
    image: require("../../assets/media/discover/home/home-dining-room.jpg"),
    title: "Interior Design",
    description: "Upload a pic, choose a style, let AI design the room!",
    serviceParam: "interior",
  },
  {
    id: "exterior-design",
    image: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
    title: "Exterior Design",
    description: "Snap your home, pick a vibe, let AI craft the facade!",
    descriptionPaddingRight: 80,
    serviceParam: "facade",
  },
  {
    id: "garden-design",
    image: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
    title: "Garden Design",
    description: "Choose a style you adore and give your garden a whole new vibe with just a simple touch!",
    serviceParam: "garden",
  },
  {
    id: "paint",
    image: require("../../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
    title: "Paint",
    description: "Pick any color you love and transform your space with just a touch!",
    serviceParam: "paint",
  },
  {
    id: "floor-restyle",
    image: require("../../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
    title: "Floor Restyle",
    description: "Edit floor plans with AI \u2014 rearrange rooms in one tap!",
    descriptionPaddingRight: 80,
    serviceParam: "floor",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    clearDraft,
    setDraftAspectRatio,
    setDraftFinish,
    setDraftImage,
    setDraftMode,
    setDraftPalette,
    setDraftPrompt,
    setDraftRoom,
    setDraftStyle,
  } = useWorkspaceDraft();
  const { credits: creditBalance, hasPaidAccess } = useViewerCredits();
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const usageBadgeLabel = String(creditBalance);

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

  const handleTryIt = useCallback(async (item: HomeToolCardItem) => {
    const featuredExample = FEATURED_TRY_IT_BY_ID.get(item.id);
    if (!featuredExample) {
      clearDraft();
      return withWorkspaceFlowId(`/workspace?service=${item.serviceParam}`);
    }

    const prepared = await prepareTryItFlow(
      {
        setDraftImage,
        setDraftRoom,
        setDraftStyle,
        setDraftPalette,
        setDraftMode,
        setDraftFinish,
        setDraftPrompt,
        setDraftAspectRatio,
      },
      normalizeFeaturedTryItExample(featuredExample, "home"),
    );

    return prepared.redirectTo;
  }, [
    clearDraft,
    setDraftAspectRatio,
    setDraftFinish,
    setDraftImage,
    setDraftMode,
    setDraftPalette,
    setDraftPrompt,
    setDraftRoom,
    setDraftStyle,
  ]);

  const handleToolPress = async (item: HomeToolCardItem) => {
    try {
      triggerHaptic();
      const redirectTo = await handleTryIt(item);

      if (!canCreateAsGuest) {
        router.push({ pathname: "/sign-in", params: { returnTo: redirectTo } });
        return;
      }

      routeToToolFlow(redirectTo);
    } catch (error) {
      Alert.alert("Try It unavailable", error instanceof Error ? error.message : "Please try again.");
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

      <View pointerEvents="box-none" style={styles.headerOverlay}>
        <Pressable accessibilityRole="button" onPress={handleCreditsPress} style={styles.creditsBadge}>
          <Gem color="#FFFFFF" size={13} strokeWidth={2.2} />
          <Text style={styles.creditsText}>{usageBadgeLabel}</Text>
        </Pressable>

        <Text style={styles.title}>Darkor AI</Text>

        <Pressable accessibilityRole="button" onPress={handleSettingsPress} style={styles.settingsButton}>
          <Settings color="#0A0A0A" size={22} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        horizontal={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={{ height: SCROLL_TOP_SPACER }} />

        {TOOL_CARDS.map((card, index) => (
          <HomeToolCard
            key={card.id}
            item={card}
            onPress={handleToolPress}
            style={index === TOOL_CARDS.length - 1 ? styles.lastCard : styles.cardSpacing}
          />
        ))}
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
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    pointerEvents: "box-none",
  },
  creditsBadge: {
    position: "absolute",
    top: 36,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  creditsText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
  title: {
    position: "absolute",
    top: FLOATING_TITLE_TOP,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#0A0A0A",
    fontSize: 22,
    lineHeight: FLOATING_TITLE_LINE_HEIGHT,
    ...fonts.bold,
  },
  settingsButton: {
    position: "absolute",
    top: 44,
    right: 32,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  cardSpacing: {
    marginBottom: 12,
  },
  lastCard: {
    marginBottom: 32,
  },
});
