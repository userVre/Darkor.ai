import * as FileSystem from "expo-file-system/legacy";

import {assertCloudUrl} from "./public-endpoints";

type UploadLocalFileOptions = {
  fallbackMimeType?: string;
  errorLabel?: string;
};

type UploadResponseBody = {
  storageId?: string;
};

const MIME_TYPES: Record<string, string> = {
  ".heic": "image/heic",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const FALLBACK_EXTENSIONS: Record<string, string> = {
  "image/heic": ".heic",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function inferMimeType(uri: string, fallbackMimeType: string) {
  const sanitizedUri = uri.split("?")[0]?.toLowerCase() ?? "";
  const matchedExtension = Object.keys(MIME_TYPES).find((extension) => sanitizedUri.endsWith(extension));
  return matchedExtension ? MIME_TYPES[matchedExtension] : fallbackMimeType;
}

function inferExtension(uri: string, fallbackMimeType: string) {
  const sanitizedUri = uri.split(/[?#]/)[0]?.toLowerCase() ?? "";
  const matchedExtension = Object.keys(MIME_TYPES).find((extension) => sanitizedUri.endsWith(extension));
  return matchedExtension ?? FALLBACK_EXTENSIONS[fallbackMimeType] ?? ".jpg";
}

function getUriScheme(uri: string) {
  return uri.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() ?? null;
}

function getUploadCacheDirectory() {
  const rootDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!rootDirectory) {
    throw new Error("File storage is not available on this device.");
  }

  return `${rootDirectory.replace(/\/?$/, "/")}upload-sources/`;
}

function isUploadSafeFileUri(uri: string) {
  const writableRoots = [FileSystem.cacheDirectory, FileSystem.documentDirectory]
    .filter((root): root is string => Boolean(root))
    .map((root) => root.replace(/\/?$/, "/"));

  return writableRoots.some((root) => uri.startsWith(root));
}

async function getFileExists(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && !info.isDirectory;
  } catch {
    return false;
  }
}

async function ensureUploadCacheDirectory() {
  const directory = getUploadCacheDirectory();
  await FileSystem.makeDirectoryAsync(directory, {intermediates: true});
  return directory;
}

async function materializeUploadSource(uri: string, mimeType: string, errorLabel: string) {
  const sourceUri = uri.trim();
  if (!sourceUri) {
    throw new Error(`The ${errorLabel} is missing.`);
  }

  const scheme = getUriScheme(sourceUri);

  if (scheme === "content") {
    return {uri: sourceUri, temporary: false};
  }

  if (scheme === "file" && isUploadSafeFileUri(sourceUri) && await getFileExists(sourceUri)) {
    return {uri: sourceUri, temporary: false};
  }

  const extension = inferExtension(sourceUri, mimeType);
  const cacheDirectory = await ensureUploadCacheDirectory();
  const targetUri = `${cacheDirectory}upload-source-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

  if (scheme === "http" || scheme === "https") {
    const download = await FileSystem.downloadAsync(sourceUri, targetUri);
    return {uri: download.uri, temporary: true};
  }

  const materializers = [
    async () => {
      await FileSystem.copyAsync({from: sourceUri, to: targetUri});
      return targetUri;
    },
    async () => {
      const download = await FileSystem.downloadAsync(sourceUri, targetUri);
      return download.uri;
    },
  ];

  for (const materialize of materializers) {
    try {
      const uploadUri = await materialize();
      if (await getFileExists(uploadUri)) {
        return {uri: uploadUri, temporary: true};
      }
    } catch {
      // Try the next supported local asset materialization strategy.
    }
  }

  throw new Error(`The ${errorLabel} is not available on this device. Please choose another image.`);
}

export async function uploadLocalFileToCloud(
  uploadUrl: string,
  uri: string,
  options: UploadLocalFileOptions = {},
) {
  const fallbackMimeType = options.fallbackMimeType ?? "image/png";
  const errorLabel = options.errorLabel ?? "selected image";
  const targetUrl = assertCloudUrl(uploadUrl, "Upload URL");
  const mimeType = inferMimeType(uri, fallbackMimeType);
  const uploadSource = await materializeUploadSource(uri, mimeType, errorLabel);

  let response: FileSystem.FileSystemUploadResult;

  try {
    response = await FileSystem.uploadAsync(targetUrl, uploadSource.uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      mimeType,
      headers: {
        "Content-Type": mimeType,
      },
    });
  } finally {
    if (uploadSource.temporary) {
      await FileSystem.deleteAsync(uploadSource.uri, {idempotent: true}).catch(() => undefined);
    }
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Unable to upload the ${errorLabel}.`);
  }

  let body: UploadResponseBody | null = null;

  try {
    body = JSON.parse(response.body) as UploadResponseBody;
  } catch {
    body = null;
  }

  if (!body?.storageId) {
    throw new Error("Upload service did not return a storage id.");
  }

  return body.storageId;
}
