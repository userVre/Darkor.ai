export type PlanKey = "pro" | "premium" | "ultra";

export function planTitle(plan: PlanKey) {
  if (plan === "pro") return "Pro";
  if (plan === "premium") return "Premium";
  return "Ultra";
}

export function planCreditGrant(plan: PlanKey) {
  if (plan === "ultra") return 300;
  if (plan === "premium") return 180;
  return 100;
}
