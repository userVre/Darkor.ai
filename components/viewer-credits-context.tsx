import {useQuery} from "convex/react";
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from "react";

import {loadGenerationAccessSnapshot, persistGenerationAccessSnapshot} from "../lib/generation-access";
import {GUEST_TESTING_STARTER_CREDITS} from "../lib/guest-testing";
import {useViewerSession} from "./viewer-session-context";

type ViewerCreditsSnapshot = {
  credits?: number;
  hasPaidAccess?: boolean;
  hasProAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
  streakCount?: number;
  streak_count?: number;
  canClaimDiamond?: boolean;
  nextDiamondClaimAt?: number;
  nextRefillTimestamp?: number;
  eliteProUntil?: number;
} | null | undefined;

type OptimisticViewerCreditsState = {
  credits?: number;
  hasPaidAccess?: boolean;
  hasProAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
  streakCount?: number;
  canClaimDiamond?: boolean;
  nextDiamondClaimAt?: number;
  eliteProUntil?: number;
} | null;

type ViewerCreditsContextValue = {
  credits: number;
  hasPaidAccess: boolean;
  hasProAccess: boolean;
  isReady: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
  streakCount: number;
  canClaimDiamond: boolean;
  nextDiamondClaimAt: number;
  eliteProUntil: number;
  clearOptimisticCredits: () => void;
  setOptimisticCredits: (nextCredits: number | null) => void;
  setOptimisticAccess: (nextState: OptimisticViewerCreditsState) => void;
  setOptimisticRewardState: (nextState: OptimisticViewerCreditsState) => void;
};

const ViewerCreditsContext = createContext<ViewerCreditsContextValue | null>(null);

