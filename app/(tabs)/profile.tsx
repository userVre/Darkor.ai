import {LayoutPanelTop} from "@/components/material-icons";
import {useMutation, useQuery} from "convex/react";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, FlatList, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {BoardActionsModal} from "../../components/board-actions-modal";
import {BoardImageCard} from "../../components/board-image-card";
import {BoardPreviewModal} from "../../components/board-preview-modal";
import {useProSuccess} from "../../components/pro-success-context";
import {useViewerSession} from "../../components/viewer-session-context";
import {mapArchiveToBoardItems, type BoardItem, type BoardItemStatus} from "../../lib/board";
import {DS} from "../../lib/design-system";
import {hasGenerationImage, resolveGenerationStatus} from "../../lib/generation-status";
import {loadLocalBoardItems, persistLocalBoardItems, type LocalBoardItem} from "../../lib/local-board-cache";
import {fonts} from "../../styles/typography";

type ArchiveGeneration = {
  _id: string;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  serviceType?: string | null;
  watermarkRequired?: boolean | null;
  modeId?: string | null;
  paletteId?: string | null;
  finishId?: string | null;
  aspectRatio?: string | null;
  status?: BoardItemStatus;
  errorMessage?: string | null;
  createdAt?: number;
  _creationTime?: number;
};

const GRID_HORIZONTAL_PADDING = 24;
const GRID_GAP = 12;
const GRID_MAX_CARD_WIDTH = 190;

