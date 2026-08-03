/**
 * Atlas programme catalogue — a single ONE-TIME unlock per market.
 *
 * Price IDs are the human-readable lookup keys created in the payment
 * provider; they are identical in test and live. Amounts are in major units
 * purely for display — the provider holds the authoritative amount.
 */
export type PlanRegion = "nigeria" | "india" | "international";

export const PROGRAMME_ID = "atlas_readiness_experience";
export const PROGRAMME_NAME =
  "Atlas Project Readiness Experience — Digital Care Records Rollout";

export interface PlanPrice {
  priceId: string;
  amount: number;
  currency: string;
  symbol: string;
}

export const PLANS: Record<
  PlanRegion,
  { label: string; currency: string; symbol: string; oneTime: PlanPrice }
> = {
  nigeria: {
    label: "Nigeria",
    currency: "NGN",
    symbol: "₦",
    oneTime: { priceId: "atlas_onetime_ngn", amount: 25000, currency: "NGN", symbol: "₦" },
  },
  india: {
    label: "India",
    currency: "INR",
    symbol: "₹",
    oneTime: { priceId: "atlas_onetime_inr", amount: 1499, currency: "INR", symbol: "₹" },
  },
  international: {
    label: "United Kingdom & other markets",
    currency: "GBP",
    symbol: "£",
    oneTime: { priceId: "atlas_onetime_gbp", amount: 24.99, currency: "GBP", symbol: "£" },
  },
};

export const PLAN_PRICE_IDS = Object.values(PLANS).map((p) => p.oneTime.priceId);

export function planFor(region: PlanRegion): PlanPrice {
  return PLANS[region].oneTime;
}

export function formatPlanPrice(price: PlanPrice): string {
  const decimals = Number.isInteger(price.amount) ? 0 : 2;
  return `${price.symbol}${price.amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Best-effort region guess from the browser locale / timezone. */
export function guessRegion(): PlanRegion {
  if (typeof window === "undefined") return "international";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const locale = navigator.language ?? "";
  if (/Lagos|Africa\/Lagos/i.test(tz) || /-NG$/i.test(locale)) return "nigeria";
  if (/Kolkata|Calcutta/i.test(tz) || /-IN$/i.test(locale)) return "india";
  return "international";
}
