import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";

import {CreditsBalanceSheet} from "./credits-balance-sheet";

type DiamondStoreContextValue = {
  closeStore: () => void;
  openStore: (reason?: "manual" | "empty_balance") => void;
  visible: boolean;
};

const DiamondStoreContext = createContext<DiamondStoreContextValue | null>(null);

export function DiamondStoreProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openStore = useCallback((_reason: "manual" | "empty_balance" = "manual") => {
    setVisible(true);
  }, []);

  const closeStore = useCallback(() => {
    setVisible(false);
  }, []);

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
