export const PLAN_PRICES = {
  starter: { monthly: 149000, yearly: 1490000 },
  professional: { monthly: 299000, yearly: 2990000 },
} as const;

export type PaidPlan = keyof typeof PLAN_PRICES;
export type BillingCycle = "monthly" | "yearly";

export function quotePlan(plan: string, cycle: string) {
  if (plan !== "starter" && plan !== "professional") return null;
  if (cycle !== "monthly" && cycle !== "yearly") return null;
  const price = PLAN_PRICES[plan];
  return {
    plan,
    cycle,
    amount: cycle === "yearly" ? price.yearly : price.monthly,
    days: cycle === "yearly" ? 365 : 30,
  };
}
