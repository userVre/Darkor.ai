import * as StoreReview from "expo-store-review";
import { Alert } from "react-native";
import i18n from "./i18n";

export async function requestStoreReview() {
  const t = i18n.getFixedT(i18n.resolvedLanguage ?? i18n.language);
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      Alert.alert(t("storeReview.title"), t("storeReview.unavailableBody"));
      return false;
    }
    await StoreReview.requestReview();
    return true;
  } catch (error) {
    Alert.alert(t("storeReview.title"), t("storeReview.errorBody"));
    return false;
  }
}
