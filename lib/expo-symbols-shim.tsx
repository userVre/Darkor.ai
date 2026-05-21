import type {ReactNode} from "react";

type SymbolViewProps = {
  fallback?: ReactNode;
};

export function SymbolView({fallback}: SymbolViewProps) {
  return <>{fallback ?? null}</>;
}

export async function unstable_getMaterialSymbolSourceAsync() {
  return null;
}
