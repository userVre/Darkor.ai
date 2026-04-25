import {createContext, useContext, useMemo, useState, type ReactNode} from "react";

type FlowUIContextValue = {
  isFlowActive: boolean;
  setIsFlowActive: (value: boolean) => void;
};

const FlowUIContext = createContext<FlowUIContextValue | null>(null);

export function FlowUIProvider({ children }: { children: ReactNode }) {
  const [isFlowActive, setIsFlowActive] = useState(false);
  const value = useMemo(() => ({ isFlowActive, setIsFlowActive }), [isFlowActive]);

  return <FlowUIContext.Provider value={value}>{children}</FlowUIContext.Provider>;
}

export function useFlowUI() {
  const context = useContext(FlowUIContext);
  if (!context) {
    throw new Error("useFlowUI must be used within FlowUIProvider");
  }
  return context;
}
