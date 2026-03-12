import * as Haptics from "expo-haptics";

export const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (process.env.EXPO_OS !== "ios") return;
  Haptics.impactAsync(style).catch(() => undefined);
};
