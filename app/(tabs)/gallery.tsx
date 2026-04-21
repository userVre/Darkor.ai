import { StatusBar } from "expo-status-bar";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { DiscoverImageCard } from "../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../components/discover-preview-modal";
import { DiamondCreditPill } from "../../components/diamond-credit-pill";
import { CreditLimitModal } from "../../components/credit-limit-modal";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { DS } from "../../lib/design-system";
import {
  type DiscoverCluster,
  type DiscoverClusterId,
  type DiscoverGroup,
  type DiscoverTile,
  useDiscoverClusters,
} from "../../lib/discover-catalog";
import { triggerHaptic } from "../../lib/haptics";
import { fonts } from "../../styles/typography";

const SCREEN_SIDE_MARGIN = 24;
const CARD_GAP = 12;

const DiscoverSection = memo(function DiscoverSection({
  group,
  cardWidth,
  cardHeight,
  onPreview,
  onExploreGroup,
  seeAllLabel,
}: {
  group: DiscoverGroup;
  cardWidth: number;
  cardHeight: number;
  onPreview: (item: DiscoverTile) => void;
  onExploreGroup: (group: DiscoverGroup) => void;
  seeAllLabel: string;
}) {
  const snapOffsets = useMemo(
    () => group.items.map((_, index) => index * (cardWidth + CARD_GAP)),
    [cardWidth, group.items],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onExploreGroup(group)} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{seeAllLabel}</Text>
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
  const { credits } = useViewerCredits();
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);
  const [isCreditModalVisible, setIsCreditModalVisible] = useState(false);
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

  const keyExtractor = useCallback((item: DiscoverGroup) => item.id, []);

  const renderSection = useCallback(
    ({ item }: { item: DiscoverGroup }) => {
      return (
        <DiscoverSection
          group={item}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onPreview={handlePreviewOpen}
          onExploreGroup={handleExploreGroup}
          seeAllLabel={t("seeAll")}
        />
      );
    },
    [cardHeight, cardWidth, handleExploreGroup, handlePreviewOpen, t],
  );

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topRow}>
          <View style={styles.creditSlot}>
            <DiamondCreditPill
              accessibilityLabel={t("home.accessibility.openCredits")}
              accessibilityRole="button"
              count={credits}
              onPress={handleCreditsPress}
              style={styles.creditPill}
              variant="dark"
            />
          </View>

          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={styles.headerTitle}>{t("tabs.discover")}</Text>
          </View>

          <View style={styles.rightSpacer} />
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
                <Text style={[styles.categoryTabText, active ? styles.categoryTabTextActive : null]}>{cluster.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [clusters, credits, handleClusterPress, handleCreditsPress, insets.top, selectedCluster?.id, selectedClusterId, t],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

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

      <CreditLimitModal
        body="You can use Diamonds to unlock more redesigns from Discover, or upgrade now to jump straight into the paywall."
        title="Credit Balance"
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
    paddingBottom: 20,
    backgroundColor: DS.colors.surface,
  },
  topRow: {
    minHeight: 48,
    marginBottom: 18,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  creditSlot: {
    minWidth: 88,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  creditPill: {
    minHeight: 42,
  },
  titleWrap: {
    position: "absolute",
    left: 88,
    right: 88,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: DS.colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
    ...fonts.bold,
  },
  rightSpacer: {
    width: 88,
  },
  categoryTabs: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  categoryTab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
    paddingHorizontal: 12,
  },
  categoryTabActive: {
    backgroundColor: DS.colors.textPrimary,
    borderColor: DS.colors.textPrimary,
  },
  categoryTabText: {
    color: DS.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.semibold,
  },
  categoryTabTextActive: {
    color: DS.colors.textInverse,
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
    fontSize: 18,
    lineHeight: 24,
    ...fonts.bold,
  },
  sectionAction: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionActionText: {
    color: DS.colors.textSecondary,
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