export function ViewerCreditsProvider({ children }: { children: ReactNode }) {
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery(
    "users:me" as any,
    viewerReady ? viewerArgs : "skip",
  ) as ViewerCreditsSnapshot;
  const [optimisticState, setOptimisticState] = useState<OptimisticViewerCreditsState>(null);
  const [cachedState, setCachedState] = useState<ViewerCreditsSnapshot>(null);

  const serverCredits =
    viewerReady
      ? me?.credits ?? cachedState?.credits ?? GUEST_TESTING_STARTER_CREDITS
      : cachedState?.credits ?? GUEST_TESTING_STARTER_CREDITS;
  const credits = typeof optimisticState?.credits === "number" ? optimisticState.credits : serverCredits;
  const hasProAccess =
    optimisticState?.hasProAccess
    ?? optimisticState?.hasPaidAccess
    ?? me?.hasProAccess
    ?? me?.hasPaidAccess
    ?? cachedState?.hasProAccess
    ?? cachedState?.hasPaidAccess
    ?? false;
  const hasPaidAccess =
    optimisticState?.hasPaidAccess
    ?? me?.hasProAccess
    ?? me?.hasPaidAccess
    ?? cachedState?.hasProAccess
    ?? cachedState?.hasPaidAccess
    ?? false;
  const subscriptionType = optimisticState?.subscriptionType ?? me?.subscriptionType ?? cachedState?.subscriptionType;
  const serverStreakCount = me?.streakCount ?? me?.streak_count ?? cachedState?.streakCount ?? cachedState?.streak_count ?? 1;
  const streakCount = Math.max(1, Math.floor(optimisticState?.streakCount ?? serverStreakCount));
  const canClaimDiamond = optimisticState?.canClaimDiamond ?? me?.canClaimDiamond ?? cachedState?.canClaimDiamond ?? false;
  const nextDiamondClaimAt =
    optimisticState?.nextDiamondClaimAt
    ?? me?.nextDiamondClaimAt
    ?? me?.nextRefillTimestamp
    ?? cachedState?.nextDiamondClaimAt
    ?? cachedState?.nextRefillTimestamp
    ?? 0;
  const eliteProUntil = optimisticState?.eliteProUntil ?? me?.eliteProUntil ?? cachedState?.eliteProUntil ?? 0;
  const clearOptimisticCredits = useCallback(() => {
    setOptimisticState(null);
  }, []);
  const setOptimisticCredits = useCallback((nextCredits: number | null) => {
    setOptimisticState((current) => {
      if (nextCredits === null) {
        if (!current) {
          return null;
        }

        const { credits: _credits, ...rest } = current;
        return Object.keys(rest).length > 0 ? rest : null;
      }

      return {
        ...(current ?? {}),
        credits: nextCredits,
      };
    });
  }, []);
  const setOptimisticAccess = useCallback((nextState: OptimisticViewerCreditsState) => {
    setOptimisticState((current) => {
      if (!nextState) {
        return null;
      }

      return {
        ...(current ?? {}),
        ...nextState,
      };
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const cached = await loadGenerationAccessSnapshot();
      setCachedState(
        cached
          ? {
              credits: typeof cached.credits === "number" ? cached.credits : undefined,
              hasPaidAccess: typeof cached.hasPaidAccess === "boolean" ? cached.hasPaidAccess : undefined,
              hasProAccess: typeof cached.hasProAccess === "boolean" ? cached.hasProAccess : undefined,
              canClaimDiamond: typeof cached.canClaimDiamond === "boolean" ? cached.canClaimDiamond : undefined,
              nextDiamondClaimAt:
                typeof cached.nextDiamondClaimAt === "number"
                  ? cached.nextDiamondClaimAt
                  : typeof cached.nextRefillTimestamp === "number"
                    ? cached.nextRefillTimestamp
                    : undefined,
              streakCount: typeof cached.streakCount === "number" ? cached.streakCount : undefined,
              eliteProUntil: typeof cached.eliteProUntil === "number" ? cached.eliteProUntil : undefined,
              subscriptionType: cached.subscriptionType ?? undefined,
            }
          : null,
      );
    })();
  }, []);

  useEffect(() => {
    setOptimisticState(null);
  }, [
    anonymousId,
    me?.canClaimDiamond,
    me?.credits,
    me?.eliteProUntil,
    me?.hasPaidAccess,
    me?.hasProAccess,
    me?.nextDiamondClaimAt,
    me?.nextRefillTimestamp,
    me?.streakCount,
    me?.streak_count,
    me?.subscriptionType,
    viewerReady,
  ]);

  useEffect(() => {
    const snapshot = {
      credits,
      hasPaidAccess,
      hasProAccess,
      subscriptionType,
      streakCount,
      canClaimDiamond,
      nextDiamondClaimAt,
      eliteProUntil,
    };
    void persistGenerationAccessSnapshot(snapshot);
  }, [canClaimDiamond, credits, eliteProUntil, hasPaidAccess, hasProAccess, nextDiamondClaimAt, streakCount, subscriptionType]);

  const setOptimisticRewardState = useCallback((nextState: OptimisticViewerCreditsState) => {
    setOptimisticState((current) => {
      if (!nextState) {
        return current;
      }

      return {
        ...(current ?? {}),
        ...nextState,
      };
    });
  }, []);

  const value = useMemo<ViewerCreditsContextValue>(
    () => ({
      credits,
      hasPaidAccess,
      hasProAccess,
      isReady: viewerReady,
      subscriptionType,
      streakCount,
      canClaimDiamond,
      nextDiamondClaimAt,
      eliteProUntil,
      clearOptimisticCredits,
      setOptimisticCredits,
      setOptimisticAccess,
      setOptimisticRewardState,
    }),
    [
      canClaimDiamond,
      clearOptimisticCredits,
      credits,
      eliteProUntil,
      hasPaidAccess,
      hasProAccess,
      nextDiamondClaimAt,
      setOptimisticAccess,
      setOptimisticCredits,
      setOptimisticRewardState,
      streakCount,
      subscriptionType,
      viewerReady,
    ],
  );

  return <ViewerCreditsContext.Provider value={value}>{children}</ViewerCreditsContext.Provider>;
}

export function useViewerCredits() {
  const value = useContext(ViewerCreditsContext);
  if (!value) {
    throw new Error("useViewerCredits must be used within a ViewerCreditsProvider");
  }
  return value;
}
