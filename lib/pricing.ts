export type PaidPlanKey = "pro";
export type AppPlanKey = PaidPlanKey | "trial";

export function planTitle(_plan: PaidPlanKey) {
  return "Pro Studio";
}

export function planCreditGrant(plan: AppPlanKey) {
  if (plan === "trial") return 5;
  return 110;
}
