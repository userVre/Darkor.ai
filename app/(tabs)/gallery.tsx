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
import { DS, ambientShadow, floatingButton, organicRadii } from "../../lib/design-system";
import {
  DISCOVER_TABS,
  getDiscoverGroups,
  type DiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../lib/discover-catalog";
import { triggerHaptic } from "../../lib/haptics";

const SCREEN_SIDE_MARGIN = 24;
const TAB_RAIL_MAX_WIDTH = 392;
const TAB_RAIL_PADDING = 6;
const CARD_GAP = 16;
const SECTION_ESTIMATED_HEIGHT = 420;

const CARD_VARIANTS = [
  { width: 252, height: 336 },
  { width: 220, height: 284 },
  { width: 284, height: 360 },
  { width: 236, height: 310 },
] as const;

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
  onPreview,
  onSeeAll,
}: {
  tabId: DiscoverTabId;
  group: DiscoverGroup;
  onPreview: (item: DiscoverTile) => void;
  onSeeAll: (tabId: DiscoverTabId, group: DiscoverGroup) => void;
}) {
  const { t } = useTranslation();
  const snapOffsets = useMemo(() => {
    let offset = 0;
    return group.items.map((_, index) => {
      const nextOffset = offset;
      offset += CARD_VARIANTS[index % CARD_VARIANTS.length].width + CARD_GAP;
      return nextOffset;
    });
  }, [group.items]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <Pressable accessibilityRole="button" onPress={() => onSeeAll(tabId, group)} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>{t("common.actions.seeAll")}</Text>
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
        renderItem={({ item, index }) => {
          const metrics = CARD_VARIANTS[index % CARD_VARIANTS.length];

          return (
            <DiscoverImageCard
              item={item}
              width={metrics.width}
              height={metrics.height}
              onPress={onPreview}
              style={index < group.items.length - 1 ? styles.cardGap : undefined}
            />
          );
        }}
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
  const tabRailWidth = useMemo(() => Math.min(width - SCREEN_SIDE_MARGIN * 2, TAB_RAIL_MAX_WIDTH), [width]);
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
        onPreview={handlePreviewOpen}
        onSeeAll={handleSeeAll}
      />
    ),
    [activeTab, handlePreviewOpen, handleSeeAll],
  );

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
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
            <Text style={styles.headerEyebrow}>Mood Boards</Text>
            <Text style={styles.headerTitle}>{t("discover.title")}</Text>
            <Text style={styles.headerSubtitle}>Curated references with gallery-grade composition.</Text>
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
    paddingBottom: 32,
  },
  headerRow: {
    minHeight: 110,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerSide: {
    width: 112,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  headerTitleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
    paddingHorizontal: SCREEN_SIDE_MARGIN + 24,
    gap: 8,
  },
  headerEyebrow: {
    color: DS.colors.textSecondary,
    ...DS.typography.label,
  },
  headerTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
    textAlign: "center",
  },
  headerSubtitle: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
    textAlign: "center",
  },
  tabsOuter: {
    alignItems: "center",
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginTop: 32,
  },
  tabsRail: {
    padding: TAB_RAIL_PADDING,
    ...organicRadii(26, 16),
    backgroundColor: "rgba(255,255,255,0.84)",
    position: "relative",
    ...ambientShadow(),
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
    ...organicRadii(20, 14),
    backgroundColor: DS.colors.accentSurface,
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  tabLabel: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  tabLabelActive: {
    color: DS.colors.accent,
    fontWeight: "700",
  },
  section: {
    marginBottom: 32,
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
    color: DS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  seeAllButton: {
    ...floatingButton(false),
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "flex-end",
  },
  seeAllText: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  sectionContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
