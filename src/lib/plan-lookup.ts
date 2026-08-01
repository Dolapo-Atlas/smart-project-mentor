import { PLANS, type PlanInterval, type PlanRegion, formatPlanPrice } from "@/lib/plans";

export interface PlanMatch {
  region: PlanRegion;
  interval: PlanInterval;
  label: string;
  amount: string;
}

/** Resolve a stored price ID back to its display region / interval / amount. */
export function planFromPriceId(priceId: string | null | undefined): PlanMatch | null {
  if (!priceId) return null;
  for (const region of Object.keys(PLANS) as PlanRegion[]) {
    for (const interval of ["monthly", "yearly"] as PlanInterval[]) {
      const price = PLANS[region][interval];
      if (price.priceId === priceId) {
        return {
          region,
          interval,
          label: `${PLANS[region].label} ${interval}`,
          amount: formatPlanPrice(price),
        };
      }
    }
  }
  return null;
}