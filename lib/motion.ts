export const LUX_SPRING = {
  type: "spring",
  damping: 15,
  stiffness: 100,
} as const;

export const staggerFadeUp = (index: number, delayStep = 90) => ({
  from: { opacity: 0, translateY: 18, scale: 0.98 },
  animate: { opacity: 1, translateY: 0, scale: 1 },
  transition: { ...LUX_SPRING, delay: 140 + index * delayStep },
});
