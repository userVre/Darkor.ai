import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DraftImage = {
  uri: string;
  base64?: string;
  label?: string;
};

type WorkspaceDraft = {
  image?: DraftImage | null;
  room?: string | null;
  style?: string | null;
};

type WorkspaceDraftContextValue = {
  draft: WorkspaceDraft;
  setDraftImage: (image: DraftImage | null) => void;
  setDraftRoom: (room: string | null) => void;
  setDraftStyle: (style: string | null) => void;
  clearDraft: () => void;
};

const WorkspaceDraftContext = createContext<WorkspaceDraftContextValue | null>(null);

export function WorkspaceDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<WorkspaceDraft>({});

  const setDraftImage = useCallback((image: DraftImage | null) => {
    setDraft((prev) => ({ ...prev, image }));
  }, []);

  const setDraftRoom = useCallback((room: string | null) => {
    setDraft((prev) => ({ ...prev, room }));
  }, []);

  const setDraftStyle = useCallback((style: string | null) => {
    setDraft((prev) => ({ ...prev, style }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft({});
  }, []);

  const value = useMemo(
    () => ({
      draft,
      setDraftImage,
      setDraftRoom,
      setDraftStyle,
      clearDraft,
    }),
    [clearDraft, draft, setDraftImage, setDraftRoom, setDraftStyle],
  );

  return <WorkspaceDraftContext.Provider value={value}>{children}</WorkspaceDraftContext.Provider>;
}

export function useWorkspaceDraft() {
  const context = useContext(WorkspaceDraftContext);
  if (!context) {
    throw new Error("useWorkspaceDraft must be used within WorkspaceDraftProvider");
  }
  return context;
}
