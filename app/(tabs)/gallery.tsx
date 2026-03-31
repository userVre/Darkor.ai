import { useAuth } from "@clerk/expo";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bath,
  BedDouble,
  BookOpen,
  Building2,
  CookingPot,
  Home,
  Monitor,
  PaintRoller,
  Projector,
  Sofa,
  Sparkles,
  Store,
  Trees,
  Warehouse,
  type LucideIcon,
} from "lucide-react-native";

import { LuxPressable } from "../../components/lux-pressable";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { useWorkspaceDraft } from "../../components/workspace-context";
import {
  DISCOVER_SECTIONS,
  type DiscoverSection,
  type DiscoverSectionId,
  type DiscoverTile,
} from "../../lib/data";
import { HAIRLINE } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { withWorkspaceFlowId } from "../../lib/try-it-flow";
import { spacing } from "../../styles/spacing";
import { fonts } from "../../styles/typography";

const SCREEN_BG = "#FFFFFF";
const PRIMARY_TEXT = "#0A0A0A";
const SECONDARY_TEXT = "#575757";
const MUTED_TEXT = "#A1A1AA";
const TAB_INACTIVE = "#CFCFD4";
const CARD_BORDER = "#ECECEC";
const CARD_SHADOW = "rgba(15,23,42,0.08)";
const SCREEN_SIDE_MARGIN = 20;
const TAB_LEFT_MARGIN = 24;
const SECTION_GAP = 32;
const HEADER_TO_CONTENT_GAP = 20;
const GRID_GAP = 12;
const HOME_CARD_RADIUS = 20;
const RAIL_CARD_RADIUS = 18;

type DiscoverTabConfig = {
  id: "home" | "garden" | "exterior";
  label: string;
  sectionIds: DiscoverSectionId[];
};

const CATEGORY_TABS: DiscoverTabConfig[] = [
  { id: "home", label: "Home", sectionIds: ["home", "wall", "floor"] },
  { id: "garden", label: "Garden", sectionIds: ["garden"] },
  { id: "exterior", label: "Exterior Design", sectionIds: ["exterior"] },
] as const;

type DiscoverTabId = DiscoverTabConfig["id"];

function getCardTitle(item: DiscoverTile) {
  const title = item.title.trim();
  if (title.length > 0) return title;
  return item.spaceType.trim().length > 0 ? item.spaceType : "Curated Space";
}

function getCardStyle(item: DiscoverTile) {
  const style = item.style.trim();
  if (style.length > 0) return style;
  return "Featured";
}

function getCardCategory(item: DiscoverTile) {
  const category = item.spaceType.trim();
  if (category.length > 0) {
    return category;
  }
  return "Space";
}

function getCategoryIcon(item: DiscoverTile): LucideIcon {
  const key = `${item.service}:${item.spaceType}`.toLowerCase();

  if (item.service === "paint") return PaintRoller;
  if (item.service === "floor") return Sparkles;
  if (item.service === "garden") return Trees;

  if (key.includes("living")) return Sofa;
  if (key.includes("bed")) return BedDouble;
  if (key.includes("kitchen")) return CookingPot;
  if (key.includes("bath")) return Bath;
  if (key.includes("office")) return Monitor;
  if (key.includes("theater")) return Projector;
  if (key.includes("library")) return BookOpen;
  if (key.includes("retail")) return Store;
  if (key.includes("garage")) return Warehouse;
  if (item.service === "exterior") return Building2;

  return Home;
}

const DiscoverCategoryTabs = memo(function DiscoverCategoryTabs({
  activeTab,
  onSelectTab,
}: {
  activeTab: DiscoverTabId;
  onSelectTab: (tabId: DiscoverTabId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContent}
      style={styles.tabsRail}
    >
      {CATEGORY_TABS.map((tab, index) => {
        const active = tab.id === activeTab;
        return (
          <LuxPressable
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            pressableClassName="cursor-pointer"
            className="cursor-pointer"
            style={[
              styles.tabButton,
              index === 0 ? { marginLeft: TAB_LEFT_MARGIN } : null,
              active ? styles.tabButtonActive : null,
            ]}
            glowColor="rgba(10,10,10,0.08)"
            scale={0.98}
          >
            <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tab.label}</Text>
            <View style={[styles.tabUnderline, active ? styles.tabUnderlineActive : null]} />
          </LuxPressable>
        );
      })}
    </ScrollView>
  );
});

