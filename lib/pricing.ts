export type PlanKey = "pro" | "premium" | "ultra";

export function planTitle(plan: PlanKey) {
  if (plan === "pro") return "Pro";
  if (plan === "premium") return "Premium";
  return "Ultra";
}
