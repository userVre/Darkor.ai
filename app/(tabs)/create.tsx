import {Redirect, useLocalSearchParams} from "expo-router";

import {withWorkspaceFlowId} from "../../lib/try-it-flow";
import WorkspaceScreen from "./workspace";

export default function CreateTabScreen() {
  const { service, startStep, flowId, entrySource } = useLocalSearchParams<{
    service?: string;
    startStep?: string;
    flowId?: string;
    entrySource?: string;
  }>();

  const hasFlowId = typeof flowId === "string" && flowId.trim().length > 0;
  const isInteriorCreateFlow =
    service === "interior" &&
    startStep === "1" &&
    entrySource === "create-tab" &&
    hasFlowId;

  if (!isInteriorCreateFlow) {
    return <Redirect href={withWorkspaceFlowId("/create?service=interior&startStep=1&entrySource=create-tab") as any} />;
  }

  return <WorkspaceScreen />;
}
