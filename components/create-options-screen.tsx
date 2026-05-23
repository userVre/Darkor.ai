import {useAuth} from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Asset} from "expo-asset";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, ScrollView, StyleSheet, View} from "react-native";
import {Button as PaperButton, Dialog, Portal, Text} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {md3Spacing} from "../constants/md3Theme";
import {ENABLE_GUEST_WIZARD_TEST_MODE} from "../lib/guest-testing";
import {triggerHaptic} from "../lib/haptics";
import {withWorkspaceFlowId} from "../lib/try-it-flow";
import {useTheme, type Theme} from "../styles/theme";
import {HomeHeaderPills} from "./home-header-pills";
import {HomeToolCard, type HomeToolCardItem} from "./home-tool-card";
import {useViewerCredits} from "./viewer-credits-context";
import {useWorkspaceDraft} from "./workspace-context";

const FIRST_LAUNCH_DISCLOSURE_KEY = "homedecor:first-launch-disclosure-accepted";

export function CreateOptionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();
  const {isSignedIn} = useAuth();
  const {clearDraft} = useWorkspaceDraft();
  const {hasProAccess} = useViewerCredits();
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const sidePadding = md3Spacing.extraLarge;
  const headerHeight = insets.top + 64;
  const [isDisclosureVisible, setIsDisclosureVisible] = useState(false);
  const toolCards = useMemo<HomeToolCardItem[]>(
    () => [
      {
        id: "interior-design",
        image: require("../assets/media/discover/home/home-dining-room.webp"),
        title: t("home.tools.interior.title"),
        description: t("home.tools.interior.description"),
        serviceParam: "interior",
        topLeftRadius: 16,
      },
      {
        id: "exterior-design",
        image: require("../assets/media/discover/exterior/exterior-modern-villa.webp"),
        title: t("home.tools.exterior.title"),
        description: t("home.tools.exterior.description"),
        serviceParam: "facade",
        topLeftRadius: 16,
      },
      {
        id: "garden-design",
        image: require("../assets/media/discover/garden/garden-fireside-patio.webp"),
        title: t("home.tools.garden.title"),
        description: t("home.tools.garden.description"),
        serviceParam: "garden",
        topLeftRadius: 16,
      },
      {
        id: "paint",
        image: require("../assets/media/discover/wall-scenes/sage-green-suite.webp"),
        title: t("home.tools.paint.title"),
        description: t("home.tools.paint.description"),
        serviceParam: "paint",
        topLeftRadius: 16,
      },
      {
        id: "floor-restyle",
        image: require("../assets/media/discover/floor-scenes/polished-carrara-marble.webp"),
        title: t("home.tools.floor.title"),
        description: t("home.tools.floor.description"),
        serviceParam: "floor",
        topLeftRadius: 16,
      },
      {
        id: "layout-optimization",
        image: require("../assets/media/discover/layout/layout-optimization-hero.webp"),
        title: t("home.tools.smartSpacePlanning.title"),
        description: t("home.tools.smartSpacePlanning.description"),
        serviceParam: "layout",
        topLeftRadius: 16,
        requiresPro: true,
        locked: !hasProAccess,
      },
      {
        id: "replace-objects",
        image: require("../assets/media/discover/injected/home/living-room.webp"),
        title: t("home.tools.replace.title"),
        description: t("home.tools.replace.description"),
        serviceParam: "replace",
        topLeftRadius: 16,
        requiresPro: true,
        locked: !hasProAccess,
      },
      {
        id: "reference-style",
        image: require("../assets/media/discover/collages/living-rooms.webp"),
        title: t("home.tools.referenceStyle.title"),
        description: t("home.tools.referenceStyle.description"),
        href: "/workspace?service=interior&entrySource=reference-style",
        topLeftRadius: 16,
        requiresPro: true,
        locked: !hasProAccess,
      },
    ],
    [hasProAccess, i18n.language, t],
  );

  useEffect(() => {
    void Asset.loadAsync(toolCards.map((card) => card.image as number)).catch((error) => {
      console.warn("[Assets] Tool card image preload failed - continuing", error);
    });
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
      throw new Error("Cet outil n'est pas encore disponible.");
    }

    return withWorkspaceFlowId(`/workspace?service=${item.serviceParam}`);
  }, [clearDraft]);

  const handleToolPress = async (item: HomeToolCardItem) => {
    try {
      triggerHaptic();
      const redirectTo = handleTryIt(item);

      if (!canCreateAsGuest) {
        router.push({pathname: "/sign-in", params: {returnTo: redirectTo}});
        return;
      }

      if (item.requiresPro && !hasProAccess) {
        Alert.alert(t("elitePass.fullPage.proToolLocked"));
        return;
      }

      routeToToolFlow(redirectTo);
    } catch (error) {
      Alert.alert(t("home.errors.tryItUnavailableTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    }
  };

  const handleAcceptDisclosure = useCallback(async () => {
    triggerHaptic();
    await AsyncStorage.setItem(FIRST_LAUNCH_DISCLOSURE_KEY, "true");
    setIsDisclosureVisible(false);
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    triggerHaptic();
    router.push({pathname: "/legal-viewer", params: {document: "privacy"}} as never);
  }, [router]);

  const handleOpenTerms = useCallback(() => {
    triggerHaptic();
    router.push({pathname: "/legal-viewer", params: {document: "terms"}} as never);
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View style={[styles.headerShell, {paddingTop: insets.top}]}>
        <HomeHeaderPills title={t("tabs.tools")} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + md3Spacing.doubleExtraLarge,
            paddingHorizontal: sidePadding,
            paddingBottom: Math.max(insets.bottom + 120, 148),
          },
        ]}
      >
        <View style={styles.toolList}>
          {toolCards.map((card) => (
            <View key={card.id} style={styles.toolListItem}>
              <HomeToolCard item={card} onPress={handleToolPress} />
            </View>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Dialog dismissable={false} visible={isDisclosureVisible}>
          <Dialog.Title>{t("firstLaunchDisclosure.title")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelLarge">{t("firstLaunchDisclosure.eyebrow")}</Text>
            <Text style={styles.disclosureBody} variant="bodyMedium">
              {t("firstLaunchDisclosure.body")}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.disclosureActions}>
            <PaperButton mode="text" onPress={handleOpenPrivacy}>
              {t("settings.rows.privacyPolicy")}
            </PaperButton>
            <PaperButton mode="text" onPress={handleOpenTerms}>
              {t("settings.rows.termsOfUse")}
            </PaperButton>
            <PaperButton mode="contained" onPress={() => void handleAcceptDisclosure()}>
              {t("firstLaunchDisclosure.cta")}
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
    headerShell: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: md3Spacing.large,
      paddingBottom: md3Spacing.small,
      backgroundColor: theme.bg,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollContent: {
      gap: 0,
    },
    toolList: {
      gap: md3Spacing.extraLarge,
    },
    toolListItem: {
      gap: md3Spacing.extraLarge,
    },
    disclosureBody: {
      color: theme.textSecondary,
      marginTop: md3Spacing.small,
    },
    disclosureActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: md3Spacing.small,
    },
  });
}
