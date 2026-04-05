import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Diamond } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiscoverImageCard } from "../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../components/discover-preview-modal";
import { HAIRLINE } from "../../lib/design-system";
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
const SECTION_GAP = 30;
const ROW_GAP = 14;
const CARD_GAP = 14;

const DiscoverCategoryTabs = memo(function DiscoverCategoryTabs({
  activeTab,
  onSelectTab,
}: {
  activeTab: DiscoverTabId;
  onSelectTab: (tabId: DiscoverTabId) => void;
}) {
  const [tabLayouts, setTabLayouts] = useState<Partial<Record<DiscoverTabId, { x: number; width: number }>>>({});
  const activeLayout = tabLayouts[activeTab];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContent}
      style={styles.tabsScroll}
    >
      <View style={styles.tabsTrack}>
        {activeLayout ? (
          <MotiView
            animate={{ translateX: activeLayout.x, width: activeLayout.width }}
            transition={{ type: "timing", duration: 220 }}
            style={styles.activeTabPill}
          />
        ) : null}

        {DISCOVER_TABS.map((tab, index) => {
          const isActive = tab.id === activeTab;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              onPress={() => {
                triggerHaptic();
                onSelectTab(tab.id);
              }}
              style={[
                styles.tabButton,
                index < DISCOVER_TABS.length - 1 ? styles.tabButtonGap : null,
              ]}
            >
              <View
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;

                  setTabLayouts((current) => {
                    const previous = current[tab.id];
                    if (previous?.x === x && previous?.width === width) {
                      return current;
                    }

                    return {
                      ...current,
                      [tab.id]: { x, width },
                    };
                  });
                }}
                style={styles.tabButtonInner}
              >
                <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{tab.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
});

const ThreeDiamondsMark = memo(function ThreeDiamondsMark() {
  return (
    <View style={styles.diamondsWrap}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={index < 2 ? styles.diamondOverlap : null}
        >
          <Diamond color="#0A0A0A" size={14} strokeWidth={2.1} />
        </View>
      ))}
    </View>
  );
});

const DiscoverRow = memo(function DiscoverRow({
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
  return (
    <View style={styles.groupSection}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.title}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => onSeeAll(tabId, group)}
          style={({ pressed }) => [styles.seeAllButton, pressed ? styles.seeAllButtonPressed : null]}
        >
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<DiscoverTabId>("home");
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);

  const groups = useMemo(() => getDiscoverGroups(activeTab), [activeTab]);
  const cardWidth = useMemo(() => Math.min(Math.max(width * 0.58, 220), 264), [width]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.24), [cardWidth]);

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

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom + 28, 40),
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={[styles.headerSide, styles.headerStart]}>
              <ThreeDiamondsMark />
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Discover</Text>
            </View>

            <View style={styles.headerSide} />
          </View>
        </View>

        <DiscoverCategoryTabs activeTab={activeTab} onSelectTab={setActiveTab} />

        <View style={styles.sections}>
          {groups.map((group) => (
            <DiscoverRow
              key={group.id}
              tabId={activeTab}
              group={group}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onPreview={handlePreviewOpen}
              onSeeAll={handleSeeAll}
            />
          ))}
        </View>
      </ScrollView>

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
  scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: {
    width: 72,
    minHeight: 44,
    justifyContent: "center",
  },
  headerStart: {
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.55,
    ...fonts.bold,
  },
  diamondsWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  diamondOverlap: {
    marginRight: -2,
  },
  tabsScroll: {
    marginTop: 24,
  },
  tabsContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  tabsTrack: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "#F4F4F4",
    borderWidth: HAIRLINE,
    borderColor: "#ECECEC",
    position: "relative",
  },
  activeTabPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    backgroundColor: "#0A0A0A",
  },
  tabButton: {
    borderRadius: 999,
  },
  tabButtonGap: {
    marginRight: 4,
  },
  tabButtonInner: {
    minHeight: 44,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  tabLabel: {
    color: "#6B6B72",
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
    ...fonts.semibold,
  },
  tabLabelActive: {
    color: "#FFFFFF",
    ...fonts.bold,
  },
  sections: {
    marginTop: 30,
    gap: SECTION_GAP,
  },
  groupSection: {
    gap: ROW_GAP,
  },
  groupHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  groupTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.45,
    ...fonts.bold,
  },
  seeAllButton: {
    paddingVertical: 4,
  },
  seeAllButtonPressed: {
    opacity: 0.56,
  },
  seeAllText: {
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.semibold,
  },
  rowContent: {
    paddingLeft: SCREEN_SIDE_MARGIN,
    paddingRight: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
