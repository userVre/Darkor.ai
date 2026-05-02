import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";

type ElitePassContextValue = {
  closeElitePass: () => void;
  openElitePass: () => void;
  visible: boolean;
};

const ElitePassContext = createContext<ElitePassContextValue | null>(null);

export function ElitePassProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openElitePass = useCallback(() => {
    setVisible(true);
  }, []);

  const closeElitePass = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      closeElitePass,
      openElitePass,
      visible,
    }),
    [closeElitePass, openElitePass, visible],
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
