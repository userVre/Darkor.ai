import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_SKIP_STORAGE_KEY = "darkor.ai.auth-skip";
const authSkipListeners = new Set<(skipped: boolean) => void>();

function notifyAuthSkipListeners(skipped: boolean) {
  authSkipListeners.forEach((listener) => listener(skipped));
}

export async function markAuthSkipped() {
  await AsyncStorage.setItem(AUTH_SKIP_STORAGE_KEY, "true");
  notifyAuthSkipListeners(true);
}

export async function clearAuthSkipped() {
  await AsyncStorage.removeItem(AUTH_SKIP_STORAGE_KEY);
  notifyAuthSkipListeners(false);
}

export async function readAuthSkipped() {
  return (await AsyncStorage.getItem(AUTH_SKIP_STORAGE_KEY)) === "true";
}

export function subscribeAuthSkipped(listener: (skipped: boolean) => void) {
  authSkipListeners.add(listener);
  return () => {
    authSkipListeners.delete(listener);
  };
}
