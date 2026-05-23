import * as Haptics from "expo-haptics";

export const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => undefined);
};
