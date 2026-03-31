import { useMutation, useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import * as MediaLibrary from "expo-media-library";
import { Image as ImageIcon } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BoardActionsModal } from "../../components/board-actions-modal";
import { BoardImageCard } from "../../components/board-image-card";
import { BoardPreviewModal } from "../../components/board-preview-modal";
import { useProSuccess } from "../../components/pro-success-context";
import { useViewerSession } from "../../components/viewer-session-context";
import { mapArchiveToBoardItems, splitBoardColumns, type BoardItem, type BoardItemStatus } from "../../lib/board";
import { hasGenerationImage, resolveGenerationStatus } from "../../lib/generation-status";
import { loadLocalBoardItems, persistLocalBoardItems, type LocalBoardItem } from "../../lib/local-board-cache";
import { fonts } from "../../styles/typography";

type ArchiveGeneration = {
  _id: string;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  status?: BoardItemStatus;
  errorMessage?: string | null;
  createdAt?: number;
  _creationTime?: number;
};

const GRID_HORIZONTAL_PADDING = 16;
const GRID_COLUMN_GAP = 56;
const GRID_MAX_CARD_WIDTH = 190;
const GRID_VERTICAL_GAP = 28;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
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

    return Array.from(mergedItems.values()).sort((left, right) => right.createdAt - left.createdAt);
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
  const { leftColumnImages, rightColumnImages } = useMemo(() => splitBoardColumns(boardItems), [boardItems]);

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
    const availableWidth = Math.max(width - GRID_HORIZONTAL_PADDING * 2 - GRID_COLUMN_GAP, 0);
    return Math.min(GRID_MAX_CARD_WIDTH, Math.floor(availableWidth / 2));
  }, [width]);

  const gridWidth = columnWidth * 2 + GRID_COLUMN_GAP;
  const bottomContentInset = Math.max(insets.bottom + 112, 128);

  const handleImagePress = (item: BoardItem) => {
    const itemStatus = resolveGenerationStatus(item.status, item.imageUri);

    if (itemStatus === "processing") {
      showToast("Work in progress");
      return;
    }

    if (!hasGenerationImage(item.imageUri)) {
      Alert.alert("Generation failed", item.errorMessage ?? "This redesign did not finish. Please try again.");
      return;
    }

    setPreviewItem(item);
  };

  const handleImageLongPress = (item: BoardItem) => {
    const itemStatus = resolveGenerationStatus(item.status, item.imageUri);

    if (itemStatus === "processing") {
      showToast("Work in progress");
      return;
    }

    if (!hasGenerationImage(item.imageUri)) {
      Alert.alert("Generation failed", item.errorMessage ?? "This redesign did not finish. Please try again.");
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

  const handleSaveToGallery = async () => {
    if (!actionItem?.imageUri) {
      closeActions();
      return;
    }

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showToast("Photo library permission is required.");
        return;
      }

      const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}board-${actionItem.id}.jpg`;
      const download = await FileSystem.downloadAsync(actionItem.imageUri, targetUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      showToast("Saved to Gallery");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save this design.");
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

    Alert.alert("Delete from Board?", "This design will be removed from your board.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGeneration({ anonymousId: anonymousId ?? undefined, id: currentItem.id });
            setCachedBoardItems((current) => current.filter((item) => item.id !== currentItem.id));
            showToast("Deleted from Board");
          } catch (error) {
            showToast(error instanceof Error ? error.message : "Unable to delete this design.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        horizontal={false}
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomContentInset },
          boardItems.length === 0 ? styles.emptyScrollContent : null,
        ]}
      >
        <Text style={styles.title}>Your Board</Text>

        {boardItems.length === 0 ? (
          <View style={[styles.emptyState, { paddingBottom: bottomContentInset }]}>
            <ImageIcon color="#D0D0D0" size={48} strokeWidth={1.9} />
            <Text style={styles.emptyTitle}>No designs yet</Text>
            <Text style={styles.emptySubtitle}>Your generated designs will appear here</Text>
          </View>
        ) : (
          <View style={[styles.grid, { width: gridWidth }]}>
            <View style={[styles.column, { width: columnWidth }]}>
              {leftColumnImages.map((item) => (
                <BoardImageCard
                  key={item.id}
                  item={item}
                  width={columnWidth}
                  onPress={handleImagePress}
                  onLongPress={handleImageLongPress}
                />
              ))}
            </View>

            <View style={[styles.column, styles.rightColumn, { width: columnWidth }]}>
              {rightColumnImages.map((item) => (
                <BoardImageCard
                  key={item.id}
                  item={item}
                  width={columnWidth}
                  onPress={handleImagePress}
                  onLongPress={handleImageLongPress}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingTop: 28,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  title: {
    color: "#0A0A0A",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    color: "#A0A0A0",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.medium,
  },
  emptySubtitle: {
    marginTop: 8,
    color: "#C0C0C0",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.regular,
  },
  grid: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 62,
  },
  column: {
    gap: GRID_VERTICAL_GAP,
  },
  rightColumn: {
    marginLeft: GRID_COLUMN_GAP,
  },
});
