import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalBoardItem = {
  id: string;
  imageUrl?: string | null;
  originalImageUrl?: string | null;
  styleLabel: string;
  roomLabel: string;
  serviceType?: string | null;
  generationId?: string | null;
  status: "processing" | "ready" | "failed";
  errorMessage?: string | null;
  createdAt: number;
};

function getBoardCacheKey(viewerId: string) {
  return `darkor:board:${viewerId}`;
}

function isLocalBoardItem(value: unknown): value is LocalBoardItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.styleLabel === "string" &&
    typeof candidate.roomLabel === "string" &&
    typeof candidate.createdAt === "number" &&
    (candidate.status === "processing" || candidate.status === "ready" || candidate.status === "failed")
  );
}

export async function loadLocalBoardItems(viewerId: string | null | undefined) {
  if (!viewerId) {
    return [] as LocalBoardItem[];
  }

  try {
    const stored = await AsyncStorage.getItem(getBoardCacheKey(viewerId));
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLocalBoardItem).sort((left, right) => right.createdAt - left.createdAt);
  } catch {
    return [];
  }
}

export async function persistLocalBoardItems(viewerId: string | null | undefined, items: LocalBoardItem[]) {
  if (!viewerId) {
    return;
  }

  if (!items.length) {
    await AsyncStorage.removeItem(getBoardCacheKey(viewerId));
    return;
  }

  await AsyncStorage.setItem(getBoardCacheKey(viewerId), JSON.stringify(items));
}
