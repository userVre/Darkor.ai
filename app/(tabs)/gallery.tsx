import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CreditLimitModal } from "../../components/credit-limit-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { DiscoverImageCard } from "../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../components/discover-preview-modal";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { DS } from "../../lib/design-system";
import {
  DISCOVER_FEED_ROWS,
  type DiscoverFeedRow,
  type DiscoverGroup,
  type DiscoverTile,
} from "../../lib/discover-catalog";
import { triggerHaptic } from "../../lib/haptics";
import { fonts } from "../../styles/typography";

const SCREEN_SIDE_MARGIN = 24;
const CARD_GAP = 12;

const DiscoverClusterHeader = memo(function DiscoverClusterHeader({ title }: { title: string }) {
  return (
    <View style={styles.clusterHeader}>
      <Text style={styles.clusterTitle}>{title}</Text>
    </View>
  );
});

const DiscoverSection = memo(function DiscoverSection({
  group,
  cardWidth,
  cardHeight,
  onPreview,
  onSeeAll,
}: {
  group: DiscoverGroup;
  cardWidth: number;
  cardHeight: number;
  onPreview: (item: DiscoverTile) => void;
  onSeeAll: (group: DiscoverGroup) => void;
}) {
  const snapOffsets = useMemo(
    () => group.items.map((_, index) => index * (cardWidth + CARD_GAP)),
    [cardWidth, group.items],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <Pressable accessibilityRole="button" onPress={() => onSeeAll(group)} style={styles.seeAllButton}>
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
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);

  const rows = useMemo(() => DISCOVER_FEED_ROWS, []);
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

  const handleSeeAll = useCallback((group: DiscoverGroup) => {
    triggerHaptic();
    router.push({
      pathname: "/discover/[tab]/[group]",
      params: {
        tab: "discover",
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

  const keyExtractor = useCallback((item: DiscoverFeedRow) => item.id, []);

  const renderSection = useCallback(
    ({ item }: { item: DiscoverFeedRow }) => {
      if (item.type === "cluster") {
        return <DiscoverClusterHeader title={item.cluster.title} />;
      }

      return (
        <DiscoverSection
          group={item.group}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onPreview={handlePreviewOpen}
          onSeeAll={handleSeeAll}
        />
      );
    },
    [cardHeight, cardWidth, handlePreviewOpen, handleSeeAll],
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
          <Text style={styles.headerSubtitle}>
            Curated interiors, architecture, and foundation references organized into fast-scrolling collections.
          </Text>
        </View>
      </View>
    ),
    [creditBalance, handleCreditsPress, insets.top, t],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlashList
        data={rows}
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
    maxWidth: 360,
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  clusterHeader: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    marginBottom: 14,
  },
  clusterTitle: {
    color: DS.colors.textSecondary,
    ...DS.typography.label,
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
    color: "#111111",
    fontSize: 18,
    lineHeight: 24,
    ...fonts.bold,
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
