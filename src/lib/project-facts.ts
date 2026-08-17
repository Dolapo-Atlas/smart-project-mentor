/**
 * Canonical, single source of truth for hard project facts that stakeholders,
 * the mentor and the UI must all quote identically. AI prompts receive these
 * verbatim so a stakeholder can never invent a different budget or currency.
 */
export const PROJECT_FACTS = {
  currency: "GBP",
  currencySymbol: "£",
  /** Approved total budget envelope for the simulation. */
  totalBudget: 1_200_000,
  durationDays: 120,
} as const;

export const TOTAL_BUDGET = PROJECT_FACTS.totalBudget;

export function formatMoneyGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: PROJECT_FACTS.currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * A prompt block listing the only figures an in-character reply may quote.
 */
export function projectFactsPrompt(opts?: {
  spent?: number | null;
  forecast?: number | null;
}): string {
  const lines = [
    `Approved total budget: ${formatMoneyGBP(PROJECT_FACTS.totalBudget)} (${PROJECT_FACTS.totalBudget.toLocaleString("en-GB")} GBP). The project is funded and reported in pounds sterling — never in USD, EUR, NGN or any other currency.`,
  ];
  if (typeof opts?.spent === "number") {
    lines.push(`Spent / invoiced to date: ${formatMoneyGBP(opts.spent)}.`);
  }
  if (typeof opts?.forecast === "number") {
    lines.push(`Forecast still to come: ${formatMoneyGBP(opts.forecast)}.`);
  }
  lines.push(
    `Remaining envelope: ${formatMoneyGBP(
      PROJECT_FACTS.totalBudget - (opts?.spent ?? 0) - (opts?.forecast ?? 0),
    )}.`,
  );
  lines.push(
    "HARD RULE: these are the only budget figures that exist. Never invent, round differently, convert, or quote any other amount or currency. If you do not know a number, say where the coordinator can confirm it instead of guessing.",
  );
  return lines.join("\n");
}