const DiscoverMagazineCard = memo(function DiscoverMagazineCard({
  item,
  width,
  compact = false,
  onPress,
}: {
  item: DiscoverTile;
  width: number;
  compact?: boolean;
  onPress: (item: DiscoverTile) => void;
}) {
  const title = getCardTitle(item);
  const styleName = getCardStyle(item);
  const categoryName = getCardCategory(item);
  const CategoryIcon = getCategoryIcon(item);
  const imageHeight = compact ? Math.round(width * 0.88) : Math.round(width * 0.98);

  const handlePress = useCallback(() => {
    triggerHaptic();
    void onPress(item);
  }, [item, onPress]);

  return (
    <LuxPressable
      onPress={handlePress}
      pressableClassName="cursor-pointer"
      className="cursor-pointer"
      style={[
        styles.card,
        compact ? styles.compactCard : styles.homeCard,
        {
          width,
          borderRadius: compact ? RAIL_CARD_RADIUS : HOME_CARD_RADIUS,
        },
      ]}
      glowColor="rgba(15,23,42,0.08)"
      scale={0.985}
    >
      <Image source={item.image} style={{ width: "100%", height: imageHeight }} contentFit="cover" transition={120} cachePolicy="memory-disk" />

      <View style={styles.cardFooter}>
        <View style={styles.cardLabelBar}>
          <View style={styles.cardIconWrap}>
            <CategoryIcon color={PRIMARY_TEXT} size={14} strokeWidth={2.2} />
          </View>
          <Text style={styles.cardCategory}>{categoryName}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.cardMetaRow}>
          <Text style={styles.cardStyle}>{styleName}</Text>
          <View style={styles.tryItPill}>
            <Text style={styles.tryItPillText}>Try It!</Text>
          </View>
        </View>
      </View>
    </LuxPressable>
  );
});

