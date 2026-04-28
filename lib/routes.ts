export const TOOLS_ROUTE = "/";
export const SETTINGS_ROUTE = "/settings";
export const WORKSPACE_ROUTE = "/workspace";

const SAFE_ROUTE_PREFIXES = [
  "/",
  "/tools",
  "/create",
  "/gallery",
  "/profile",
  "/workspace",
  "/(tabs)",
  "/(tabs)/index",
  "/(tabs)/create",
  "/(tabs)/gallery",
  "/(tabs)/profile",
  "/(tabs)/workspace",
  "/settings",
  "/faq",
  "/language-settings",
  "/legal-viewer",
  "/privacy-policy",
  "/terms-of-service",
  "/paywall",
  "/sign-in",
  "/sign-up",
  "/wizard",
] as const;

export function resolveSafeRoute(target?: string | null, fallback: string = TOOLS_ROUTE) {
  const trimmed = target?.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed === "/" || trimmed === "") {
    return fallback;
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const matchesKnownPrefix = SAFE_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}?`));

  return matchesKnownPrefix ? normalized : fallback;
}
