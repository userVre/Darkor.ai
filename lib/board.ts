import { hasGenerationImage, resolveGenerationStatus, type GenerationResultStatus } from "./generation-status";

export type BoardItemStatus = GenerationResultStatus;

export type BoardItem = {
  id: string;
  imageUri?: string | null;
  originalImageUri?: string | null;
  styleName: string;
  roomType: string;
  serviceType?: string | null;
  generationId?: string | null;
  watermarkRequired?: boolean | null;
  modeId?: string | null;
  paletteId?: string | null;
  finishId?: string | null;
  aspectRatio?: string | null;
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
  serviceType?: string | null;
  watermarkRequired?: boolean | null;
  modeId?: string | null;
  paletteId?: string | null;
  finishId?: string | null;
  aspectRatio?: string | null;
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
      return hasGenerationImage(item.imageUrl);
    })
    .map<BoardItem>((item) => ({
      id: item._id,
      imageUri: item.imageUrl ?? null,
      originalImageUri: item.sourceImageUrl ?? null,
      styleName: normalizeText(item.style, "Custom"),
      roomType: normalizeText(item.roomType, "Room"),
      serviceType: item.serviceType ?? null,
      generationId: item._id,
      watermarkRequired: item.watermarkRequired ?? false,
      modeId: item.modeId ?? null,
      paletteId: item.paletteId ?? null,
      finishId: item.finishId ?? null,
      aspectRatio: item.aspectRatio ?? null,
      createdAt: item.createdAt ?? item._creationTime ?? Date.now(),
      status: resolveGenerationStatus(item.status, item.imageUrl),
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
