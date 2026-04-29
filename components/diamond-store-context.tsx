import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from "react";

import {CreditsBalanceSheet} from "./credits-balance-sheet";
import {useViewerCredits} from "./viewer-credits-context";

type DiamondStoreContextValue = {
  closeStore: () => void;
  openStore: (reason?: "manual" | "empty_balance") => void;
  visible: boolean;
};

const DiamondStoreContext = createContext<DiamondStoreContextValue | null>(null);

export function DiamondStoreProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const { credits, hasPaidAccess, isReady } = useViewerCredits();
  const previousCreditsRef = useRef<number | null>(null);

  const openStore = useCallback((_reason: "manual" | "empty_balance" = "manual") => {
    setVisible(true);
  }, []);

  const closeStore = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!isReady || hasPaidAccess) {
      previousCreditsRef.current = credits;
      return;
    }

    const previousCredits = previousCreditsRef.current;
    if (!visible && typeof previousCredits === "number" && previousCredits > 0 && credits <= 0) {
      setVisible(true);
    }

    previousCreditsRef.current = credits;
  }, [credits, hasPaidAccess, isReady, visible]);

  const value = useMemo(
    () => ({
      closeStore,
      openStore,
      visible,
    }),
    [closeStore, openStore, visible],
  );

  return (
    <DiamondStoreContext.Provider value={value}>
      {children}
      <CreditsBalanceSheet onClose={closeStore} visible={visible} />
    </DiamondStoreContext.Provider>
  );
}

export function useDiamondStore() {
  const value = useContext(DiamondStoreContext);
  if (!value) {
    throw new Error("useDiamondStore must be used within a DiamondStoreProvider");
  }
  return value;
}
