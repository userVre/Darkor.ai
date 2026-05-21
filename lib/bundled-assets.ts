import {Asset} from "expo-asset";
import {Image as NativeImage} from "react-native";
import type {ImageSourcePropType} from "react-native";

export type ResolvedBundledImage = {
  uri: string;
  width: number;
  height: number;
};

function getUriScheme(uri: string) {
  return uri.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() ?? null;
}

function isReadableAssetUri(uri?: string | null) {
  const scheme = uri ? getUriScheme(uri) : null;
  return scheme === "file" || scheme === "content" || scheme === "http" || scheme === "https";
}

export async function resolveBundledImageSource(source: ImageSourcePropType, fallbackSize = {width: 1080, height: 1440}) {
  const resolved = NativeImage.resolveAssetSource(source);
  const assetSource =
    typeof source === "number"
      ? source
      : resolved?.uri
        ? {
            uri: resolved.uri,
            width: resolved.width ?? fallbackSize.width,
            height: resolved.height ?? fallbackSize.height,
          }
        : null;

  if (!assetSource) {
    throw new Error("Example photo is unavailable.");
  }

  const asset = Asset.fromModule(assetSource);
  let uri = asset.localUri ?? asset.uri ?? resolved?.uri ?? null;

  if (!isReadableAssetUri(uri)) {
    try {
      (asset as {downloaded?: boolean}).downloaded = false;
      asset.localUri = null;
      await asset.downloadAsync();
    } catch {
      // Fall through to the explicit availability error below.
    }
    uri = asset.localUri ?? asset.uri ?? resolved?.uri ?? null;
  }

  if (!isReadableAssetUri(uri)) {
    throw new Error("Example photo is unavailable.");
  }

  return {
    uri,
    width: asset.width ?? resolved?.width ?? fallbackSize.width,
    height: asset.height ?? resolved?.height ?? fallbackSize.height,
  } satisfies ResolvedBundledImage;
}
