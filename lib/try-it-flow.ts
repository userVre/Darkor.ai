export function withWorkspaceFlowId(path: string, flowId: string = Date.now().toString()) {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("flowId", flowId);
  const nextSearch = params.toString();
  return nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname;
}
