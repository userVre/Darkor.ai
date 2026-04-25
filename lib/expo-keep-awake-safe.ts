import {type EventSubscription, UnavailabilityError, requireNativeModule} from "expo-modules-core";
import {useEffect, useId} from "react";
import {AppState} from "react-native";

export type KeepAwakeEvent = {
  state: KeepAwakeEventState;
};

export enum KeepAwakeEventState {
  RELEASE = "release",
}

export type KeepAwakeListener = (event: KeepAwakeEvent) => void;

export type KeepAwakeOptions = {
  suppressDeactivateWarnings?: boolean;
  listener?: KeepAwakeListener;
};

type ExpoKeepAwakeModule = {
  activate?: (tag: string) => Promise<void>;
  deactivate?: (tag: string) => Promise<void>;
  isAvailableAsync?: () => Promise<boolean>;
  addListenerForTag?: (tag: string, listener?: KeepAwakeListener) => EventSubscription;
};

const ExpoKeepAwake = requireNativeModule<ExpoKeepAwakeModule>("ExpoKeepAwake");

export const ExpoKeepAwakeTag = "ExpoKeepAwakeDefaultTag";

function isForegroundState(state: string | null | undefined) {
  return state === "active";
}

function isTransientActivityError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("current activity is no longer available") ||
    message.includes("has been rejected") ||
    (message.includes("activity") && message.includes("available"))
  );
}

async function safeActivate(tag: string) {
  if (!isForegroundState(AppState.currentState)) {
    return false;
  }

  try {
    await ExpoKeepAwake.activate?.(tag);
    return true;
  } catch (error) {
    if (isTransientActivityError(error)) {
      return false;
    }

    return false;
  }
}

async function safeDeactivate(tag: string, suppressWarnings: boolean) {
  try {
    await ExpoKeepAwake.deactivate?.(tag);
  } catch (error) {
    if (suppressWarnings || isTransientActivityError(error)) {
      return;
    }
  }
}

export async function isAvailableAsync(): Promise<boolean> {
  if (ExpoKeepAwake.isAvailableAsync) {
    return await ExpoKeepAwake.isAvailableAsync();
  }
  return true;
}

export function useKeepAwake(tag?: string, options?: KeepAwakeOptions): void {
  const defaultTag = useId();
  const tagOrDefault = tag ?? defaultTag;

  useEffect(() => {
    let isMounted = true;
    let listenerSubscription: EventSubscription | null = null;

    const syncKeepAwake = async (state: string | null | undefined) => {
      if (!isMounted) {
        return;
      }

      if (isForegroundState(state)) {
        const didActivate = await safeActivate(tagOrDefault);
        if (
          didActivate &&
          isMounted &&
          !listenerSubscription &&
          ExpoKeepAwake.addListenerForTag &&
          options?.listener
        ) {
          listenerSubscription = addListener(tagOrDefault, options.listener);
        }
        return;
      }

      await safeDeactivate(tagOrDefault, options?.suppressDeactivateWarnings ?? true);
    };

    void syncKeepAwake(AppState.currentState);
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      void syncKeepAwake(nextState);
    });

    return () => {
      isMounted = false;
      listenerSubscription?.remove();
      appStateSubscription.remove();
      void safeDeactivate(tagOrDefault, options?.suppressDeactivateWarnings ?? true);
    };
  }, [options?.listener, options?.suppressDeactivateWarnings, tagOrDefault]);
}

export function activateKeepAwake(tag: string = ExpoKeepAwakeTag): Promise<void> {
  console.warn("`activateKeepAwake` is deprecated. Use `activateKeepAwakeAsync` instead.");
  return activateKeepAwakeAsync(tag);
}

export async function activateKeepAwakeAsync(tag: string = ExpoKeepAwakeTag): Promise<void> {
  await safeActivate(tag);
}

export async function deactivateKeepAwake(tag: string = ExpoKeepAwakeTag): Promise<void> {
  await safeDeactivate(tag, true);
}

export function addListener(
  tagOrListener: string | KeepAwakeListener,
  listener?: KeepAwakeListener
): EventSubscription {
  if (!ExpoKeepAwake.addListenerForTag) {
    throw new UnavailabilityError("ExpoKeepAwake", "addListenerForTag");
  }

  const tag = typeof tagOrListener === "string" ? tagOrListener : ExpoKeepAwakeTag;
  const nextListener = typeof tagOrListener === "function" ? tagOrListener : listener;

  return ExpoKeepAwake.addListenerForTag(tag, nextListener);
}
