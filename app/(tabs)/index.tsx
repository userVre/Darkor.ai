import { DIAGNOSTIC_BYPASS } from "../../lib/diagnostics";
import HomeDiagnostic from "./home.diagnostic";

export default function HomeScreen() {
  if (DIAGNOSTIC_BYPASS) {
    return <HomeDiagnostic />;
  }

  const HomeFull = require("./home.full").default;
  return <HomeFull />;
}
