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
import { Diamond } from "@/components/material-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { DiscoverImageCard } from "../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../components/discover-preview-modal";
import {
  DISCOVER_TABS,
  getDiscoverGroups,
  type DiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../lib/discover-catalog";
import { triggerHaptic } from "../../lib/haptics";
import { fonts } from "../../styles/typography";

const SCREEN_SIDE_MARGIN = 24;
const TAB_RAIL_MAX_WIDTH = 392;
const TAB_RAIL_PADDING = 6;
const CARD_GAP = 12;
const OUTER_WINDOW_SIZE = 5;

const ThreeDiamondMark = memo(function ThreeDiamondMark() {
  return (
    <View style={styles.diamondMark} pointerEvents="none">
      <Diamond color="#0A0A0A" size={11} strokeWidth={2.2} style={styles.diamondLeft} />
      <Diamond color="#0A0A0A" size={13} strokeWidth={2.2} style={styles.diamondCenter} />
      <Diamond color="#0A0A0A" size={11} strokeWidth={2.2} style={styles.diamondRight} />
    </View>
  );
});

const DiscoverTabs = memo(function DiscoverTabs({
  activeTab,
  railWidth,
  onSelect,
}: {
  activeTab: DiscoverTabId;
  railWidth: number;
  onSelect: (tabId: DiscoverTabId) => void;
}) {
  const { t } = useTranslation();
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
                  {t(`discover.tabs.${tab.id}`)}
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
  const [activeTab, setActiveTab] = useState<DiscoverTabId>("home");
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);

  const groups = useMemo(() => getDiscoverGroups(activeTab), [activeTab]);
  const tabRailWidth = useMemo(() => Math.min(width - SCREEN_SIDE_MARGIN * 2, TAB_RAIL_MAX_WIDTH), [width]);
  const cardWidth = useMemo(() => Math.min(Math.max(width * 0.48, 184), 208), [width]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.18), [cardWidth]);

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

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={OUTER_WINDOW_SIZE}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews
        renderItem={({ item }) => (
          <DiscoverSection
            tabId={activeTab}
            group={item}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onPreview={handlePreviewOpen}
            onSeeAll={handleSeeAll}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 34, 44),
        }}
        ListHeaderComponent={
          <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerSide}>
                <ThreeDiamondMark />
              </View>

              <Text style={styles.headerTitle}>{t("discover.title")}</Text>

              <View style={styles.headerSide} />
            </View>

            <DiscoverTabs activeTab={activeTab} railWidth={tabRailWidth} onSelect={setActiveTab} />
          </View>
        }
      />

      <DiscoverPreviewModal
        item={previewItem}
        visible={Boolean(previewItem)}
        topInset={insets.top}
        onClose={handlePreviewClose}
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
    paddingBottom: 32,
  },
  headerRow: {
    minHeight: 52,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: {
    width: 52,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  diamondMark: {
    width: 30,
    height: 18,
    position: "relative",
  },
  diamondLeft: {
    position: "absolute",
    left: 0,
    top: 4,
    opacity: 0.92,
  },
  diamondCenter: {
    position: "absolute",
    left: 9,
    top: 0,
  },
  diamondRight: {
    position: "absolute",
    right: 0,
    top: 4,
    opacity: 0.92,
  },
  headerTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.bold,
  },
  tabsOuter: {
    alignItems: "center",
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginTop: 32,
  },
  tabsRail: {
    padding: TAB_RAIL_PADDING,
    borderRadius: 999,
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
    borderRadius: 999,
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
    marginBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 22,
    ...fonts.bold,
  },
  seeAllButton: {
    paddingVertical: 2,
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

