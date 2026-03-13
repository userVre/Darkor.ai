import * as StoreReview from "expo-store-review";
import { Alert } from "react-native";

export async function requestStoreReview() {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      Alert.alert("Rate Darkor.ai", "Review requests are not available on this device.");
      return false;
    }
    await StoreReview.requestReview();
    return true;
  } catch (error) {
    Alert.alert("Rate Darkor.ai", "Unable to open the store review dialog right now.");
    return false;
  }
}
