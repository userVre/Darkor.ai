export const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";
export const AI_BUSY_TOAST = "AI is busy, please try again in a moment.";
export const GENERATION_FAILED_TOAST = "Generation failed. Please check your connection and try again.";

export function getFriendlyGenerationError(message?: string | null) {
  if (!message) {
    return "Unable to generate your design right now.";
  }

  if (message.includes("content safety guidelines")) {
    return "Design could not be generated due to content safety guidelines. Please try a different photo.";
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
