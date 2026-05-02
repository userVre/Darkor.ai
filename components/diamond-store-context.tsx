import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {usePostHog} from "posthog-react-native";

import {ANALYTICS_EVENTS, captureAnalytics} from "../lib/analytics";
import {CreditsBalanceSheet} from "./credits-balance-sheet";

type DiamondStoreContextValue = {
  closeStore: () => void;
  openStore: (reason?: "manual" | "empty_balance") => void;
  visible: boolean;
};

const DiamondStoreContext = createContext<DiamondStoreContextValue | null>(null);

export function DiamondStoreProvider({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  const [visible, setVisible] = useState(false);

  const openStore = useCallback((reason: "manual" | "empty_balance" = "manual") => {
    captureAnalytics(posthog, ANALYTICS_EVENTS.diamondStoreOpened, { reason });
    setVisible(true);
  }, [posthog]);

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
