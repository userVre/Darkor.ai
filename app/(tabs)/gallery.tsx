import {FlashList} from "@shopify/flash-list";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {memo, useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {StyleSheet, View, useWindowDimensions} from "react-native";
import {Button, Chip, Text} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DiscoverImageCard} from "../../components/discover-image-card";
import {DiscoverPreviewModal} from "../../components/discover-preview-modal";
import {HomeHeaderPills} from "../../components/home-header-pills";
import {md3Spacing} from "../../constants/md3Theme";
import {
type DiscoverCluster,
type DiscoverClusterId,
type DiscoverGroup,
type DiscoverTile,
useDiscoverClusters,
} from "../../lib/discover-catalog";
import {triggerHaptic} from "../../lib/haptics";
import {useTheme, type Theme} from "../../styles/theme";

const SCREEN_SIDE_MARGIN = 24;
const CARD_GAP = 16;
const DEFAULT_CARD_HEIGHT_RATIO = 1.28;
const GARDEN_CARD_HEIGHT_RATIO = 1;

function getDiscoverCardHeight(group: DiscoverGroup, cardWidth: number) {
  return Math.round(cardWidth * (group.service === "garden" ? GARDEN_CARD_HEIGHT_RATIO : DEFAULT_CARD_HEIGHT_RATIO));
}

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
        <Text ellipsizeMode="tail" numberOfLines={1} variant="titleMedium" style={styles.sectionTitle}>
          {group.title}
        </Text>
        <Button compact mode="text" onPress={() => onExploreGroup(group)} labelStyle={styles.sectionActionText}>
          {seeAllLabel}
        </Button>
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
      const cardHeight = getDiscoverCardHeight(item, cardWidth);

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
    [cardWidth, handleExploreGroup, handlePreviewOpen, styles, t],
  );

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <HomeHeaderPills title={t("tabs.discover")} style={styles.headerPills} />

        <View style={styles.categoryTabs}>
          {clusters.map((cluster: DiscoverCluster) => {
            const active = cluster.id === (selectedCluster?.id ?? selectedClusterId);

            return (
              <Chip
                key={cluster.id}
                accessibilityRole="tab"
                mode="flat"
                onPress={() => handleClusterPress(cluster.id)}
                selected={active}
                showSelectedOverlay
                style={styles.categoryTab}
                textStyle={styles.categoryTabText}
              >
                {cluster.title}
              </Chip>
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
    paddingBottom: md3Spacing.extraLarge,
    backgroundColor: theme.bg,
  },
  headerPills: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  categoryTabs: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: md3Spacing.small,
  },
  categoryTab: {
    backgroundColor: theme.paperTheme.colors.surface,
  },
  categoryTabText: {
    letterSpacing: 0,
  },
  section: {
    marginBottom: md3Spacing.doubleExtraLarge,
  },
  sectionHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginBottom: md3Spacing.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: md3Spacing.medium,
  },
  sectionTitle: {
    flex: 1,
    color: theme.paperTheme.colors.onSurface,
    letterSpacing: 0,
  },
  sectionActionText: {
    color: theme.paperTheme.colors.primary,
    letterSpacing: 0,
  },
  sectionContent: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  cardGap: {
    marginRight: CARD_GAP,
  },
});
}
