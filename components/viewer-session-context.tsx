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
  const [syncRetryNonce, setSyncRetryNonce] = useState(0);
  const lastSyncKeyRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const fallbackAnonymousId = Crypto.randomUUID();
        if (!cancelled) {
          console.warn("[Viewer] Falling back to an in-memory anonymous id.");
          setAnonymousId(fallbackAnonymousId);
        }
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
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
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
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const run = async () => {
      try {
        await ensureViewer({ anonymousId });
        if (!cancelled) {
          lastSyncKeyRef.current = syncKey;
        }
      } catch (error) {
        console.warn("[Viewer] Failed to sync viewer", error);
        if (!cancelled) {
          retryTimerRef.current = setTimeout(() => {
            setSyncRetryNonce((current) => current + 1);
          }, 2500);
        }
      } finally {
        if (!cancelled) {
          setSyncingViewer(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [anonymousId, ensureViewer, isLoaded, isSignedIn, storageReady, syncRetryNonce]);

  const value = useMemo<ViewerSessionContextValue>(
    () => ({
      anonymousId,
      isReady: storageReady && Boolean(anonymousId),
      isGuest: !Boolean(isSignedIn),
      isSignedIn: Boolean(isSignedIn),
    }),
    [anonymousId, isSignedIn, storageReady],
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
