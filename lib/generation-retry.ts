function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Generation failed");
}

export function shouldRetryGenerationError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network error") ||
    message.includes("load failed") ||
    message.includes("timed out")
  );
}

export async function runWithFriendlyRetry<T>(
  task: () => Promise<T>,
  onRetry: (message: string) => void,
  retryMessage = "Magic is taking a bit longer, retrying...",
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === 0 && shouldRetryGenerationError(error)) {
        onRetry(retryMessage);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }
      break;
    }
  }

  throw lastError;
}
