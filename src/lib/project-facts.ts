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
  // Matches the Project Initiation Pack ("12 weeks").
  durationDays: 84,
  timelineLabel: "12 weeks",
  unitLabel: "",
  vendor: "CareSoft",
};

export const PROJECT_FACTS_BY_SLUG: Record<string, ProjectFacts> = {
  "digital-care-records": DCR,
  "crm-implementation": {
    slug: "crm-implementation",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 850_000,
    durationDays: 84,
    timelineLabel: "12 weeks",
    unitLabel: "",
    vendor: "Helio CRM",
  },
  "website-redesign": {
    slug: "website-redesign",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 320_000,
    durationDays: 84,
    timelineLabel: "12 weeks",
    unitLabel: "",
    vendor: "Northgate Digital",
  },
  "office-relocation": {
    slug: "office-relocation",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 1_650_000,
    durationDays: 84,
    timelineLabel: "12 weeks",
    unitLabel: "",
    vendor: "Meridian Workplace",
  },
  "new-product-launch": {
    slug: "new-product-launch",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 950_000,
    durationDays: 84,
    timelineLabel: "12 weeks",
    unitLabel: "",
    vendor: "Brightline Agency",
  },
  "ev-charging-network": {
    slug: "ev-charging-network",
    currency: "GBP",
    currencySymbol: "£",
    totalBudget: 4_200_000,
    durationDays: 84,
    timelineLabel: "12 weeks",
    unitLabel: "",
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
