/**
 * Canonical, single source of truth for hard project facts that stakeholders,
 * the mentor and the UI must all quote identically. AI prompts receive these
 * verbatim so a stakeholder can never invent a different budget or currency.
 *
 * One record per playable project template (keyed by `project_templates.slug`),
 * because the CRM, EV and relocation simulations are funded differently from
 * the Digital Care Records rollout.
 */
export type ProjectFacts = {
  slug: string;
  currency: string;
  currencySymbol: string;
  /** Approved total budget envelope for the simulation. */
  totalBudget: number;
  /** Simulated calendar length of the project (not the play-through length). */
  durationDays: number;
  /** Human wording used in UI copy so screens and AI agree. */
  timelineLabel: string;
  /** Deployment footprint, e.g. "12 care homes". Empty when not applicable. */
  unitLabel: string;
  vendor: string;
};

const DCR: ProjectFacts = {
  slug: "digital-care-records",
  currency: "GBP",
  currencySymbol: "£",
  totalBudget: 1_200_000,
  durationDays: 180,
  timelineLabel: "6 months (approx. 180 days)",
  unitLabel: "12 care homes",
  vendor: "CareSoft Ltd",
};

export const PROJECT_FACTS_BY_SLUG: Record<string, ProjectFacts> = {
  "digital-care-records": DCR,
  "crm-implementation": {
    slug: "crm-implementation",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 850_000,
    durationDays: 150,
    timelineLabel: "5 months (approx. 150 days)",
    unitLabel: "4 sales regions",
    vendor: "Helio CRM",
  },
  "website-redesign": {
    slug: "website-redesign",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 320_000,
    durationDays: 120,
    timelineLabel: "4 months (approx. 120 days)",
    unitLabel: "1 public storefront",
    vendor: "Northgate Digital",
  },
  "office-relocation": {
    slug: "office-relocation",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 1_650_000,
    durationDays: 210,
    timelineLabel: "7 months (approx. 210 days)",
    unitLabel: "2 buildings, 480 desks",
    vendor: "Meridian Workplace",
  },
  "new-product-launch": {
    slug: "new-product-launch",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 950_000,
    durationDays: 240,
    timelineLabel: "8 months (approx. 240 days)",
    unitLabel: "3 launch markets",
    vendor: "Brightline Agency",
  },
  "ev-charging-network": {
    slug: "ev-charging-network",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 4_200_000,
    durationDays: 270,
    timelineLabel: "9 months (approx. 270 days)",
    unitLabel: "24 charging sites",
    vendor: "Voltway Infrastructure",
  },
};

/** Facts for a template slug; falls back to the Digital Care Records rollout. */
export function factsFor(slug?: string | null): ProjectFacts {
  return (slug && PROJECT_FACTS_BY_SLUG[slug]) || DCR;
}

/** Kept for existing imports that assume the Digital Care Records rollout. */
export const PROJECT_FACTS = DCR;

export const TOTAL_BUDGET = PROJECT_FACTS.totalBudget;

export function formatMoneyGBP(n: number, currency = PROJECT_FACTS.currency): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * A prompt block listing the only figures an in-character reply may quote.
 */
export function projectFactsPrompt(opts?: {
  spent?: number | null;
  forecast?: number | null;
  slug?: string | null;
}): string {
  const f = factsFor(opts?.slug);
  const money = (n: number) => formatMoneyGBP(n, f.currency);
  const lines = [
    `Approved total budget: ${money(f.totalBudget)} (${f.totalBudget.toLocaleString("en-GB")} ${f.currency}). The project is funded and reported in ${f.currency} — never in any other currency.`,
    `Timeline: ${f.timelineLabel}.`,
    f.unitLabel ? `Delivery footprint: ${f.unitLabel}.` : "",
    f.vendor ? `Principal vendor: ${f.vendor}.` : "",
  ];
  if (typeof opts?.spent === "number") {
    lines.push(`Spent / invoiced to date: ${money(opts.spent)}.`);
  }
  if (typeof opts?.forecast === "number") {
    lines.push(`Forecast still to come: ${money(opts.forecast)}.`);
  }
  lines.push(
    `Remaining envelope: ${money(f.totalBudget - (opts?.spent ?? 0) - (opts?.forecast ?? 0))}.`,
  );
  lines.push(
    "HARD RULE: these are the only project figures that exist. Never invent, round differently, convert, or quote any other amount, currency, timeline or site count. Never leave a bracketed placeholder such as [Name] or [Coordinator's Name] in the text. If you do not know a number, say where the coordinator can confirm it instead of guessing.",
  );
  return lines.filter(Boolean).join("\n");
}
