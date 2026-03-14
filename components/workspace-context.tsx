import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type DraftImage = {
  uri: string;
  base64?: string;
  label?: string;
};

type WorkspaceDraft = {
  image?: DraftImage | null;
  room?: string | null;
  style?: string | null;
  paletteId?: string | null;
  prompt?: string | null;
};

type WorkspaceDraftContextValue = {
  draft: WorkspaceDraft;
  setDraftImage: (image: DraftImage | null) => void;
  setDraftRoom: (room: string | null) => void;
  setDraftStyle: (style: string | null) => void;
  setDraftPalette: (paletteId: string | null) => void;
  setDraftPrompt: (prompt: string | null) => void;
  clearDraft: () => void;
};

const WorkspaceDraftContext = createContext<WorkspaceDraftContextValue | null>(null);
const STORAGE_KEY = "darkor_workspace_draft_v1";

export function WorkspaceDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<WorkspaceDraft>({});

  useEffect(() => {
    let isMounted = true;
    const loadDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as WorkspaceDraft;
        if (isMounted) {
          setDraft({
            image: parsed.image ?? null,
            room: parsed.room ?? null,
            style: parsed.style ?? null,
            paletteId: parsed.paletteId ?? null,
            prompt: parsed.prompt ?? null,
          });
        }
      } catch {
        // Ignore invalid stored drafts.
      }
    };
    void loadDraft();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const persist = async () => {
      try {
        const payload: WorkspaceDraft = {
          image: draft.image ? { uri: draft.image.uri, label: draft.image.label } : null,
          room: draft.room ?? null,
          style: draft.style ?? null,
          paletteId: draft.paletteId ?? null,
          prompt: draft.prompt ?? null,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore storage errors
      }
    };
    void persist();
  }, [draft]);

  const setDraftImage = useCallback((image: DraftImage | null) => {
    setDraft((prev) => ({ ...prev, image }));
  }, []);

  const setDraftRoom = useCallback((room: string | null) => {
    setDraft((prev) => ({ ...prev, room }));
  }, []);

  const setDraftStyle = useCallback((style: string | null) => {
    setDraft((prev) => ({ ...prev, style }));
  }, []);

  const setDraftPalette = useCallback((paletteId: string | null) => {
    setDraft((prev) => ({ ...prev, paletteId }));
  }, []);

  const setDraftPrompt = useCallback((prompt: string | null) => {
    setDraft((prev) => ({ ...prev, prompt }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft({});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      setDraftImage,
      setDraftRoom,
      setDraftStyle,
      setDraftPalette,
      setDraftPrompt,
      clearDraft,
    }),
    [clearDraft, draft, setDraftImage, setDraftPalette, setDraftPrompt, setDraftRoom, setDraftStyle],
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
