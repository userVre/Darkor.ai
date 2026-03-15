try {
  const { cssInterop } = require("nativewind");
  const { BlurView } = require("expo-blur");
  const { Image } = require("expo-image");
  const { VideoView } = require("expo-video");
  const { MotiImage, MotiView } = require("moti");

  cssInterop(MotiView, { className: "style" });
  cssInterop(MotiImage, { className: "style" });
  cssInterop(BlurView, { className: "style" });
  cssInterop(VideoView, { className: "style" });
  cssInterop(Image, { className: "style" });
} catch (error) {
  console.warn("[Boot] NativeWind interop failed", error);
}
