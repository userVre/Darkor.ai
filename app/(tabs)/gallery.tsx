import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Diamond } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const SCREEN_SIDE_MARGIN = 18;
const TAB_GAP = 8;
const CARD_GAP = 10;

const ThreeDiamondBadge = memo(function ThreeDiamondBadge({ value }: { value: number }) {
  return (
    <View style={styles.creditBadge}>
      <Diamond color="#FFFFFF" size={13} strokeWidth={2.2} />
      <Text style={styles.creditValue}>{value}</Text>
    </View>
  );
});

const DiscoverTabs = memo(function DiscoverTabs({
  activeTab,
  onSelect,
}: {
  activeTab: DiscoverTabId;
  onSelect: (tabId: DiscoverTabId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContent}
    >
      <View style={styles.tabsRail}>
        {DISCOVER_TABS.map((tab, index) => {
          const isActive = tab.id === activeTab;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              onPress={() => {
                triggerHaptic();
                onSelect(tab.id);
              }}
              style={[
                styles.tabButton,
                isActive ? styles.tabButtonActive : null,
                index < DISCOVER_TABS.length - 1 ? styles.tabButtonGap : null,
              ]}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <Pressable accessibilityRole="button" onPress={() => onSeeAll(tabId, group)} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={group.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <DiscoverImageCard
            item={item}
            width={cardWidth}
            height={cardHeight}
            onPress={onPreview}
            style={index < group.items.length - 1 ? styles.cardGap : undefined}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionContent}
      />
    </View>
  );
});

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { credits } = useViewerCredits();
  const [activeTab, setActiveTab] = useState<DiscoverTabId>("home");
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);

  const groups = useMemo(() => getDiscoverGroups(activeTab), [activeTab]);
  const cardWidth = useMemo(() => Math.min(Math.max((width - 46) / 2, 150), 168), [width]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.42), [cardWidth]);

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
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 30, 44),
        }}
        ListHeaderComponent={
          <View style={[styles.headerWrap, { paddingTop: insets.top + 6 }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerSide}>
                <ThreeDiamondBadge value={credits} />
              </View>
              <Text style={styles.headerTitle}>Discover</Text>
              <View style={styles.headerSide} />
            </View>

            <DiscoverTabs activeTab={activeTab} onSelect={setActiveTab} />
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
    paddingBottom: 12,
  },
  headerRow: {
    minHeight: 48,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: {
    width: 80,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
    ...fonts.bold,
  },
  creditBadge: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0A0A0A",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  creditValue: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 16,
    ...fonts.bold,
  },
  tabsContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  tabsRail: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#F7F7F7",
    padding: 4,
  },
  tabButton: {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  tabButtonGap: {
    marginRight: TAB_GAP,
  },
  tabLabel: {
    color: "#52525B",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.medium,
  },
  tabLabelActive: {
    color: "#0A0A0A",
    ...fonts.semibold,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  seeAllButton: {
    paddingVertical: 2,
  },
  seeAllText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.medium,
  },
  sectionContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
