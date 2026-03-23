const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("mp4");
config.resolver.sourceExts.push("css");
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "expo-keep-awake": path.resolve(__dirname, "lib/expo-keep-awake-safe.ts"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
