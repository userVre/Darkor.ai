export type BoardItemStatus = "processing" | "ready" | "failed";

export type BoardItem = {
  id: string;
  imageUri?: string | null;
  originalImageUri?: string | null;
  styleName: string;
  roomType: string;
  createdAt: number;
  status: BoardItemStatus;
  errorMessage?: string | null;
  isNew?: boolean;
};

type GenerationArchiveItem = {
  _id: string;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  createdAt?: number;
  _creationTime?: number;
  status?: BoardItemStatus;
  errorMessage?: string | null;
};

function normalizeText(value?: string | null, fallback?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback ?? "";
}

export function mapArchiveToBoardItems(items: GenerationArchiveItem[]) {
  return items
    .filter((item) => {
      const previewImage = item.imageUrl ?? item.sourceImageUrl ?? null;
      return typeof previewImage === "string" && previewImage.length > 0;
    })
    .map<BoardItem>((item) => ({
      id: item._id,
      imageUri: item.imageUrl ?? null,
      originalImageUri: item.sourceImageUrl ?? null,
      styleName: normalizeText(item.style, "Custom"),
      roomType: normalizeText(item.roomType, "Room"),
      createdAt: item.createdAt ?? item._creationTime ?? Date.now(),
      status: item.status ?? ((item.imageUrl ?? "").length > 0 ? "ready" : "processing"),
      errorMessage: item.errorMessage ?? null,
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function splitBoardColumns(items: BoardItem[]) {
  return {
    leftColumnImages: items.filter((_, index) => index % 2 === 0),
    rightColumnImages: items.filter((_, index) => index % 2 !== 0),
  };
}
