import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";

type ElitePassContextValue = {
  closeElitePass: () => void;
  openElitePass: () => void;
  openRewardBar: () => void;
  closeRewardBar: () => void;
  visible: boolean;
  rewardBarVisible: boolean;
};

const ElitePassContext = createContext<ElitePassContextValue | null>(null);

export function ElitePassProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [rewardBarVisible, setRewardBarVisible] = useState(false);

  const openElitePass = useCallback(() => {
    setVisible(true);
  }, []);

  const closeElitePass = useCallback(() => {
    setVisible(false);
  }, []);

  const openRewardBar = useCallback(() => {
    setRewardBarVisible(true);
  }, []);

  const closeRewardBar = useCallback(() => {
    setRewardBarVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      closeElitePass,
      openElitePass,
      openRewardBar,
      closeRewardBar,
      visible,
      rewardBarVisible,
    }),
    [closeElitePass, openElitePass, openRewardBar, closeRewardBar, visible, rewardBarVisible],
  );

  return <ElitePassContext.Provider value={value}>{children}</ElitePassContext.Provider>;
}

export function useElitePassModal() {
  const value = useContext(ElitePassContext);
  if (!value) {
    throw new Error("useElitePassModal must be used within an ElitePassProvider");
  }
  return value;
}
