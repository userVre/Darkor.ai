const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const defaultExclusions = [/\/__tests__\/.*/];

function escapeRegExp(pattern) {
  if (pattern instanceof RegExp) {
    return pattern.source.replace(/\/|\\\//g, "\\" + path.sep);
  }
  if (typeof pattern === "string") {
    const escaped = pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    return escaped.replaceAll("/", "\\" + path.sep);
  }
  throw new Error(`Expected exclusionList to be called with RegExp or string, got: ${typeof pattern}`);
}

function exclusionList(additionalExclusions) {
  return new RegExp(
    "(" + (additionalExclusions || []).concat(defaultExclusions).map(escapeRegExp).join("|") + ")$",
  );
}

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
