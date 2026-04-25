import {useQuery} from "convex/react";
import {useEffect} from "react";

import {persistGenerationAccessSnapshot} from "../lib/generation-access";
import {useViewerSession} from "./viewer-session-context";

type CachedViewerState = {
  credits?: number;
  imagesRemaining?: number;
  imageGenerationLimit?: number;
  imageGenerationCount?: number;
  subscriptionType?: "free" | "weekly" | "yearly";
  subscriptionEntitlement?: "free" | "weekly_pro" | "annual_pro";
  subscriptionStartedAt?: number;
  generationResetAt?: number;
  generationStatusLabel?: string;
  generationStatusMessage?: string;
  hasPaidAccess?: boolean;
  canGenerateNow?: boolean;
  lastRefillTimestamp?: number;
  pricingTier?: string | null;
} | null;

export function GenerationAccessCacheGate() {
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = anonymousId ? { anonymousId } : {};
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as CachedViewerState | undefined;

  useEffect(() => {
    if (!viewerReady || me === undefined) {
      return;
    }

    void persistGenerationAccessSnapshot(me ?? null);
  }, [me, viewerReady]);

  return null;
}
