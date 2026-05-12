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
    console.log("[Boot] Convex client initialization started");
    try {
      convexClient = new ConvexReactClient(convexUrl);
      convexClientUrl = convexUrl;
      console.log("[Boot] Convex client initialization finished");
    } catch (error) {
      console.warn("[Boot] Convex client initialization failed", error);
      convexClient = null;
      convexClientUrl = null;
      return null;
    }
  }

  return convexClient;
}

export const hasConvexConfig = Boolean(getEnvReport().values.convexUrl);
