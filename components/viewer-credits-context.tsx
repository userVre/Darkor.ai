import {useQuery} from "convex/react";
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from "react";

import {loadGenerationAccessSnapshot, persistGenerationAccessSnapshot} from "../lib/generation-access";
import {GUEST_TESTING_STARTER_CREDITS} from "../lib/guest-testing";
import {useViewerSession} from "./viewer-session-context";

type ViewerCreditsSnapshot = {
  credits?: number;
  hasPaidAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
} | null | undefined;

type OptimisticViewerCreditsState = {
  credits?: number;
  hasPaidAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
} | null;

type ViewerCreditsContextValue = {
  credits: number;
  hasPaidAccess: boolean;
  isReady: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
  clearOptimisticCredits: () => void;
  setOptimisticCredits: (nextCredits: number | null) => void;
  setOptimisticAccess: (nextState: OptimisticViewerCreditsState) => void;
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
  const hasPaidAccess = optimisticState?.hasPaidAccess ?? me?.hasPaidAccess ?? cachedState?.hasPaidAccess ?? false;
  const subscriptionType = optimisticState?.subscriptionType ?? me?.subscriptionType ?? cachedState?.subscriptionType;
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
              subscriptionType: cached.subscriptionType ?? undefined,
            }
          : null,
      );
    })();
  }, []);

  useEffect(() => {
    setOptimisticState(null);
  }, [anonymousId, me?.credits, me?.hasPaidAccess, me?.subscriptionType, viewerReady]);

  useEffect(() => {
    const snapshot = {
      credits,
      hasPaidAccess,
      subscriptionType,
    };
    void persistGenerationAccessSnapshot(snapshot);
  }, [credits, hasPaidAccess, subscriptionType]);

  const value = useMemo<ViewerCreditsContextValue>(
    () => ({
      credits,
      hasPaidAccess,
      isReady: viewerReady,
      subscriptionType,
      clearOptimisticCredits,
      setOptimisticCredits,
      setOptimisticAccess,
    }),
    [clearOptimisticCredits, credits, hasPaidAccess, setOptimisticAccess, setOptimisticCredits, subscriptionType, viewerReady],
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