const DiscoverSectionBlock = memo(function DiscoverSectionBlock({
  section,
  expanded,
  onToggleExpanded,
  onCardPress,
  homeCardWidth,
  railCardWidth,
}: {
  section: DiscoverSection;
  expanded: boolean;
  onToggleExpanded: () => void;
  onCardPress: (item: DiscoverTile) => void;
  homeCardWidth: number;
  railCardWidth: number;
}) {
  const isRailSection = section.id === "wall" || section.id === "floor";
  const isHomeGridSection = section.id === "home" || section.id === "garden" || section.id === "exterior";

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <LuxPressable
          onPress={onToggleExpanded}
          pressableClassName="cursor-pointer"
          className="cursor-pointer"
          style={styles.sectionAction}
          glowColor="rgba(10,10,10,0.06)"
          scale={0.98}
        >
          <Text style={styles.sectionActionText}>{expanded ? "Show Less" : "See All"}</Text>
        </LuxPressable>
      </View>

      <View style={{ marginTop: HEADER_TO_CONTENT_GAP }}>
        {isRailSection && !expanded ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
          >
            {section.items.map((item, index) => (
              <View key={item.id} style={{ marginRight: index === section.items.length - 1 ? 0 : GRID_GAP }}>
                <DiscoverMagazineCard item={item} width={railCardWidth} compact onPress={onCardPress} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.gridWrap}>
            {section.items.map((item) => (
              <DiscoverMagazineCard
                key={item.id}
                item={item}
                width={isHomeGridSection ? homeCardWidth : railCardWidth}
                compact={!isHomeGridSection}
                onPress={onCardPress}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

export default function GalleryScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    clearDraft,
  } = useWorkspaceDraft();
  const { credits: creditBalance, hasPaidAccess } = useViewerCredits();
  const [activeTab, setActiveTab] = useState<DiscoverTabId>("home");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;

  const homeCardWidth = useMemo(
    () => Math.floor((width - SCREEN_SIDE_MARGIN * 2 - GRID_GAP) / 2),
    [width],
  );
  const railCardWidth = useMemo(() => Math.min(248, Math.max(width * 0.56, 214)), [width]);

  const sectionsForActiveTab = useMemo(() => {
    const activeSectionIds = CATEGORY_TABS.find((tab) => tab.id === activeTab)?.sectionIds ?? ["home"];
    return DISCOVER_SECTIONS.filter((section) => activeSectionIds.includes(section.id));
  }, [activeTab]);

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

  const handleTryIt = useCallback(async (item: DiscoverTile) => {
    const serviceParam =
      item.service === "garden"
        ? "garden"
        : item.service === "exterior"
          ? "facade"
          : item.service === "paint"
            ? "paint"
            : item.service === "floor"
              ? "floor"
              : "interior";

    clearDraft();
    return withWorkspaceFlowId(`/workspace?service=${serviceParam}`);
  }, [clearDraft]);

  const handleCardPress = useCallback(
    async (item: DiscoverTile) => {
      try {
        const redirectTo = await handleTryIt(item);

        if (!canCreateAsGuest) {
          router.push({ pathname: "/sign-in", params: { returnTo: redirectTo } });
          return;
        }

        routeToToolFlow(redirectTo);
      } catch (error) {
        Alert.alert("Try It unavailable", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [canCreateAsGuest, handleTryIt, routeToToolFlow, router],
  );

  const handleToggleSection = useCallback((sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom + 28, 36),
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Discover</Text>
          <Text style={styles.heroSubtitle}>
            Curated interiors, wall palettes, garden scenes, and exterior concepts designed to launch you straight into a polished redesign flow.
          </Text>
        </View>

        <DiscoverCategoryTabs activeTab={activeTab} onSelectTab={setActiveTab} />

        <View style={styles.sectionsWrap}>
          {sectionsForActiveTab.map((section) => (
            <DiscoverSectionBlock
              key={section.id}
              section={section}
              expanded={Boolean(expandedSections[section.id])}
              onToggleExpanded={() => handleToggleSection(section.id)}
              onCardPress={handleCardPress}
              homeCardWidth={homeCardWidth}
              railCardWidth={railCardWidth}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  hero: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    gap: 8,
  },
  heroTitle: {
    color: PRIMARY_TEXT,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.9,
    ...fonts.bold,
  },
  heroSubtitle: {
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 720,
    ...fonts.regular,
  },
  tabsRail: {
    marginTop: 28,
  },
  tabsContent: {
    paddingRight: 24,
    alignItems: "flex-end",
  },
  tabButton: {
    marginRight: 24,
    paddingHorizontal: 4,
    paddingBottom: 14,
    minWidth: 88,
  },
  tabButtonActive: {
    minWidth: 108,
  },
  tabLabel: {
    color: TAB_INACTIVE,
    fontSize: 19,
    lineHeight: 24,
    ...fonts.semibold,
  },
  tabLabelActive: {
    color: PRIMARY_TEXT,
    ...fonts.bold,
  },
  tabUnderline: {
    marginTop: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: PRIMARY_TEXT,
  },
  sectionsWrap: {
    marginTop: 28,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    gap: SECTION_GAP,
  },
  section: {
    gap: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    color: PRIMARY_TEXT,
    fontSize: 24,
    lineHeight: 29,
    ...fonts.bold,
  },
  sectionAction: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  sectionActionText: {
    color: MUTED_TEXT,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    ...fonts.semibold,
  },
  railContent: {
    paddingRight: 4,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: HAIRLINE,
    borderColor: CARD_BORDER,
    shadowColor: CARD_SHADOW,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  homeCard: {
    flexGrow: 0,
  },
  compactCard: {
    flexGrow: 0,
  },
  cardFooter: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  cardLabelBar: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECECEC",
  },
  cardCategory: {
    color: PRIMARY_TEXT,
    fontSize: 12,
    lineHeight: 15,
    ...fonts.semibold,
  },
  cardTitle: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    lineHeight: 22,
    ...fonts.bold,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardStyle: {
    flex: 1,
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
  tryItPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#0A0A0A",
  },
  tryItPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    ...fonts.bold,
  },
});
