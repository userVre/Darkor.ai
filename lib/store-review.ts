import * as StoreReview from "expo-store-review";
import { Alert } from "react-native";

export async function requestStoreReview() {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      Alert.alert("Rate HomeDecor AI", "Review requests are not available on this device.");
      return false;
    }
    await StoreReview.requestReview();
    return true;
  } catch (error) {
    Alert.alert("Rate HomeDecor AI", "Unable to open the store review dialog right now.");
    return false;
  }
}
