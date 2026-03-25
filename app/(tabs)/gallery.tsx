import { useAuth } from "@clerk/expo";
import { useQuery } from "convex/react";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Images, Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { triggerHaptic } from "../../lib/haptics";

const SCREEN_BG = "#000000";
const EDGE_PADDING = 20;
const GRID_GAP = 12;
const CARD_BORDER_COLOR = "rgba(255,255,255,0.08)";
const CARD_RADIUS = 28;

type ArchiveGeneration = {
  _id: string;
  _creationTime: number;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  status?: "processing" | "ready" | "failed";
  errorMessage?: string | null;
  createdAt?: number;
};

function formatBoardTitle(item: ArchiveGeneration) {
  const styleLabel = item.style?.trim() || "Custom";
  const roomLabel = item.roomType?.trim() || "Design";
  return `${styleLabel} ${roomLabel}`.trim();
}

function formatBoardSubtitle(item: ArchiveGeneration) {
  if (item.status === "processing") {
    return "Rendering in progress. Tap soon to review the full editor view.";
  }

  if (item.status === "failed") {
    return item.errorMessage?.trim() || "Generation failed. Tap to inspect the result details.";
  }

  return "Tap to open the full before and after editor.";
}

function formatBoardDate(timestamp?: number) {
  if (!timestamp) return "Saved to your board";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

const BoardArchiveCard = memo(function BoardArchiveCard({
  item,
  width,
  height,
  index,
  onPress,
}: {
  item: ArchiveGeneration;
  width: number;
  height: number;
  index: number;
  onPress: (item: ArchiveGeneration) => void;
}) {
  const previewImage = item.imageUrl ?? item.sourceImageUrl ?? null;
  const isProcessing = item.status === "processing";
  const isFailed = item.status === "failed";

  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <LuxPressable
      onPress={handlePress}
      pressableClassName="cursor-pointer"
      className="cursor-pointer"
      style={[
        styles.card,
        {
          width,
          height,
          marginRight: index % 2 === 0 ? GRID_GAP : 0,
          marginBottom: GRID_GAP,
        },
      ]}
      glowColor="rgba(255, 255, 255, 0.08)"
      scale={0.985}
    >
      {previewImage ? (
        <Image
          source={{ uri: previewImage }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={120}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.placeholder]}>
          <Sparkles color="#71717a" size={28} />
        </View>
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.82)", "rgba(0,0,0,0.96)"]}
        locations={[0, 0.38, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {isProcessing ? (
        <View style={styles.processingBadge}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.processingText}>Processing</Text>
        </View>
      ) : null}

      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {formatBoardTitle(item)}
        </Text>
        <Text style={[styles.cardStyle, isFailed ? styles.failedText : null]} numberOfLines={2}>
          {formatBoardSubtitle(item)}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {formatBoardDate(item.createdAt ?? item._creationTime)}
        </Text>
      </View>
    </LuxPressable>
  );
});

const EmptyState = memo(function EmptyState({
  cardWidth,
  cardHeight,
}: {
  cardWidth: number;
  cardHeight: number;
}) {
  return (
    <View style={[styles.emptyState, { width: cardWidth, minHeight: cardHeight }]}>
      <View style={styles.emptyIconWrap}>
        <Images color="#f59e0b" size={30} />
      </View>
      <Text style={styles.emptyTitle}>Your board is ready for its first design</Text>
      <Text style={styles.emptyCopy}>
        Generate a redesign and every saved image will appear here automatically from Convex archive storage.
      </Text>
    </View>
  );
});

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const generationArchive = useQuery(
    "generations:getUserArchive" as any,
    isSignedIn ? {} : "skip",
  ) as ArchiveGeneration[] | undefined;

  const cardWidth = useMemo(() => {
    return Math.max((width - EDGE_PADDING * 2 - GRID_GAP) / 2, 150);
  }, [width]);

  const cardHeight = useMemo(() => Math.round(cardWidth * 1.32), [cardWidth]);

  const handleCardPress = useCallback(
    (item: ArchiveGeneration) => {
      router.push({
        pathname: "/workspace",
        params: {
          boardView: "editor",
          boardItemId: item._id,
          entrySource: "gallery",
        },
      });
    },
    [router],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <FlashList
        data={generationArchive ?? []}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <BoardArchiveCard item={item} width={cardWidth} height={cardHeight} index={index} onPress={handleCardPress} />
        )}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom + 28, 36),
          paddingHorizontal: EDGE_PADDING,
        }}
        contentInsetAdjustmentBehavior="never"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerEyebrow}>Archive</Text>
            <Text style={styles.headerTitle}>Your Board</Text>
            <Text style={styles.headerCopy}>
              Access all your generated designs and history.
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyState cardWidth={Math.max(width - EDGE_PADDING * 2, 240)} cardHeight={cardHeight} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    paddingBottom: 18,
  },
  headerEyebrow: {
    color: "#71717a",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  headerCopy: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    overflow: "hidden",
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
    backgroundColor: "#111113",
  },
  cardCopy: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 96,
    gap: 6,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
    letterSpacing: -0.45,
  },
  cardStyle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardMeta: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111113",
  },
  processingBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  processingText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  failedText: {
    color: "#fca5a5",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#111113",
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptyCopy: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    textAlign: "center",
  },
});
