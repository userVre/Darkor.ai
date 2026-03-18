const disableVideoEnv = process.env.EXPO_PUBLIC_DISABLE_VIDEO;
const disableByDefault = typeof __DEV__ !== "undefined" ? __DEV__ : false;

export const DIAGNOSTIC_BYPASS = false;
export const DISABLE_VIDEO_BACKGROUNDS =
  disableVideoEnv === "1" ||
  disableVideoEnv === "true" ||
  disableVideoEnv === "yes" ||
  disableVideoEnv === "on" ||
  (disableVideoEnv == null && disableByDefault);
