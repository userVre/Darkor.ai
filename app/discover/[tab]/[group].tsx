import {useLocalSearchParams, useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {FlatList, StyleSheet, View, useWindowDimensions} from "react-native";
import {Appbar, Text} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DiscoverImageCard} from "../../../components/discover-image-card";
import {DiscoverPreviewModal} from "../../../components/discover-preview-modal";
import {md3Spacing} from "../../../constants/md3Theme";
import {DS, SCREEN_SECTION_GAP} from "../../../lib/design-system";
import {
type DiscoverTabId,
type DiscoverTile,
useDiscoverGroup,
} from "../../../lib/discover-catalog";
import {triggerHaptic} from "../../../lib/haptics";
import {useTheme, type Theme} from "../../../styles/theme";

const SCREEN_SIDE_MARGIN = 24;
const GRID_GAP = 16;
const DEFAULT_CARD_HEIGHT_RATIO = 1.28;
const GARDEN_CARD_HEIGHT_RATIO = 1;

function getDiscoverGridKey(item: DiscoverTile) {
  return `${item.categoryId}:${item.id}`;
}

function readRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function DiscoverSeeAllScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ tab?: string | string[]; group?: string | string[] }>();
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);

  const tabId = readRouteParam(params.tab) as DiscoverTabId | undefined;
  const groupId = readRouteParam(params.group);
  const group = useDiscoverGroup(tabId ?? "discover", groupId);

  const cardWidth = useMemo(() => {
    const availableWidth = width - SCREEN_SIDE_MARGIN * 2 - GRID_GAP;
    return Math.floor(availableWidth / 2);
  }, [width]);
  const cardHeight = useMemo(
    () => Math.round(cardWidth * (group?.service === "garden" ? GARDEN_CARD_HEIGHT_RATIO : DEFAULT_CARD_HEIGHT_RATIO)),
    [cardWidth, group?.service],
  );

  const handlePreviewOpen = useCallback((item: DiscoverTile) => {
    triggerHaptic();
    setPreviewItem(item);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const handleBack = useCallback(() => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/gallery");
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <Appbar.Header elevated mode="center-aligned" style={[styles.header, { paddingTop: insets.top }]}>
        <Appbar.BackAction onPress={handleBack} />
        <Appbar.Content title={group?.title ?? t("discover.title")} titleStyle={styles.headerTitle} />
        <View style={styles.headerSpacer} />
      </Appbar.Header>

      {group ? (
        <FlatList
          data={group.items}
          numColumns={2}
          keyExtractor={getDiscoverGridKey}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: SCREEN_SIDE_MARGIN,
            paddingTop: SCREEN_SECTION_GAP,
            paddingBottom: Math.max(insets.bottom + 120, 132),
          }}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item, index }) => (
            <DiscoverImageCard
              item={item}
              width={cardWidth}
              height={cardHeight}
              onPress={handlePreviewOpen}
              style={index % 2 === 0 ? styles.gridCardLeft : styles.gridCardRight}
            />
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("gallery.emptyState.title")}</Text>
          <Text style={styles.emptyBody}>{t("gallery.emptyState.body")}</Text>
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

function createStyles(theme: Theme) {
return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    minHeight: 64,
    backgroundColor: theme.paperTheme.colors.surface,
  },
  headerTitle: {
    color: theme.paperTheme.colors.onSurface,
    letterSpacing: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },
  gridRow: {
    justifyContent: "space-between",
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
    gap: md3Spacing.small,
  },
  emptyTitle: {
    color: theme.textPrimary,
    ...DS.typography.cardTitle,
  },
  emptyBody: {
    color: theme.textSecondary,
    ...DS.typography.body,
    textAlign: "left",
  },
});
}
