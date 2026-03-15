import { DIAGNOSTIC_BYPASS } from "../../lib/diagnostics";
import TabsLayoutDiagnostic from "./_layout.diagnostic";

export default function TabsLayout() {
  if (DIAGNOSTIC_BYPASS) {
    return <TabsLayoutDiagnostic />;
  }

  const TabsLayoutFull = require("./_layout.full").default;
  return <TabsLayoutFull />;
}
