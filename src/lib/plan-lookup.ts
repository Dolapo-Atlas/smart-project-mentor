import { PLANS, type PlanRegion, formatPlanPrice } from "@/lib/plans";

export interface PlanMatch {
  region: PlanRegion;
  label: string;
  amount: string;
}

/** Resolve a stored price ID back to its display region / amount. */
export function planFromPriceId(priceId: string | null | undefined): PlanMatch | null {
  if (!priceId) return null;
  for (const region of Object.keys(PLANS) as PlanRegion[]) {
    const price = PLANS[region].oneTime;
    if (price.priceId === priceId) {
      return { region, label: PLANS[region].label, amount: formatPlanPrice(price) };
    }
  }
  return null;
}
