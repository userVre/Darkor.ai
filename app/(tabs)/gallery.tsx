import {FlashList} from "@shopify/flash-list";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {memo, useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Pressable, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DiscoverImageCard} from "../../components/discover-image-card";
import {DiscoverPreviewModal} from "../../components/discover-preview-modal";
import {HomeHeaderPills} from "../../components/home-header-pills";
import {
type DiscoverCluster,
type DiscoverClusterId,
type DiscoverGroup,
type DiscoverTile,
useDiscoverClusters,
} from "../../lib/discover-catalog";
import {triggerHaptic} from "../../lib/haptics";
import {useTheme, type Theme} from "../../styles/theme";
import {fonts} from "../../styles/typography";

const SCREEN_SIDE_MARGIN = 26;
const CARD_GAP = 14;

function getDiscoverTileKey(group: DiscoverGroup, item: DiscoverTile) {
  return `${group.renderKey}:${item.id}`;
}

const DiscoverSection = memo(function DiscoverSection({
  group,
  cardWidth,
  cardHeight,
  onPreview,
  onExploreGroup,
  seeAllLabel,
  styles,
}: {
  group: DiscoverGroup;
  cardWidth: number;
  cardHeight: number;
  onPreview: (item: DiscoverTile) => void;
  onExploreGroup: (group: DiscoverGroup) => void;
  seeAllLabel: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const snapOffsets = useMemo(
    () => group.items.map((_, index) => index * (cardWidth + CARD_GAP)),
    [cardWidth, group.items],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitle}>
          {group.title}
        </Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onExploreGroup(group)} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{seeAllLabel}</Text>
        </Pressable>
      </View>

      <FlashList
        horizontal
        data={group.items}
        keyExtractor={(item) => getDiscoverTileKey(group, item)}
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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<DiscoverClusterId>("interiors");
  const clusters = useDiscoverClusters();
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

  const selectedCluster = useMemo(
    () => clusters.find((cluster) => cluster.id === selectedClusterId) ?? clusters[0],
    [clusters, selectedClusterId],
  );

  const handleClusterPress = useCallback((clusterId: DiscoverClusterId) => {
    triggerHaptic();
    setSelectedClusterId(clusterId);
  }, []);

  const handleExploreGroup = useCallback((group: DiscoverGroup) => {
    triggerHaptic();
    router.push({
      pathname: "/discover/[tab]/[group]",
      params: {
        tab: "discover",
        group: group.id,
      },
    });
  }, [router]);

  const keyExtractor = useCallback((item: DiscoverGroup) => item.renderKey, []);

  const renderSection = useCallback(
    ({ item }: { item: DiscoverGroup }) => {
      return (
        <DiscoverSection
          group={item}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onPreview={handlePreviewOpen}
          onExploreGroup={handleExploreGroup}
          seeAllLabel={t("common.actions.seeAll")}
          styles={styles}
        />
      );
    },
    [cardHeight, cardWidth, handleExploreGroup, handlePreviewOpen, styles, t],
  );

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}>
        <HomeHeaderPills style={styles.headerPills} />

        <View pointerEvents="none" style={styles.titleRow}>
          <Text adjustsFontSizeToFit minimumFontScale={0.86} numberOfLines={1} style={styles.headerTitle}>
            {t("tabs.discover")}
          </Text>
        </View>

        <View style={styles.categoryTabs}>
          {clusters.map((cluster: DiscoverCluster) => {
            const active = cluster.id === (selectedCluster?.id ?? selectedClusterId);

            return (
              <Pressable
                key={cluster.id}
                accessibilityRole="button"
                onPress={() => handleClusterPress(cluster.id)}
                style={[styles.categoryTab, active ? styles.categoryTabActive : null]}
              >
                <Text numberOfLines={1} style={[styles.categoryTabText, active ? styles.categoryTabTextActive : null]}>
                  {cluster.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [clusters, handleClusterPress, insets.top, selectedCluster?.id, selectedClusterId, t],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <FlashList
        data={selectedCluster?.groups ?? []}
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
    </View>
  );
}

function createStyles(theme: Theme) {
return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  headerWrap: {
    paddingBottom: 20,
    backgroundColor: theme.bg,
  },
  headerPills: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  titleRow: {
    marginTop: 18,
    marginBottom: 18,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: theme.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
    textAlign: "center",
    ...fonts.bold,
  },
  categoryTabs: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryTab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: theme.surfaceHigh,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryTabActive: {
    backgroundColor: theme.textPrimary,
    borderColor: theme.textPrimary,
  },
  categoryTabText: {
    color: theme.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    textAlign: "center",
    ...fonts.semibold,
  },
  categoryTabTextActive: {
    color: theme.bg,
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
    color: theme.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
    ...fonts.bold,
  },
  sectionAction: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionActionText: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    ...fonts.semibold,
  },
  sectionContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
}
