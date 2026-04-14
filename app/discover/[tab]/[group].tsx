import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ArrowLeft } from "@/components/material-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiscoverImageCard } from "../../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../../components/discover-preview-modal";
import { DS, floatingButton } from "../../../lib/design-system";
import {
  getDiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../../lib/discover-catalog";
import { triggerHaptic } from "../../../lib/haptics";

const SCREEN_SIDE_MARGIN = 24;
const GRID_GAP = 12;

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
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.28), [cardWidth]);

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
          {group?.title ?? "Discover"}
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
            {group.items.map((item, index) => (
              <DiscoverImageCard
                key={item.id}
                item={item}
                width={cardWidth}
                height={cardHeight}
                onPress={handlePreviewOpen}
                style={index % 2 === 0 ? styles.gridCardLeft : styles.gridCardRight}
              />
            ))}
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
    color: "#111111",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    fontWeight: "700",
  },
  headerSpacer: {
    width: 48,
  },
  masonry: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: GRID_GAP,
  },
  gridCardLeft: {
    marginBottom: GRID_GAP,
  },
  gridCardRight: {
    marginBottom: GRID_GAP,
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
