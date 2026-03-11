const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("mp4");
config.resolver.sourceExts.push("css");
config.resolver.blockList = exclusionList([
  /.*[\\/]web_legacy_app[\\/].*/,
  /.*[\\/]\.next[\\/].*/,
  /.*[\\/]Darkor\.ai[\\/].*/,
  /.*[\\/]next\.config\.ts/,
  /.*[\\/]next-env\.d\.ts/,
]);

module.exports = withNativeWind(config, { input: "./global.css" });
