export const ONBOARDING_STORAGE_KEY = "hasFinishedOnboarding";
export const PREVIOUS_ONBOARDING_STORAGE_KEY = "hasCompletedOnboarding";
export const LEGACY_ONBOARDING_STORAGE_KEY = "HAS_FINISHED_ONBOARDING";

export const ANALYTICS_EVENTS = {
  onboardingStarted: "onboarding_started",
  onboardingCompleted: "onboarding_completed",
  step1UploadSuccess: "step_1_upload_success",
  generateClicked: "generate_clicked",
  paywallViewed: "paywall_viewed",
  planSelected: "plan_selected",
  trialStarted: "trial_started",
  diamondStoreOpened: "diamond_store_opened",
  imageSaved: "image_saved",
  imageShared: "image_shared",
  sliderMovedIntensity: "slider_moved_intensity",
  generationFailed: "generation_failed",
  apiTimeout: "api_timeout",
} as const;

type AnalyticsClient = {
  capture?: (event: string, properties?: any) => void | Promise<void>;
  identify?: (distinctId: string, properties?: any) => void | Promise<void>;
};

export function captureAnalytics(
  posthog: AnalyticsClient | null | undefined,
  event: string,
  properties?: Record<string, unknown>,
) {
  try {
    void posthog?.capture?.(event, properties);
  } catch {
    // Analytics should never block the product flow.
  }
}

export function identifyAnalytics(
  posthog: AnalyticsClient | null | undefined,
  distinctId: string | null | undefined,
  properties: Record<string, unknown>,
) {
  if (!distinctId) {
    return;
  }

  try {
    void posthog?.identify?.(distinctId, properties);
  } catch {
    // Analytics should never block the product flow.
  }
}

export function captureGenerationFailure(
  posthog: AnalyticsClient | null | undefined,
  error: unknown,
  properties?: Record<string, unknown>,
) {
  const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const eventProperties = {
    ...properties,
    error: errorMessage,
  };

  captureAnalytics(posthog, ANALYTICS_EVENTS.generationFailed, eventProperties);

  const normalized = errorMessage.toLowerCase();
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    captureAnalytics(posthog, ANALYTICS_EVENTS.apiTimeout, eventProperties);
  }

  return errorMessage;
}
