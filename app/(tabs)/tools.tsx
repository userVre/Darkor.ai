import {Redirect} from "expo-router";

import {TOOLS_ROUTE} from "../../lib/routes";

export default function ToolsAliasScreen() {
  return <Redirect href={TOOLS_ROUTE as any} />;
}
