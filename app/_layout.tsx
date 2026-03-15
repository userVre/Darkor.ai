import { DIAGNOSTIC_BYPASS } from "../lib/diagnostics";
import RootLayoutDiagnostic from "./_layout.diagnostic";

export default function RootLayout() {
  if (DIAGNOSTIC_BYPASS) {
    return <RootLayoutDiagnostic />;
  }

  const RootLayoutFull = require("./_layout.full").default;
  return <RootLayoutFull />;
}
