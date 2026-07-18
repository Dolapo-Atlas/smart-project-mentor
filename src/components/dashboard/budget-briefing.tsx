import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getBudgetBriefing } from "@/lib/pm.functions";
import { AlertTriangle, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Live budget briefing shown at the top of /app/budget. Grounds the user in
 * the current financial picture so budget tasks aren't approached from a
 * blank canvas.
 */
export function BudgetBriefing() {
  const fetchBriefing = useServerFn(getBudgetBriefing);
  const { data } = useQuery({
    queryKey: ["budget-briefing"],
    queryFn: () => fetchBriefing(),
  });
  if (!data) return null;
  const { baseline, actual, forecast, eac, variance, contingency, recent, open_task, project } = data;
  const over = variance > 0;
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" /> Financial situation — {project}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Row label="Approved baseline" value={fmt(baseline)} />
        <Row label="Actual spend" value={fmt(actual)} />
        <Row label="Forecast (CRs)" value={fmt(forecast)} />
        <Row label="Forecast at completion (EAC)" value={fmt(eac)} strong />
        <Row
          label="Variance"
          value={`${over ? "+" : ""}${fmt(variance)}`}
          tone={over ? "text-destructive" : variance < 0 ? "text-emerald-700" : ""}
        />
        <Row label="Contingency remaining" value={fmt(contingency)} />
      </div>

      {open_task && (
        <div className="mt-4 rounded-md border border-accent-orange/30 bg-accent-orange/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-orange">
            <AlertTriangle className="h-3 w-3" /> Your task
          </div>
          <div className="mt-1 text-sm font-medium">{open_task.title}</div>
          {open_task.completion_action && (
            <div className="mt-0.5 text-xs text-muted-foreground">→ {open_task.completion_action}</div>
          )}
          <Link
            to="/app/budget"
            search={{ task: open_task.id }}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent-orange hover:underline"
          >
            Open with task context <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Recent entries
          </div>
          <ul className="space-y-1 text-xs">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-2 py-1">
                <span className="truncate">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.kind}</span>{" "}
                  {r.category}
                  {r.vendor ? ` · ${r.vendor}` : ""}
                </span>
                <span className="tabular-nums">{fmt(Number(r.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${strong ? "font-display text-lg" : "text-sm font-medium"} tabular-nums ${tone ?? ""}`}>
        {value}
      </div>
    </div>
  );
}