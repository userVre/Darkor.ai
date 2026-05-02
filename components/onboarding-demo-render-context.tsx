import AsyncStorage from "@react-native-async-storage/async-storage";
import {useAction, useMutation} from "convex/react";
import {Asset} from "expo-asset";
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from "react";

import {uploadLocalFileToCloud} from "../lib/native-upload";
import {useViewerSession} from "./viewer-session-context";

const DEMO_STARTED_KEY = "onboardingDemoRenderStarted";
const DEMO_RESULT_KEY = "onboardingDemoRenderUrl";
const DEMO_SAMPLE_ROOM = require("../assets/media/before-empty-room.png");

type DemoRenderStatus = "idle" | "loading" | "success" | "failed";

type OnboardingDemoRenderContextValue = {
  error: string | null;
  imageUrl: string | null;
  startDemoRender: () => Promise<void>;
  status: DemoRenderStatus;
};

const OnboardingDemoRenderContext = createContext<OnboardingDemoRenderContextValue | null>(null);

export function OnboardingDemoRenderProvider({children}: {children: ReactNode}) {
  const {anonymousId, isReady: viewerReady} = useViewerSession();
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const renderOnboardingDemo = useAction("aiNode:renderOnboardingDemo" as any);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<DemoRenderStatus>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const cachedUrl = await AsyncStorage.getItem(DEMO_RESULT_KEY);
      if (!active || !cachedUrl) {
        return;
      }

      setImageUrl(cachedUrl);
      setStatus("success");
    })();

    return () => {
      active = false;
    };
  }, []);

  const startDemoRender = useCallback(async () => {
    if (!viewerReady) {
      return;
    }

    if (status === "success" || status === "failed") {
      return;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const run = async () => {
      setStatus("loading");
      setError(null);

      try {
        const cachedUrl = await AsyncStorage.getItem(DEMO_RESULT_KEY);
        if (cachedUrl) {
          setImageUrl(cachedUrl);
          setStatus("success");
          return;
        }

        const started = await AsyncStorage.getItem(DEMO_STARTED_KEY);
        if (started) {
          setStatus("failed");
          return;
        }

        await AsyncStorage.setItem(DEMO_STARTED_KEY, String(Date.now()));

        const asset = Asset.fromModule(DEMO_SAMPLE_ROOM);
        await asset.downloadAsync();
        const sourceUri = asset.localUri ?? asset.uri;
        if (!sourceUri) {
          throw new Error("Demo room image is unavailable.");
        }

        const uploadUrl = (await createSourceUploadUrl({anonymousId: anonymousId ?? undefined})) as string;
        const imageStorageId = await uploadLocalFileToCloud(uploadUrl, sourceUri, {
          fallbackMimeType: "image/png",
          errorLabel: "demo room image",
        });
        const result = (await renderOnboardingDemo({imageStorageId})) as {imageUrl?: string | null};
        const nextImageUrl = result.imageUrl ?? null;
        if (!nextImageUrl) {
          throw new Error("Demo render did not return an image.");
        }

        await AsyncStorage.setItem(DEMO_RESULT_KEY, nextImageUrl);
        setImageUrl(nextImageUrl);
        setStatus("success");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Demo render failed.");
        setStatus("failed");
      } finally {
        inFlightRef.current = null;
      }
    };

    inFlightRef.current = run();
    return inFlightRef.current;
  }, [anonymousId, createSourceUploadUrl, renderOnboardingDemo, status, viewerReady]);

  const value = useMemo(
    () => ({
      error,
      imageUrl,
      startDemoRender,
      status,
    }),
    [error, imageUrl, startDemoRender, status],
  );

  return (
    <OnboardingDemoRenderContext.Provider value={value}>
      {children}
    </OnboardingDemoRenderContext.Provider>
  );
}

export function useOnboardingDemoRender() {
  const context = useContext(OnboardingDemoRenderContext);
  if (!context) {
    throw new Error("useOnboardingDemoRender must be used inside OnboardingDemoRenderProvider");
  }

  return context;
}
