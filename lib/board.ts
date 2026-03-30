export type BoardItem = {
  id: string;
  imageUri: string;
  styleName: string;
  roomType: string;
  createdAt: number;
};

type GenerationArchiveItem = {
  _id: string;
  imageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  createdAt?: number;
  _creationTime?: number;
};

function normalizeText(value?: string | null, fallback?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback ?? "";
}

export function mapArchiveToBoardItems(items: GenerationArchiveItem[]) {
  return items
    .filter((item) => typeof item.imageUrl === "string" && item.imageUrl.length > 0)
    .map<BoardItem>((item) => ({
      id: item._id,
      imageUri: item.imageUrl ?? "",
      styleName: normalizeText(item.style, "Custom"),
      roomType: normalizeText(item.roomType, "Room"),
      createdAt: item.createdAt ?? item._creationTime ?? Date.now(),
    }))
    .sort((left, right) => left.createdAt - right.createdAt);
}

export function splitBoardColumns(items: BoardItem[]) {
  return {
    leftColumnImages: items.filter((_, index) => index % 2 === 0),
    rightColumnImages: items.filter((_, index) => index % 2 !== 0),
  };
}
