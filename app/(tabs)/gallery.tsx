import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { DiscoverImageCard } from "../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../components/discover-preview-modal";
import { useViewerCredits } from "../../components/viewer-credits-context";
import {
  DISCOVER_TABS,
  getDiscoverGroups,
  type DiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../lib/discover-catalog";
import { triggerHaptic } from "../../lib/haptics";
import { fonts } from "../../styles/typography";

const SCREEN_SIDE_MARGIN = 20;
const TAB_RAIL_MAX_WIDTH = 392;
const TAB_RAIL_PADDING = 6;
const CARD_GAP = 18;
const OUTER_WINDOW_SIZE = 5;

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
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <Pressable accessibilityRole="button" onPress={() => onSeeAll(tabId, group)} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>{t("common.actions.seeAll")}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        style={{ height: cardHeight }}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.sectionContent}
      >
        {group.items.map((item, index) => (
          <DiscoverImageCard
            key={item.id}
            item={item}
            width={cardWidth}
            height={cardHeight}
            onPress={onPreview}
            style={index < group.items.length - 1 ? styles.cardGap : undefined}
          />
        ))}
      </ScrollView>
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
  const tabRailWidth = useMemo(() => Math.min(width - SCREEN_SIDE_MARGIN * 2, TAB_RAIL_MAX_WIDTH), [width]);
  const cardWidth = useMemo(() => Math.min(Math.max(width * 0.48, 184), 208), [width]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.18), [cardWidth]);
  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: Math.max(insets.bottom + 34, 44),
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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerSide}>
            <DiamondCreditPill
              accessibilityLabel="Open credits"
              count={creditBalance}
              onPress={handleCreditsPress}
              variant="dark"
            />
          </View>

          <View pointerEvents="none" style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{t("discover.title")}</Text>
          </View>

          <View style={styles.headerSide} />
        </View>

        <DiscoverTabs activeTab={activeTab} railWidth={tabRailWidth} onSelect={handleTabSelect} />
      </View>
    ),
    [activeTab, creditBalance, handleCreditsPress, handleTabSelect, insets.top, t, tabRailWidth],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={groups}
        keyExtractor={keyExtractor}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={OUTER_WINDOW_SIZE}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews
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
    backgroundColor: "#FFFFFF",
  },
  headerWrap: {
    paddingBottom: 40,
  },
  headerRow: {
    minHeight: 52,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: {
    width: 112,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.bold,
  },
  tabsOuter: {
    alignItems: "center",
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginTop: 40,
  },
  tabsRail: {
    padding: TAB_RAIL_PADDING,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#F1F3F5",
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
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  tabLabel: {
    color: "#8D95A1",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
  tabLabelActive: {
    color: "#0A0A0A",
    ...fonts.bold,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 18,
    textTransform: "uppercase",
    letterSpacing: 2.4,
    ...fonts.bold,
  },
  seeAllButton: {
    paddingVertical: 2,
    alignItems: "flex-end",
  },
  seeAllText: {
    color: "#8D95A1",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
  sectionContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});

