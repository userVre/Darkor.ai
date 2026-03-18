import { ConvexReactClient } from "convex/react";

import { getEnvReport } from "./env";

const { values } = getEnvReport();
const convexUrl = values.convexUrl;

if (!convexUrl) {
  console.warn("[Env] EXPO_PUBLIC_CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) is not set.");
}

export const hasConvexConfig = Boolean(convexUrl);
export const convex = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");
