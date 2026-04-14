import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ArrowLeft } from "@/components/material-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacedCapsLabel } from "../../../components/design-wizard-primitives";
import { DiscoverImageCard } from "../../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../../components/discover-preview-modal";
import { DS, ambientShadow, floatingButton, organicRadii } from "../../../lib/design-system";
import {
  getDiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../../lib/discover-catalog";
import { triggerHaptic } from "../../../lib/haptics";

const SCREEN_SIDE_MARGIN = 24;
const GRID_GAP = 16;

function readRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function DiscoverSeeAllScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ tab?: string | string[]; group?: string | string[] }>();
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);

  const tabId = readRouteParam(params.tab) as DiscoverTabId | undefined;
  const groupId = readRouteParam(params.group);
  const group = useMemo(() => {
    if (!tabId || !groupId) {
      return undefined;
    }

    return getDiscoverGroup(tabId, groupId);
  }, [groupId, tabId]);

  const cardWidth = useMemo(() => {
    const availableWidth = width - SCREEN_SIDE_MARGIN * 2 - GRID_GAP;
    return Math.floor(availableWidth / 2);
  }, [width]);
  const masonryItems = useMemo(() => {
    if (!group) {
      return { left: [] as Array<{ item: DiscoverTile; height: number }>, right: [] as Array<{ item: DiscoverTile; height: number }> };
    }

    const columns = { left: [] as Array<{ item: DiscoverTile; height: number }>, right: [] as Array<{ item: DiscoverTile; height: number }> };
    let leftHeight = 0;
    let rightHeight = 0;

    group.items.forEach((item, index) => {
      const ratios = [1.58, 1.04, 1.36, 1.72, 1.12, 1.44];
      const height = Math.round(cardWidth * ratios[index % ratios.length]);
      if (leftHeight <= rightHeight) {
        columns.left.push({ item, height });
        leftHeight += height + GRID_GAP;
      } else {
        columns.right.push({ item, height });
        rightHeight += height + GRID_GAP;
      }
    });

    return columns;
  }, [cardWidth, group]);

  const handlePreviewOpen = useCallback((item: DiscoverTile) => {
    triggerHaptic();
    setPreviewItem(item);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const handleBack = useCallback(() => {
    triggerHaptic();
    router.back();
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={handleBack} style={styles.backButton}>
          <ArrowLeft color={DS.colors.textPrimary} size={22} strokeWidth={2.25} />
        </Pressable>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {spacedCapsLabel(group?.title ?? "Discover")}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {group ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: SCREEN_SIDE_MARGIN,
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom + 120, 132),
          }}
        >
          <View style={styles.masonry}>
            <View style={styles.column}>
              {masonryItems.left.map(({ item, height }) => (
                <DiscoverImageCard key={item.id} item={item} width={cardWidth} height={height} onPress={handlePreviewOpen} style={styles.gridCard} />
              ))}
            </View>
            <View style={[styles.column, styles.offsetColumn]}>
              {masonryItems.right.map(({ item, height }) => (
                <DiscoverImageCard key={item.id} item={item} width={cardWidth} height={height} onPress={handlePreviewOpen} style={styles.gridCard} />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Category unavailable</Text>
          <Text style={styles.emptyBody}>The requested image group could not be found.</Text>
        </View>
      )}

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
    backgroundColor: DS.colors.background,
  },
  header: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 48,
    height: 48,
    ...floatingButton(false),
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: DS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    letterSpacing: 3.2,
    fontFamily: "Inter",
    fontWeight: "600",
  },
  headerSpacer: {
    width: 48,
  },
  masonry: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GRID_GAP,
  },
  column: {
    flex: 1,
    gap: GRID_GAP,
  },
  offsetColumn: {
    marginTop: 28,
  },
  gridCard: {
    marginBottom: 0,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  emptyBody: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    textAlign: "left",
  },
});
