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

function inferMimeType(uri: string, fallbackMimeType: string) {
  const sanitizedUri = uri.split("?")[0]?.toLowerCase() ?? "";
  const matchedExtension = Object.keys(MIME_TYPES).find((extension) => sanitizedUri.endsWith(extension));
  return matchedExtension ? MIME_TYPES[matchedExtension] : fallbackMimeType;
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

  const response = await FileSystem.uploadAsync(targetUrl, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    mimeType,
    headers: {
      "Content-Type": mimeType,
    },
  });

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
