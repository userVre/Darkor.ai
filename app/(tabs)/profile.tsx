import {LayoutPanelTop, Settings} from "@/components/material-icons";
import {useUser} from "@clerk/expo";
import {useMutation, useQuery} from "convex/react";
import {Image} from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {BoardActionsModal} from "../../components/board-actions-modal";
import {BoardImageCard} from "../../components/board-image-card";
import {BoardPreviewModal} from "../../components/board-preview-modal";
import {useProSuccess} from "../../components/pro-success-context";
import {useViewerSession} from "../../components/viewer-session-context";
import {mapArchiveToBoardItems, type BoardItem, type BoardItemStatus} from "../../lib/board";
import {hasGenerationImage, resolveGenerationStatus} from "../../lib/generation-status";
import {loadLocalBoardItems, persistLocalBoardItems, type LocalBoardItem} from "../../lib/local-board-cache";
import {TOOLS_ROUTE} from "../../lib/routes";
import {useTheme, type Theme} from "../../styles/theme";
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
const DARK_ACTION = "#111111";

function getBoardItemKey(item: BoardItem) {
  return `${item.generationId ?? item.id}:${item.createdAt}`;
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "D";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { user } = useUser();
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
    let active = true;

    void (async () => {
      const localItems = await loadLocalBoardItems(anonymousId);
      if (active) {
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
      }
    })();

    return () => {
      active = false;
    };
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
  const topContentInset = Math.max(insets.top + 28, 48);
  const bottomContentInset = Math.max(insets.bottom + 112, 128);
  const boardBodyMinHeight = Math.max(height - topContentInset - bottomContentInset - 64, 240);
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const userName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
  const avatarInitials = getInitials(userName, userEmail);

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

  const handleSettingsPress = () => {
    router.push("/settings" as any);
  };

  const handleCreateFirstDesign = () => {
    router.push(TOOLS_ROUTE as any);
  };

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
      <StatusBar style={theme.isDark ? "light" : "dark"} />

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
            {user ? (
              <View style={styles.profileUserHeader}>
                <View style={styles.avatar}>
                  {user.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.avatarInitials}>{avatarInitials}</Text>
                  )}
                </View>
                <View style={styles.userCopy}>
                  {userName ? <Text numberOfLines={1} style={styles.userName}>{userName}</Text> : null}
                  {userEmail ? <Text numberOfLines={1} style={styles.userEmail}>{userEmail}</Text> : null}
                </View>
              </View>
            ) : null}

            <View style={styles.headerRow}>
              <View style={styles.portfolioTitleGroup}>
                <View style={styles.portfolioIconFrame}>
                  <LayoutPanelTop color={theme.textPrimary} size={16} strokeWidth={1.8} />
                </View>
                <Text numberOfLines={1} style={styles.title}>{t("profile.title")}</Text>
              </View>

              <Pressable accessibilityRole="button" onPress={handleSettingsPress} style={styles.settingsLink}>
                <Settings color={theme.textPrimary} size={15} strokeWidth={1.9} />
                <Text numberOfLines={1} style={styles.settingsLinkText}>{t("settings.title")}</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.boardBody, { minHeight: boardBodyMinHeight }]}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIconShell}>
                <Text style={styles.emptyIcon}>💎</Text>
              </View>
              <Text style={styles.emptyTitle}>{t("profile.emptyTitle")}</Text>
              {t("profile.emptySubtitle") ? <Text style={styles.emptySubtitle}>{t("profile.emptySubtitle")}</Text> : null}
              <Pressable accessibilityRole="button" onPress={handleCreateFirstDesign} style={styles.emptyCta}>
                <Text style={styles.emptyCtaText}>{t("profile.emptyCta")}</Text>
              </Pressable>
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollContent: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  gridContent: {
    alignItems: "center",
  },
  header: {
    width: "100%",
    alignItems: "stretch",
    justifyContent: "center",
    marginBottom: 26,
  },
  profileUserHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK_ACTION,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    color: theme.textInverse,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0,
    ...fonts.bold,
  },
  userCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  userName: {
    color: theme.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
    ...fonts.bold,
  },
  userEmail: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0,
    ...fonts.regular,
  },
  headerRow: {
    width: "100%",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  settingsLink: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: theme.surfaceMuted,
  },
  settingsLinkText: {
    color: theme.textPrimary,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
    ...fonts.medium,
  },
  portfolioTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  portfolioIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surfaceMuted,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  boardBody: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: theme.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: 0,
    textAlign: "left",
    ...fonts.bold,
  },
  emptyState: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  emptyIconShell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.08)",
    boxShadow: "0px 0px 34px rgba(17,24,39,0.18)",
  },
  emptyIcon: {
    fontSize: 48,
    lineHeight: 58,
  },
  emptyTitle: {
    marginTop: 16,
    color: theme.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    ...fonts.semibold,
  },
  emptySubtitle: {
    marginTop: 8,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 310,
    ...fonts.regular,
  },
  emptyCta: {
    alignSelf: "stretch",
    minHeight: 48,
    marginTop: 24,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: DARK_ACTION,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
    ...fonts.semibold,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },
  });
}

