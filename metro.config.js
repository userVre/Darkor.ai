const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const escapeRegex = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
const escapePathForRegex = (value) => value.split(/[/\\]+/).map(escapeRegex).join("[/\\\\]");
const ignoredWorkspaceDirs = ["homedecor-ai", "android.backup", ".codex-temp", ".tmp", "dist"].map(
  (dir) => new RegExp(`${escapePathForRegex(path.resolve(__dirname, dir))}[/\\\\].*`),
);

config.resolver.sourceExts.push("css");
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList].filter(Boolean)),
  ...ignoredWorkspaceDirs,
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@": __dirname,
  "expo-keep-awake": path.resolve(__dirname, "lib/expo-keep-awake-safe.ts"),
  "expo-symbols": path.resolve(__dirname, "lib/expo-symbols-shim.tsx"),
};
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-symbols") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "lib/expo-symbols-shim.tsx"),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
