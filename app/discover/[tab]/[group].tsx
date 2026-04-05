import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiscoverImageCard } from "../../../components/discover-image-card";
import { DiscoverPreviewModal } from "../../../components/discover-preview-modal";
import {
  getDiscoverGroup,
  type DiscoverTabId,
  type DiscoverTile,
} from "../../../lib/discover-catalog";
import { triggerHaptic } from "../../../lib/haptics";
import { fonts } from "../../../styles/typography";

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
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.18), [cardWidth]);

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
          <ArrowLeft color="#0A0A0A" size={22} strokeWidth={2.25} />
        </Pressable>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {group?.title ?? "Discover"}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {group ? (
        <FlashList
          data={group.items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_SIDE_MARGIN,
            paddingTop: 18,
            paddingBottom: Math.max(insets.bottom + 28, 40),
          }}
          renderItem={({ item, index }) => (
            <DiscoverImageCard
              item={item}
              width={cardWidth}
              height={cardHeight}
              onPress={handlePreviewOpen}
              style={[
                styles.gridCard,
                index % 2 === 0 ? styles.gridCardRightGap : null,
              ]}
            />
          )}
        />
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.bold,
  },
  headerSpacer: {
    width: 40,
  },
  gridCard: {
    marginBottom: GRID_GAP,
  },
  gridCardRightGap: {
    marginRight: GRID_GAP,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#0A0A0A",
    fontSize: 22,
    lineHeight: 26,
    ...fonts.bold,
  },
  emptyBody: {
    color: "#6B6B72",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    ...fonts.regular,
  },
});
