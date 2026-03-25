import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import { useMutation } from "convex/react";
import * as Crypto from "expo-crypto";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const ANONYMOUS_ID_STORAGE_KEY = "darkor.ai.anonymous-id";

type ViewerSessionContextValue = {
  anonymousId: string | null;
  isReady: boolean;
  isGuest: boolean;
  isSignedIn: boolean;
};

const ViewerSessionContext = createContext<ViewerSessionContextValue | null>(null);

async function readOrCreateAnonymousId() {
  const existing = await AsyncStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const nextAnonymousId = Crypto.randomUUID();
  await AsyncStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, nextAnonymousId);
  return nextAnonymousId;
}

export function ViewerSessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const ensureViewer = useMutation("users:getOrCreateCurrentUser" as any);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [syncingViewer, setSyncingViewer] = useState(false);
  const lastSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const value = await readOrCreateAnonymousId();
        if (!cancelled) {
          setAnonymousId(value);
        }
      } catch (error) {
        console.warn("[Viewer] Failed to initialize anonymous id", error);
      } finally {
        if (!cancelled) {
          setStorageReady(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || !isLoaded || !anonymousId) {
      return;
    }

    const syncKey = `${isSignedIn ? "account" : "guest"}:${anonymousId}`;
    if (lastSyncKeyRef.current === syncKey) {
      return;
    }

    let cancelled = false;
    setSyncingViewer(true);

    const run = async () => {
      try {
        await ensureViewer({ anonymousId });
      } catch (error) {
        console.warn("[Viewer] Failed to sync viewer", error);
      } finally {
        if (!cancelled) {
          lastSyncKeyRef.current = syncKey;
          setSyncingViewer(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [anonymousId, ensureViewer, isLoaded, isSignedIn, storageReady]);

  const value = useMemo<ViewerSessionContextValue>(
    () => ({
      anonymousId,
      isReady: storageReady && isLoaded && !syncingViewer && Boolean(anonymousId),
      isGuest: isLoaded ? !Boolean(isSignedIn) : false,
      isSignedIn: Boolean(isSignedIn),
    }),
    [anonymousId, isLoaded, isSignedIn, storageReady, syncingViewer],
  );

  return <ViewerSessionContext.Provider value={value}>{children}</ViewerSessionContext.Provider>;
}

export function useViewerSession() {
  const value = useContext(ViewerSessionContext);
  if (!value) {
    throw new Error("useViewerSession must be used within a ViewerSessionProvider");
  }
  return value;
}
