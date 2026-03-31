export type GenerationResultStatus = "processing" | "ready" | "failed";

export function hasGenerationImage(imageUrl?: string | null) {
  return typeof imageUrl === "string" && imageUrl.trim().length > 0;
}

export function resolveGenerationStatus(
  status?: string | null,
  imageUrl?: string | null,
): GenerationResultStatus {
  if (hasGenerationImage(imageUrl)) {
    return "ready";
  }

  if (status === "failed") {
    return "failed";
  }

  return "processing";
}

export function isGenerationFailure(status?: string | null, imageUrl?: string | null) {
  return resolveGenerationStatus(status, imageUrl) === "failed";
}
