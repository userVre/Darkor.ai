import { useAuth } from "@clerk/expo";
import { Gem, Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { HomeToolsBottomNav } from "../../components/home-tools-bottom-nav";
import { HomeToolCard, type HomeToolCardItem } from "../../components/home-tool-card";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
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
    serviceParam: "floor",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;

  const handleToolPress = (serviceParam: HomeToolCardItem["serviceParam"]) => {
    if (!canCreateAsGuest) {
      router.push({ pathname: "/sign-in", params: { returnTo: `/workspace?service=${serviceParam}` } });
      return;
    }

    router.push({ pathname: "/workspace", params: { service: serviceParam } });
  };

  const handleCreatePress = () => {
    triggerHaptic();

    if (!canCreateAsGuest) {
      router.push({ pathname: "/sign-in", params: { returnTo: "/workspace" } });
      return;
    }

    router.navigate("/workspace");
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
          <Text style={styles.creditsText}>3</Text>
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
