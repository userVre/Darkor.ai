export type PlanKey = "pro" | "premium" | "ultra";
export type BillingCycle = "monthly" | "yearly";

export const PRICE_IDS: Record<PlanKey, Record<BillingCycle, string>> = {
  pro: {
    monthly: "e63d860f-e646-4964-a52b-6d19ef5d0551",
    yearly: "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e",
  },
  premium: {
    monthly: "b286c1c2-73c8-449f-99aa-1c6a276f5cc2",
    yearly: "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba",
  },
  ultra: {
    monthly: "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e",
    yearly: "f2652c80-3808-452f-9024-141ac7bc2309",
  },
};

export const PLAN_PRICING = {
  pro: { monthly: 9, yearly: 90, yearlyMonthlyDisplay: 7.5, credits: 100 },
  premium: { monthly: 29, yearly: 290, yearlyMonthlyDisplay: 24.16, credits: 500 },
  ultra: { monthly: 79, yearly: 790, yearlyMonthlyDisplay: 65.83, credits: 2000 },
} as const;

export function getPriceId(plan: PlanKey, cycle: BillingCycle) {
  return PRICE_IDS[plan][cycle];
}

export function planTitle(plan: PlanKey) {
  if (plan === "pro") return "Pro";
  if (plan === "premium") return "Premium";
  return "Ultra";
}