function getBoardItemKey(item: BoardItem) {
  return `${item.generationId ?? item.id}:${item.createdAt}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const { showToast } = useProSuccess();
  const deleteGeneration = useMutation("generations:deleteGeneration" as any);
  const generationArchive = useQuery(
    "generations:getUserArchive" as any,
    viewerReady ? { anonymousId: anonymousId ?? undefined } : "skip",
  ) as ArchiveGeneration[] | undefined;

  const [previewItem, setPreviewItem] = useState<BoardItem | null>(null);
  const [actionItem, setActionItem] = useState<BoardItem | null>(null);
  const [cachedBoardItems, setCachedBoardItems] = useState<BoardItem[]>([]);
  const [newBoardItemIds, setNewBoardItemIds] = useState<string[]>([]);
  const previousStatusesRef = useRef<Record<string, BoardItemStatus>>({});
  const newBadgeTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const archiveBoardItems = useMemo(() => {
    const remoteItems = mapArchiveToBoardItems(generationArchive ?? []);
    const mergedItems = new Map<string, BoardItem>();

    for (const item of cachedBoardItems) {
      mergedItems.set(item.id, item);
    }

    for (const item of remoteItems) {
      mergedItems.set(item.id, item);
    }

    return Array.from(mergedItems.values())
      .filter((item) => hasGenerationImage(item.imageUri))
      .sort((left, right) => right.createdAt - left.createdAt);
  }, [cachedBoardItems, generationArchive]);
  const newBoardItemIdSet = useMemo(() => new Set(newBoardItemIds), [newBoardItemIds]);
  const boardItems = useMemo(
    () =>
      archiveBoardItems.map((item) => ({
        ...item,
        isNew: newBoardItemIdSet.has(item.id),
      })),
    [archiveBoardItems, newBoardItemIdSet],
  );

  useEffect(() => {
    void (async () => {
      const localItems = await loadLocalBoardItems(anonymousId);
      setCachedBoardItems(
        localItems.map((item) => ({
          id: item.id,
          imageUri: item.imageUrl ?? null,
          originalImageUri: item.originalImageUrl ?? null,
          styleName: item.styleLabel,
          roomType: item.roomLabel,
          serviceType: item.serviceType ?? null,
          generationId: item.generationId ?? null,
          watermarkRequired: item.watermarkRequired ?? false,
          modeId: item.modeId ?? null,
          paletteId: item.paletteId ?? null,
          finishId: item.finishId ?? null,
          aspectRatio: item.aspectRatio ?? null,
          createdAt: item.createdAt,
          status: item.status,
          errorMessage: item.errorMessage ?? null,
        })),
      );
    })();
  }, [anonymousId]);

  useEffect(() => {
    const snapshot: LocalBoardItem[] = boardItems.map((item) => ({
      id: item.id,
      imageUrl: item.imageUri ?? null,
      originalImageUrl: item.originalImageUri ?? null,
      styleLabel: item.styleName,
      roomLabel: item.roomType,
      serviceType: item.serviceType ?? null,
      generationId: item.generationId ?? null,
      watermarkRequired: item.watermarkRequired ?? false,
      modeId: item.modeId ?? null,
      paletteId: item.paletteId ?? null,
      finishId: item.finishId ?? null,
      aspectRatio: item.aspectRatio ?? null,
      status: item.status,
      errorMessage: item.errorMessage ?? null,
      createdAt: item.createdAt,
    }));

    void persistLocalBoardItems(anonymousId, snapshot);
  }, [anonymousId, boardItems]);

  useEffect(() => {
    const nextStatuses: Record<string, BoardItemStatus> = {};
    const idsToHighlight: string[] = [];

    for (const item of archiveBoardItems) {
      nextStatuses[item.id] = item.status;
      if (previousStatusesRef.current[item.id] === "processing" && item.status === "ready") {
        idsToHighlight.push(item.id);
      }
      if (item.status !== "ready" && newBadgeTimeoutsRef.current[item.id]) {
        clearTimeout(newBadgeTimeoutsRef.current[item.id]);
        delete newBadgeTimeoutsRef.current[item.id];
      }
    }

    if (idsToHighlight.length > 0) {
      setNewBoardItemIds((current) => {
        const merged = new Set(current);
        for (const id of idsToHighlight) {
          merged.add(id);
        }
        return Array.from(merged);
      });

      for (const id of idsToHighlight) {
        if (newBadgeTimeoutsRef.current[id]) {
          clearTimeout(newBadgeTimeoutsRef.current[id]);
        }
        newBadgeTimeoutsRef.current[id] = setTimeout(() => {
          setNewBoardItemIds((current) => current.filter((itemId) => itemId !== id));
          delete newBadgeTimeoutsRef.current[id];
        }, 6500);
      }
    }

    previousStatusesRef.current = nextStatuses;
  }, [archiveBoardItems]);

  useEffect(() => {
    return () => {
      for (const timeout of Object.values(newBadgeTimeoutsRef.current)) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const columnWidth = useMemo(() => {
    const availableWidth = Math.max(width - GRID_HORIZONTAL_PADDING * 2 - GRID_GAP, 0);
    return Math.min(GRID_MAX_CARD_WIDTH, Math.floor(availableWidth / 2));
  }, [width]);

  const gridWidth = columnWidth * 2 + GRID_GAP;
  const topContentInset = Math.max(insets.top + 16, 32);
  const bottomContentInset = Math.max(insets.bottom + 112, 128);
  const boardBodyMinHeight = Math.max(height - topContentInset - bottomContentInset - 64, 240);

  const handleImagePress = (item: BoardItem) => {
    const itemStatus = resolveGenerationStatus(item.status, item.imageUri);

    if (itemStatus === "processing") {
      showToast(t("common.states.workInProgress"));
      return;
    }

    if (!hasGenerationImage(item.imageUri)) {
      Alert.alert(t("common.states.generationFailed"), item.errorMessage ?? t("profile.generationFailedBody"));
      return;
    }

    router.push({
      pathname: "/workspace",
      params: {
        boardView: "editor",
        boardItemId: item.generationId ?? item.id,
        entrySource: "profile",
      },
    } as any);
  };

  const handleImageLongPress = (item: BoardItem) => {
    const itemStatus = resolveGenerationStatus(item.status, item.imageUri);

    if (itemStatus === "processing") {
      showToast(t("common.states.workInProgress"));
      return;
    }

    if (!hasGenerationImage(item.imageUri)) {
      Alert.alert(t("common.states.generationFailed"), item.errorMessage ?? t("profile.generationFailedBody"));
      return;
    }

    setActionItem(item);
  };

  const closePreview = () => {
    setPreviewItem(null);
  };

  const closeActions = () => {
    setActionItem(null);
  };

  const renderPortfolioCard = ({ item }: { item: BoardItem }) => (
    <BoardImageCard
      item={item}
      width={columnWidth}
      onPress={handleImagePress}
      onLongPress={handleImageLongPress}
    />
  );

  const keyExtractor = (item: BoardItem) => getBoardItemKey(item);

  const handleSaveToGallery = async () => {
    if (!actionItem?.imageUri) {
      closeActions();
      return;
    }

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showToast(t("common.states.photoPermissionNeeded"));
        return;
      }

      const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}board-${actionItem.id}.jpg`;
      const download = await FileSystem.downloadAsync(actionItem.imageUri, targetUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      showToast(t("profile.savedToGallery"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("profile.unableSave"));
    } finally {
      closeActions();
    }
  };

  const handleDeleteFromBoard = () => {
    const currentItem = actionItem;
    closeActions();

    if (!currentItem) {
      return;
    }

    Alert.alert(t("profile.deleteFromBoardTitle"), t("profile.deleteFromBoardBody"), [
      { text: t("common.actions.cancel"), style: "cancel" },
      {
        text: t("common.actions.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGeneration({ anonymousId: anonymousId ?? undefined, id: currentItem.id });
            setCachedBoardItems((current) => current.filter((item) => item.id !== currentItem.id));
            showToast(t("profile.deletedFromBoard"));
          } catch (error) {
            showToast(error instanceof Error ? error.message : t("profile.unableDelete"));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={boardItems}
        key={columnWidth}
        numColumns={2}
        keyExtractor={keyExtractor}
        renderItem={renderPortfolioCard}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topContentInset },
          { paddingBottom: bottomContentInset },
          boardItems.length > 0 ? styles.gridContent : null,
        ]}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.title}>{t("profile.title")}</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.boardBody, { minHeight: boardBodyMinHeight }]}>
            <View style={styles.emptyState}>
              <LayoutPanelTop color={DS.colors.borderStrong} size={56} strokeWidth={1.9} />
              <Text style={styles.emptyTitle}>{t("profile.emptyTitle")}</Text>
              {t("profile.emptySubtitle") ? <Text style={styles.emptySubtitle}>{t("profile.emptySubtitle")}</Text> : null}
            </View>
          </View>
        )}
        columnWrapperStyle={boardItems.length > 0 ? [styles.gridRow, { width: gridWidth }] : undefined}
      />

      <BoardPreviewModal item={previewItem} visible={previewItem !== null} onClose={closePreview} />
      <BoardActionsModal
        item={actionItem}
        visible={actionItem !== null}
        onClose={closeActions}
        onSave={handleSaveToGallery}
        onDelete={handleDeleteFromBoard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  scrollContent: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  gridContent: {
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  boardBody: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: DS.colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.bold,
  },
  emptyState: {
    width: "100%",
    maxWidth: 320,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  emptyTitle: {
    marginTop: 16,
    color: DS.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.medium,
  },
  emptySubtitle: {
    marginTop: 8,
    color: DS.colors.textMuted,
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    ...fonts.regular,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },
});

