export type PaidPlanKey = "basic" | "pro";
export type AppPlanKey = PaidPlanKey | "trial";

export function planTitle(plan: PaidPlanKey) {
  if (plan === "basic") return "Basic";
  return "Pro";
}

export function planCreditGrant(plan: AppPlanKey) {
  if (plan === "trial") return 5;
  if (plan === "basic") return 35;
  return 110;
}
