/**
 * Atlas programme subscription catalogue.
 *
 * Price IDs are the human-readable lookup keys created in the payment
 * provider; they are identical in test and live. Amounts are in major units
 * purely for display — the provider holds the authoritative amount.
 */
export type PlanRegion = "nigeria" | "india" | "international";
export type PlanInterval = "monthly" | "yearly";

export interface PlanPrice {
  priceId: string;
  amount: number;
  currency: string;
  symbol: string;
}

export const PLANS: Record<PlanRegion, {
  label: string;
  currency: string;
  symbol: string;
  monthly: PlanPrice;
  yearly: PlanPrice;
}> = {
  nigeria: {
    label: "Nigeria",
    currency: "NGN",
    symbol: "₦",
    monthly: { priceId: "atlas_ngn_monthly", amount: 20000, currency: "NGN", symbol: "₦" },
    yearly: { priceId: "atlas_ngn_yearly", amount: 200000, currency: "NGN", symbol: "₦" },
  },
  india: {
    label: "India",
    currency: "INR",
    symbol: "₹",
    monthly: { priceId: "atlas_inr_monthly", amount: 1499, currency: "INR", symbol: "₹" },
    yearly: { priceId: "atlas_inr_yearly", amount: 14990, currency: "INR", symbol: "₹" },
  },
  international: {
    label: "International",
    currency: "GBP",
    symbol: "£",
    monthly: { priceId: "atlas_gbp_monthly", amount: 10, currency: "GBP", symbol: "£" },
    yearly: { priceId: "atlas_gbp_yearly", amount: 100, currency: "GBP", symbol: "£" },
  },
};

export const PLAN_PRICE_IDS = Object.values(PLANS).flatMap((p) => [
  p.monthly.priceId,
  p.yearly.priceId,
]);

export function planFor(region: PlanRegion, interval: PlanInterval): PlanPrice {
  return PLANS[region][interval];
}

export function formatPlanPrice(price: PlanPrice): string {
  return `${price.symbol}${price.amount.toLocaleString()}`;
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