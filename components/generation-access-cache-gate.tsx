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
  hasProAccess?: boolean;
  canGenerateNow?: boolean;
  lastRefillTimestamp?: number;
  nextRefillTimestamp?: number;
  streakCount?: number;
  lastLoginDate?: number;
  lastClaimDate?: number;
  lastClaimAt?: number;
  proTrialExpiresAt?: number;
  nextDiamondClaimAt?: number;
  diamondBalance?: number;
  canClaimDiamond?: boolean;
  eliteProUntil?: number;
  onboardingDiamondClaimedAt?: number;
  pricingTier?: string | null;
} | null;

export function GenerationAccessCacheGate({ remoteSyncEnabled = true }: { remoteSyncEnabled?: boolean }) {
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = anonymousId ? { anonymousId } : {};
  const me = useQuery("users:me" as any, viewerReady && remoteSyncEnabled ? viewerArgs : "skip") as CachedViewerState | undefined;

  useEffect(() => {
    if (!remoteSyncEnabled || !viewerReady || me === undefined) {
      return;
    }

    void persistGenerationAccessSnapshot(me ?? null);
  }, [me, remoteSyncEnabled, viewerReady]);

  return null;
}
