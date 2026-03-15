import { DIAGNOSTIC_BYPASS } from "../../lib/diagnostics";
import WorkspaceDiagnostic from "./workspace.diagnostic";

export default function WorkspaceScreen() {
  if (DIAGNOSTIC_BYPASS) {
    return <WorkspaceDiagnostic />;
  }

  const WorkspaceFull = require("./workspace.full").default;
  return <WorkspaceFull />;
}
