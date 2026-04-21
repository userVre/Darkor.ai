import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";

import type { DraftImage } from "../components/workspace-context";
import type { DiscoverTile } from "./data";
import type { FeaturedTryItExample } from "./featured-try-it";

type TryItExampleInput = {
  serviceParam: "interior" | "facade" | "garden" | "paint" | "floor";
  imageSource: ImageSourcePropType | number;
  room: string;
  style: string;
  presetRoom?: string | null;
  presetStyle?: string | null;
  paletteId?: string | null;
  modeId?: "preserve" | "renovate" | null;
  finishId?: "matte" | "glossy" | "satin" | null;
  prompt?: string | null;
  aspectRatioId?: "post" | "story" | "landscape" | null;
  startStep?: "1" | "2" | "3" | "4" | null;
  entrySource?: string | null;
};

type WorkspaceDraftSetters = {
  setDraftImage: (image: DraftImage | null) => void;
  setDraftImages?: (images: DraftImage[] | null) => void;
  setDraftRoom: (room: string | null) => void;
  setDraftStyle: (style: string | null) => void;
  setDraftStyles?: (styles: string[] | null) => void;
  setDraftPalette: (paletteId: string | null) => void;
  setDraftMode: (modeId: string | null) => void;
  setDraftFinish: (finishId: string | null) => void;
  setDraftPrompt: (prompt: string | null) => void;
  setDraftAspectRatio: (aspectRatio: string | null) => void;
};

export type PreparedTryItFlow = {
  redirectTo: string;
  room: string;
  style: string;
};

export function withWorkspaceFlowId(path: string, flowId: string = Date.now().toString()) {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("flowId", flowId);
  const nextSearch = params.toString();
  return nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname;
}

function mapDiscoverService(service: DiscoverTile["service"]) {
  if (service === "garden") return "garden";
  if (service === "exterior") return "facade";
  if (service === "paint") return "paint";
  if (service === "floor") return "floor";
  return "interior";
}

function resolveImageUri(imageSource: TryItExampleInput["imageSource"]) {
  if (typeof imageSource === "number") {
    return Asset.fromModule(imageSource).downloadAsync().then((asset) => asset.localUri ?? asset.uri ?? null);
  }

  if (typeof imageSource === "string") {
    return Promise.resolve(imageSource);
  }

  if (imageSource && typeof imageSource === "object" && "uri" in imageSource && typeof imageSource.uri === "string") {
    return Promise.resolve(imageSource.uri);
  }

  return Promise.resolve(null);
}

export function normalizeDiscoverTryItTile(item: DiscoverTile): TryItExampleInput {
  return {
    serviceParam: mapDiscoverService(item.service),
    imageSource: item.image,
    room: item.spaceType,
    style: item.style,
    presetRoom: item.presetRoom ?? item.spaceType,
    presetStyle: item.presetStyle ?? item.style,
    startStep: "1",
    entrySource: "discover",
  };
}

export function normalizeFeaturedTryItExample(
  item: FeaturedTryItExample,
  entrySource: string = "home",
): TryItExampleInput {
  return {
    serviceParam: item.serviceParam,
    imageSource: item.imageSource,
    room: item.room,
    style: item.style,
    presetRoom: item.room,
    presetStyle: item.style,
    paletteId: item.paletteId ?? null,
    modeId: item.modeId ?? null,
    finishId: item.finishId ?? null,
    prompt: item.prompt,
    aspectRatioId: item.aspectRatioId,
    startStep: "1",
    entrySource,
  };
}

export function buildTryItRedirectPath(example: TryItExampleInput) {
  const search = new URLSearchParams({
    service: example.serviceParam,
    startStep: example.startStep ?? "1",
  });

  const presetRoom = example.presetRoom ?? example.room;
  const presetStyle = example.presetStyle ?? example.style;

  if (presetRoom) {
    search.set("presetRoom", presetRoom);
  }

  if (presetStyle) {
    search.set("presetStyle", presetStyle);
  }

  if (example.entrySource) {
    search.set("entrySource", example.entrySource);
  }

  return withWorkspaceFlowId(`/workspace?${search.toString()}`);
}

export async function prepareTryItFlow(
  setters: WorkspaceDraftSetters,
  example: TryItExampleInput,
): Promise<PreparedTryItFlow> {
  const uri = await resolveImageUri(example.imageSource);
  if (!uri) {
    throw new Error("The featured example image is unavailable right now.");
  }

  setters.setDraftImage({ uri, label: example.room });
  setters.setDraftImages?.([{ uri, label: example.room }]);
  setters.setDraftRoom(example.room);
  setters.setDraftStyle(example.style);
  setters.setDraftStyles?.([example.style]);
  setters.setDraftPalette(example.paletteId ?? null);
  setters.setDraftMode(example.modeId ?? null);
  setters.setDraftFinish(example.finishId ?? null);
  setters.setDraftPrompt(example.prompt ?? null);
  setters.setDraftAspectRatio(example.aspectRatioId ?? null);

  return {
    redirectTo: buildTryItRedirectPath(example),
    room: example.room,
    style: example.style,
  };
}
