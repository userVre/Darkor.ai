import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn("EXPO_PUBLIC_CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) is not set.");
}

export const convex = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");
