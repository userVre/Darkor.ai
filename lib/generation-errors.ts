export const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";
export const AI_BUSY_TOAST = "AI is busy, please try again in a moment.";
export const GENERATION_FAILED_TOAST = "Generation failed. Please check your connection and try again.";
export const IMAGE_PROCESSING_REJECTION_MESSAGE =
  "Cette image ne peut pas être traitée. Essayez avec une photo d'intérieur ou une autre image.";

export function getFriendlyGenerationError(message?: string | null) {
  if (!message) {
    return "Unable to generate your design right now.";
  }

  const normalized = message.toLowerCase();
  if (
    message.includes("content safety guidelines") ||
    normalized.includes("unable to prepare free-tier image safely") ||
    normalized.includes("content policy") ||
    normalized.includes("responsible ai policy") ||
    normalized.includes("content_filter") ||
    normalized.includes("safety") ||
    normalized.includes("moderation")
  ) {
    return IMAGE_PROCESSING_REJECTION_MESSAGE;
  }

  if (message === AI_PROVIDER_DOWN) {
    return AI_BUSY_TOAST;
  }

  if (message === AI_BUSY_TOAST) {
    return AI_BUSY_TOAST;
  }

  return message;
}

export function isProviderDownError(message?: string | null) {
  return message === AI_PROVIDER_DOWN;
}
