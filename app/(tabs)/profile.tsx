import {LayoutPanelTop} from "@/components/material-icons";
import {useAuth, useUser} from "@clerk/expo";
import {useMutation, useQuery} from "convex/react";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, FlatList, StyleSheet, View, useWindowDimensions} from "react-native";
import {Avatar, Button, IconButton, Text} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {BoardActionsModal} from "../../components/board-actions-modal";
import {BoardImageCard} from "../../components/board-image-card";
import {BoardPreviewModal} from "../../components/board-preview-modal";
import {useProSuccess} from "../../components/pro-success-context";
import {useViewerSession} from "../../components/viewer-session-context";
import {md3Shapes, md3Spacing} from "../../constants/md3Theme";
import {mapArchiveToBoardItems, type BoardItem, type BoardItemStatus} from "../../lib/board";
import {hasGenerationImage, resolveGenerationStatus} from "../../lib/generation-status";
import {loadLocalBoardItems, persistLocalBoardItems, type LocalBoardItem} from "../../lib/local-board-cache";
import {TOOLS_ROUTE} from "../../lib/routes";
import {useTheme, type Theme} from "../../styles/theme";

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
  const { isSignedIn } = useAuth();
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
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const userName = user?.fullName ?? user?.firstName ?? null;
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

  const handleSignInPress = () => {
    router.push({ pathname: "/sign-in", params: { returnTo: "/profile" } } as any);
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
            <View style={styles.profileUserHeader}>
              {isSignedIn && user ? (
                <>
                  <View style={styles.avatar}>
                    {user.imageUrl ? (
                      <Avatar.Image size={56} source={{ uri: user.imageUrl }} />
                    ) : (
                      <Avatar.Text size={56} label={avatarInitials} labelStyle={styles.avatarInitials} />
                    )}
                  </View>
                  <View style={styles.userCopy}>
                    {userName ? <Text numberOfLines={1} selectable variant="titleMedium" style={styles.userName}>{userName}</Text> : null}
                    {userEmail ? <Text numberOfLines={1} selectable variant="bodyMedium" style={styles.userEmail}>{userEmail}</Text> : null}
                  </View>
                </>
              ) : (
                <Button mode="contained" onPress={handleSignInPress} style={styles.guestSignInButton} labelStyle={styles.guestSignInText}>
                  {t("auth.screen.signIn.cta")}
                </Button>
              )}

              <IconButton
                accessibilityLabel={t("settings.title")}
                icon="cog"
                mode="contained-tonal"
                onPress={handleSettingsPress}
                style={styles.settingsIconButton}
              />
            </View>

            <View style={styles.headerRow}>
              <View style={styles.portfolioTitleGroup}>
                <View style={styles.portfolioIconFrame}>
                  <LayoutPanelTop color={theme.textPrimary} size={16} strokeWidth={1.8} />
                </View>
                <Text numberOfLines={1} variant="titleMedium" style={styles.title}>{t("profile.title")}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.boardBody, { minHeight: boardBodyMinHeight }]}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIconShell}>
                <Text style={styles.emptyIcon}>💎</Text>
              </View>
              <Text variant="titleMedium" style={styles.emptyTitle}>{t("profile.emptyTitle")}</Text>
              {t("profile.emptySubtitle") ? <Text variant="bodyMedium" style={styles.emptySubtitle}>{t("profile.emptySubtitle")}</Text> : null}
              <Button mode="contained" onPress={handleCreateFirstDesign} style={styles.emptyCta} labelStyle={styles.emptyCtaText}>
                {t("profile.emptyCta")}
              </Button>
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
    paddingHorizontal: md3Spacing.extraLarge,
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
    gap: md3Spacing.large,
    marginBottom: md3Spacing.extraLarge,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.paperTheme.colors.primaryContainer,
  },
  avatarInitials: {
    color: theme.paperTheme.colors.onPrimaryContainer,
    letterSpacing: 0,
  },
  userCopy: {
    flex: 1,
    minWidth: 0,
    gap: md3Spacing.extraSmall,
  },
  userName: {
    color: theme.paperTheme.colors.onSurface,
    letterSpacing: 0,
  },
  userEmail: {
    color: theme.paperTheme.colors.onSurfaceVariant,
    letterSpacing: 0,
  },
  guestSignInButton: {
    borderRadius: 999,
  },
  guestSignInText: {
    letterSpacing: 0,
  },
  settingsIconButton: {
    margin: 0,
    flexShrink: 0,
  },
  headerRow: {
    width: "100%",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: md3Spacing.medium,
  },
  portfolioTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: md3Spacing.small,
  },
  portfolioIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.paperTheme.colors.secondaryContainer,
  },
  boardBody: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: theme.paperTheme.colors.onSurface,
    letterSpacing: 0,
    textAlign: "left",
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
    borderRadius: md3Shapes.full,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.paperTheme.colors.primaryContainer,
  },
  emptyIcon: {
    ...theme.paperTheme.fonts.displayMedium,
  },
  emptyTitle: {
    marginTop: md3Spacing.large,
    color: theme.paperTheme.colors.onSurface,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: md3Spacing.small,
    color: theme.paperTheme.colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 310,
  },
  emptyCta: {
    alignSelf: "stretch",
    marginTop: md3Spacing.extraLarge,
    marginHorizontal: md3Spacing.small,
    borderRadius: md3Shapes.extraLarge,
  },
  emptyCtaText: {
    letterSpacing: 0,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },
  });
}

