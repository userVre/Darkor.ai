export function normalizeAzureOpenAIEndpoint(endpoint: string) {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const openAiIndex = parsed.pathname.toLowerCase().indexOf("/openai");
    parsed.pathname = openAiIndex >= 0 ? parsed.pathname.slice(0, openAiIndex) : parsed.pathname;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    const withoutQuery = trimmed.split("?")[0].split("#")[0];
    const openAiIndex = withoutQuery.toLowerCase().indexOf("/openai");
    const resourceEndpoint = openAiIndex >= 0 ? withoutQuery.slice(0, openAiIndex) : withoutQuery;
    return resourceEndpoint.replace(/\/+$/, "");
  }
}

export function ensureAzureEndpointPrefix(endpoint: string) {
  const normalized = normalizeAzureOpenAIEndpoint(endpoint);
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

export function buildAzureOpenAIBaseUrl(endpoint: string) {
  return `${ensureAzureEndpointPrefix(endpoint)}openai`;
}
