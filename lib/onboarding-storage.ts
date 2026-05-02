import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  LEGACY_ONBOARDING_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  PREVIOUS_ONBOARDING_STORAGE_KEY,
} from "./analytics";

const ONBOARDING_KEYS = [
  ONBOARDING_STORAGE_KEY,
  PREVIOUS_ONBOARDING_STORAGE_KEY,
  LEGACY_ONBOARDING_STORAGE_KEY,
];

export async function readHasFinishedOnboarding() {
  const storedValues = await AsyncStorage.multiGet(ONBOARDING_KEYS);
  return storedValues.some(([, value]) => value === "true");
}

export async function persistHasFinishedOnboarding() {
  await AsyncStorage.multiSet([
    [ONBOARDING_STORAGE_KEY, "true"],
    [LEGACY_ONBOARDING_STORAGE_KEY, "true"],
  ]);
}
