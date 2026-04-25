import {DevSettings, I18nManager} from "react-native";

export function isRTLLayout() {
  return I18nManager.isRTL;
}

export function getDirectionalTextAlign(isRTL = I18nManager.isRTL) {
  return isRTL ? ("right" as const) : ("left" as const);
}

export function getDirectionalRow(isRTL = I18nManager.isRTL) {
  return isRTL ? ("row-reverse" as const) : ("row" as const);
}

export function getDirectionalAlignment(isRTL = I18nManager.isRTL) {
  return isRTL ? ("flex-end" as const) : ("flex-start" as const);
}

export function getDirectionalOppositeAlignment(isRTL = I18nManager.isRTL) {
  return isRTL ? ("flex-start" as const) : ("flex-end" as const);
}

export function getDirectionalArrowScale(isRTL = I18nManager.isRTL) {
  return isRTL ? -1 : 1;
}

export async function reloadAppForLayoutDirection() {
  try {
    const updatesModule = require("expo-updates") as { reloadAsync?: () => Promise<void> };
    if (typeof updatesModule.reloadAsync === "function") {
      await updatesModule.reloadAsync();
      return true;
    }
  } catch {
    // Ignore and fall back to the React Native reload path.
  }

  try {
    DevSettings.reload();
    return true;
  } catch {
    return false;
  }
}
