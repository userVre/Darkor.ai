export const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";

export function getFriendlyGenerationError(message?: string | null) {
  if (!message) {
    return "Unable to generate your design right now.";
  }

  if (message === AI_PROVIDER_DOWN) {
    return "Darkor AI is temporarily unavailable. Please try again in a moment.";
  }

  return message;
}

export function isProviderDownError(message?: string | null) {
  return message === AI_PROVIDER_DOWN;
}
