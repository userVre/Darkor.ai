import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { DiscoverImageCard } from "../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../components/discover-preview-modal";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { DS } from "../../lib/design-system";
import {
  DISCOVER_TABS,
  getDiscoverGroups,
  type DiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../lib/discover-catalog";
import { triggerHaptic } from "../../lib/haptics";

const SCREEN_SIDE_MARGIN = 24;
const CARD_GAP = 12;
const TAB_RAIL_PADDING = 6;

const DiscoverTabs = memo(function DiscoverTabs({
  activeTab,
  railWidth,
  onSelect,
}: {
  activeTab: DiscoverTabId;
  railWidth: number;
  onSelect: (tabId: DiscoverTabId) => void;
}) {
  const activeIndex = DISCOVER_TABS.findIndex((tab) => tab.id === activeTab);
  const trackWidth = railWidth - TAB_RAIL_PADDING * 2;
  const pillWidth = trackWidth / DISCOVER_TABS.length;
  const pillTranslateX = useRef(new Animated.Value(activeIndex * pillWidth)).current;

  useEffect(() => {
    Animated.spring(pillTranslateX, {
      toValue: activeIndex * pillWidth,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, pillTranslateX, pillWidth]);

  return (
    <View style={styles.tabsOuter}>
      <View style={[styles.tabsRail, { width: railWidth }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            {
              width: pillWidth,
              transform: [{ translateX: pillTranslateX }],
            },
          ]}
        />

        <View style={styles.tabsRow}>
          {DISCOVER_TABS.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic();
                  onSelect(tab.id);
                }}
                style={styles.tabButton}
              >
                <Text numberOfLines={1} style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const DiscoverSection = memo(function DiscoverSection({
  tabId,
  group,
  cardWidth,
  cardHeight,
  onPreview,
  onSeeAll,
}: {
  tabId: DiscoverTabId;
  group: DiscoverGroup;
  cardWidth: number;
  cardHeight: number;
  onPreview: (item: DiscoverTile) => void;
  onSeeAll: (tabId: DiscoverTabId, group: DiscoverGroup) => void;
}) {
  const snapOffsets = useMemo(
    () => group.items.map((_, index) => index * (cardWidth + CARD_GAP)),
    [cardWidth, group.items],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <Pressable accessibilityRole="button" onPress={() => onSeeAll(tabId, group)} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Explore All</Text>
        </Pressable>
      </View>

      <FlashList
        horizontal
        data={group.items}
        keyExtractor={(item) => item.id}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToOffsets={snapOffsets}
        contentContainerStyle={styles.sectionContent}
        renderItem={({ item, index }) => (
          <DiscoverImageCard
            item={item}
            width={cardWidth}
            height={cardHeight}
            onPress={onPreview}
            style={index < group.items.length - 1 ? styles.cardGap : undefined}
          />
        )}
      />
    </View>
  );
});

export default function GalleryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { credits: creditBalance } = useViewerCredits();
  const [activeTab, setActiveTab] = useState<DiscoverTabId>("home");
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);

  const groups = useMemo(() => getDiscoverGroups(activeTab), [activeTab]);
  const tabRailWidth = useMemo(() => Math.min(width * 0.9, 420), [width]);
  const cardWidth = useMemo(() => Math.min(Math.round(width * 0.46), 224), [width]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.28), [cardWidth]);
  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: Math.max(insets.bottom + 120, 132),
    }),
    [insets.bottom],
  );

  const handlePreviewOpen = useCallback((item: DiscoverTile) => {
    triggerHaptic();
    setPreviewItem(item);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const handleSeeAll = useCallback((tabId: DiscoverTabId, group: DiscoverGroup) => {
    triggerHaptic();
    router.push({
      pathname: "/discover/[tab]/[group]",
      params: {
        tab: tabId,
        group: group.id,
      },
    } as never);
  }, [router]);

  const handleCreditsPress = useCallback(() => {
    triggerHaptic();
    setIsCreditModalVisible(true);
  }, []);

  const handleCreditModalClose = useCallback(() => {
    setIsCreditModalVisible(false);
  }, []);

  const handleCreditModalUpgrade = useCallback(() => {
    setIsCreditModalVisible(false);
    router.push("/paywall");
  }, [router]);

  const handleTabSelect = useCallback((tabId: DiscoverTabId) => {
    setActiveTab((currentTab) => (currentTab === tabId ? currentTab : tabId));
  }, []);

  const keyExtractor = useCallback((item: DiscoverGroup) => item.id, []);

  const renderSection = useCallback(
    ({ item }: { item: DiscoverGroup }) => (
      <DiscoverSection
        tabId={activeTab}
        group={item}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        onPreview={handlePreviewOpen}
        onSeeAll={handleSeeAll}
      />
    ),
    [activeTab, cardHeight, cardWidth, handlePreviewOpen, handleSeeAll],
  );

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <DiamondCreditPill
            accessibilityLabel="Open credits"
            count={creditBalance}
            onPress={handleCreditsPress}
            variant="dark"
          />
        </View>

        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t("discover.title")}</Text>
          <Text style={styles.headerSubtitle}>Curated spaces, finishes, and references sized consistently across every row.</Text>
        </View>

        <DiscoverTabs activeTab={activeTab} railWidth={tabRailWidth} onSelect={handleTabSelect} />
      </View>
    ),
    [activeTab, creditBalance, handleCreditsPress, handleTabSelect, insets.top, t, tabRailWidth],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlashList
        data={groups}
        keyExtractor={keyExtractor}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={listHeader}
      />

      <DiscoverPreviewModal
        item={previewItem}
        visible={Boolean(previewItem)}
        topInset={insets.top}
        onClose={handlePreviewClose}
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
    backgroundColor: DS.colors.background,
  },
  headerWrap: {
    paddingBottom: 28,
    gap: 24,
  },
  headerRow: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerCopy: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    gap: 8,
  },
  headerTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
  },
  headerSubtitle: {
    maxWidth: 320,
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  tabsOuter: {
    alignItems: "center",
  },
  tabsRail: {
    padding: TAB_RAIL_PADDING,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "#EEF0F4",
    position: "relative",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabIndicator: {
    position: "absolute",
    top: TAB_RAIL_PADDING,
    left: TAB_RAIL_PADDING,
    bottom: TAB_RAIL_PADDING,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "#111111",
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabLabel: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    color: "#111111",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  seeAllButton: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  seeAllText: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
    fontWeight: "600",
  },
  sectionContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
