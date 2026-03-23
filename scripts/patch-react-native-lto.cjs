const fs = require("fs");
const path = require("path");

const legacyCondition =
  "if (NOT DEFINED REACT_NATIVE_DISABLE_LTO OR NOT REACT_NATIVE_DISABLE_LTO)";
const newCondition =
  "if (NOT DEFINED REACT_NATIVE_DISABLE_LTO AND NOT DEFINED ENV{REACT_NATIVE_DISABLE_LTO})";

const patches = [
  {
    file: path.join(
      __dirname,
      "..",
      "node_modules",
      "react-native",
      "ReactAndroid",
      "cmake-utils",
      "ReactNative-application.cmake"
    ),
    find: [
      "include(CheckIPOSupported)",
      "check_ipo_supported(RESULT IPO_SUPPORT)",
      "if (IPO_SUPPORT)",
      "  set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)",
      "endif()"
    ].join("\n"),
    replace: [
      newCondition,
      "  include(CheckIPOSupported)",
      "  check_ipo_supported(RESULT IPO_SUPPORT)",
      "  if (IPO_SUPPORT)",
      "    set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)",
      "  endif()",
      "endif()"
    ].join("\n")
  },
  {
    file: path.join(
      __dirname,
      "..",
      "node_modules",
      "react-native",
      "ReactAndroid",
      "src",
      "main",
      "jni",
      "CMakeLists.txt"
    ),
    find: [
      "include(CheckIPOSupported)",
      "check_ipo_supported(RESULT IPO_SUPPORT)",
      "if (IPO_SUPPORT)",
      "  message(STATUS \"LTO support is enabled\")",
      "  set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)",
      "endif()"
    ].join("\n"),
    replace: [
      newCondition,
      "  include(CheckIPOSupported)",
      "  check_ipo_supported(RESULT IPO_SUPPORT)",
      "  if (IPO_SUPPORT)",
      "    message(STATUS \"LTO support is enabled\")",
      "    set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)",
      "  endif()",
      "endif()"
    ].join("\n")
  },
  {
    file: path.join(
      __dirname,
      "..",
      "node_modules",
      "expo",
      "src",
      "launch",
      "withDevTools.tsx"
    ),
    find: [
      "import * as React from 'react';",
      "",
      "// Keep the screen awake on Android, we don't use the Fast Refresh overlay here.",
      "// The default behavior here is to skip the custom Fast Refresh indicator.",
      "export function withDevTools<TComponent extends React.ComponentType<any>>(",
      "  AppRootComponent: TComponent",
      "): React.ComponentType<React.ComponentProps<TComponent>> {",
      "  // This hook can be optionally imported because __DEV__ never changes during runtime.",
      "  // Using __DEV__ like this enables tree shaking to remove the hook in production.",
      "  const useOptionalKeepAwake: (tag?: string) => void = (() => {",
      "    try {",
      "      // Optionally import expo-keep-awake",
      "      const { useKeepAwake, ExpoKeepAwakeTag } = require('expo-keep-awake');",
      "      return () => useKeepAwake(ExpoKeepAwakeTag, { suppressDeactivateWarnings: true });",
      "    } catch {}",
      "    return () => {};",
      "  })();"
    ].join("\n"),
    replace: [
      "import * as React from 'react';",
      "import { Platform } from 'react-native';",
      "",
      "// Keep the screen awake on Android, we don't use the Fast Refresh overlay here.",
      "// The default behavior here is to skip the custom Fast Refresh indicator.",
      "export function withDevTools<TComponent extends React.ComponentType<any>>(",
      "  AppRootComponent: TComponent",
      "): React.ComponentType<React.ComponentProps<TComponent>> {",
      "  // This hook can be optionally imported because __DEV__ never changes during runtime.",
      "  // Using __DEV__ like this enables tree shaking to remove the hook in production.",
      "  const useOptionalKeepAwake: (tag?: string) => void = (() => {",
      "    if (Platform.OS === 'android') {",
      "      return () => {};",
      "    }",
      "",
      "    try {",
      "      // Optionally import expo-keep-awake",
      "      const { useKeepAwake, ExpoKeepAwakeTag } = require('expo-keep-awake');",
      "      return () => useKeepAwake(ExpoKeepAwakeTag, { suppressDeactivateWarnings: true });",
      "    } catch {}",
      "    return () => {};",
      "  })();"
    ].join("\n")
  }
];

const patchFile = ({ file, find, replace }) => {
  if (!fs.existsSync(file)) {
    console.warn(`[patch-react-native-lto] Missing file: ${file}`);
    return false;
  }

  const original = fs.readFileSync(file, "utf8");
  if (original.includes(legacyCondition)) {
    const updatedLegacy = original.replaceAll(legacyCondition, newCondition);
    fs.writeFileSync(file, updatedLegacy);
    console.log(`[patch-react-native-lto] Updated legacy patch: ${file}`);
    return true;
  }

  if (original.includes(replace)) {
    console.log(`[patch-react-native-lto] Already patched: ${file}`);
    return true;
  }

  if (!original.includes(find)) {
    console.warn(`[patch-react-native-lto] Pattern not found: ${file}`);
    return false;
  }

  const updated = original.replace(find, replace);
  fs.writeFileSync(file, updated);
  console.log(`[patch-react-native-lto] Patched: ${file}`);
  return true;
};

let allOk = true;
for (const patch of patches) {
  const ok = patchFile(patch);
  if (!ok) allOk = false;
}

if (!allOk) {
  console.warn(
    "[patch-react-native-lto] Completed with warnings. If builds still fail, re-run npm install."
  );
}
