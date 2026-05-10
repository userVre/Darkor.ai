import {ConvexReactClient} from "convex/react";

import {getEnvReport} from "./env";

let convexClient: ConvexReactClient | null = null;
let convexClientUrl: string | null = null;

export function getConvexClient() {
  const convexUrl = getEnvReport().values.convexUrl;

  if (!convexUrl) {
    console.warn("[Env] EXPO_PUBLIC_CONVEX_URL is not set.");
    return null;
  }

  if (!convexClient || convexClientUrl !== convexUrl) {
    convexClient = new ConvexReactClient(convexUrl);
    convexClientUrl = convexUrl;
  }

  return convexClient;
}

export const hasConvexConfig = Boolean(getEnvReport().values.convexUrl);
