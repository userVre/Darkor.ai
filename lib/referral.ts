import AsyncStorage from "@react-native-async-storage/async-storage";

const REFERRAL_KEY = "darkor_referral_code";

export async function setReferralCode(code: string) {
  const normalized = code.trim();
  if (!normalized) return;
  await AsyncStorage.setItem(REFERRAL_KEY, normalized);
}

export async function consumeReferralCode() {
  const code = await AsyncStorage.getItem(REFERRAL_KEY);
  if (code) {
    await AsyncStorage.removeItem(REFERRAL_KEY);
  }
  return code;
}
