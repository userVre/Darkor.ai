import { useMutation, useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import * as MediaLibrary from "expo-media-library";
import { Image as ImageIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { BoardActionsModal } from "../../components/board-actions-modal";
import { BoardImageCard } from "../../components/board-image-card";
import { BoardPreviewModal } from "../../components/board-preview-modal";
import { useProSuccess } from "../../components/pro-success-context";
import { useViewerSession } from "../../components/viewer-session-context";
import { mapArchiveToBoardItems, splitBoardColumns, type BoardItem } from "../../lib/board";
import { fonts } from "../../styles/typography";

type ArchiveGeneration = {
  _id: string;
  imageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  createdAt?: number;
  _creationTime?: number;
};

const GRID_HORIZONTAL_PADDING = 16;
const GRID_COLUMN_GAP = 56;
const GRID_MAX_CARD_WIDTH = 190;
const GRID_CARD_HEIGHT = 200;
const GRID_VERTICAL_GAP = 28;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const { showToast } = useProSuccess();
  const deleteGeneration = useMutation("generations:deleteGeneration" as any);
  const generationArchive = useQuery(
    "generations:getUserArchive" as any,
    viewerReady ? { anonymousId: anonymousId ?? undefined } : "skip",
  ) as ArchiveGeneration[] | undefined;

  const [previewItem, setPreviewItem] = useState<BoardItem | null>(null);
  const [actionItem, setActionItem] = useState<BoardItem | null>(null);

  const boardItems = useMemo(() => mapArchiveToBoardItems(generationArchive ?? []), [generationArchive]);
  const { leftColumnImages, rightColumnImages } = useMemo(() => splitBoardColumns(boardItems), [boardItems]);

  const columnWidth = useMemo(() => {
    const availableWidth = Math.max(width - GRID_HORIZONTAL_PADDING * 2 - GRID_COLUMN_GAP, 0);
    return Math.min(GRID_MAX_CARD_WIDTH, Math.floor(availableWidth / 2));
  }, [width]);

  const gridWidth = columnWidth * 2 + GRID_COLUMN_GAP;

  const handleImagePress = (item: BoardItem) => {
    setPreviewItem(item);
  };

  const handleImageLongPress = (item: BoardItem) => {
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
        contentContainerStyle={[styles.scrollContent, boardItems.length === 0 ? styles.emptyScrollContent : null]}
      >
        <Text style={styles.title}>Your Board</Text>

        {boardItems.length === 0 ? (
          <View style={styles.emptyState}>
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
    paddingBottom: 48,
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
