import "react-native-gesture-handler";
import "react-native-reanimated";

import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import RootLayoutDiagnostic from "./_layout_diagnostic";

console.log("[Boot] Root layout entry loaded");

export default function RootLayout() {
  if (DIAGNOSTIC_BYPASS) {
    return <RootLayoutDiagnostic />;
  }

  const RootLayoutFull = require("./_layout_full").default;
  return <RootLayoutFull />;
}
