import { useQuery } from "convex/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { GUEST_TESTING_STARTER_CREDITS } from "../lib/guest-testing";
import { useViewerSession } from "./viewer-session-context";

type ViewerCreditsSnapshot = {
  credits?: number;
  hasPaidAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
} | null | undefined;

type ViewerCreditsContextValue = {
  credits: number;
  hasPaidAccess: boolean;
  isReady: boolean;
  serverCredits: number;
  subscriptionType?: "free" | "weekly" | "yearly";
  clearOptimisticCredits: () => void;
  setOptimisticCredits: (nextCredits: number | null) => void;
};

const ViewerCreditsContext = createContext<ViewerCreditsContextValue | null>(null);

export function ViewerCreditsProvider({ children }: { children: ReactNode }) {
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery(
    "users:me" as any,
    viewerReady ? viewerArgs : "skip",
  ) as ViewerCreditsSnapshot;
  const [optimisticCredits, setOptimisticCreditsState] = useState<number | null>(null);

  const serverCredits = viewerReady ? me?.credits ?? GUEST_TESTING_STARTER_CREDITS : GUEST_TESTING_STARTER_CREDITS;
  const credits = optimisticCredits ?? serverCredits;
  const hasPaidAccess = Boolean(me?.hasPaidAccess);
  const subscriptionType = me?.subscriptionType;
  const clearOptimisticCredits = useCallback(() => {
    setOptimisticCreditsState(null);
  }, []);
  const setOptimisticCredits = useCallback((nextCredits: number | null) => {
    setOptimisticCreditsState(nextCredits);
  }, []);

  useEffect(() => {
    setOptimisticCreditsState(null);
  }, [anonymousId, me?.credits, viewerReady]);

  const value = useMemo<ViewerCreditsContextValue>(
    () => ({
      credits,
      hasPaidAccess,
      isReady: viewerReady,
      serverCredits,
      subscriptionType,
      clearOptimisticCredits,
      setOptimisticCredits,
    }),
    [clearOptimisticCredits, credits, hasPaidAccess, serverCredits, setOptimisticCredits, subscriptionType, viewerReady],
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
