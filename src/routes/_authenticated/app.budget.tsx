import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { TaskContextPanel } from "@/components/mentor/task-context-panel";
import { BudgetBriefing } from "@/components/dashboard/budget-briefing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBudget, addBudgetLine, deleteBudgetLine, seedBudgetIfEmpty } from "@/lib/pm.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const budgetSearchSchema = z.object({ task: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/app/budget")({
  validateSearch: budgetSearchSchema,
  component: Budget,
});

const TOTAL_BUDGET = 500_000;

const kindStyle: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  actual: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  invoice: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  forecast: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function Budget() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/app/budget" });
  const fetchLines = useServerFn(listBudget);
  const seed = useServerFn(seedBudgetIfEmpty);
  const addFn = useServerFn(addBudgetLine);
  const delFn = useServerFn(deleteBudgetLine);

  const { data: lines } = useQuery({ queryKey: ["budget"], queryFn: () => fetchLines() });

  useEffect(() => {
    seed().then((r) => { if (r.seeded) qc.invalidateQueries({ queryKey: ["budget"] }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planned = (lines ?? []).filter((l) => l.kind === "planned").reduce((s, l) => s + Number(l.amount), 0);
  const spent = (lines ?? []).filter((l) => l.kind === "actual" || l.kind === "invoice").reduce((s, l) => s + Number(l.amount), 0);
  const forecast = (lines ?? []).filter((l) => l.kind === "forecast").reduce((s, l) => s + Number(l.amount), 0);
  const remaining = TOTAL_BUDGET - spent - forecast;
  const burnPct = Math.min(100, Math.round(((spent + forecast) / TOTAL_BUDGET) * 100));

  // Group by category
  const byCategory: Record<string, { planned: number; spent: number; forecast: number }> = {};
  (lines ?? []).forEach((l) => {
    const c = byCategory[l.category] ?? { planned: 0, spent: 0, forecast: 0 };
    if (l.kind === "planned") c.planned += Number(l.amount);
    else if (l.kind === "forecast") c.forecast += Number(l.amount);
    else c.spent += Number(l.amount);
    byCategory[l.category] = c;
  });

  const [form, setForm] = useState({
    category: "Implementation",
    description: "",
    amount: "",
    kind: "actual" as "planned" | "actual" | "invoice" | "forecast",
    vendor: "",
  });

  const add = useMutation({
    mutationFn: () => addFn({ data: {
      category: form.category,
      description: form.description || undefined,
      amount: parseFloat(form.amount),
      kind: form.kind,
      vendor: form.vendor || undefined,
    } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget"] });
      qc.invalidateQueries({ queryKey: ["budget-briefing"] });
      qc.invalidateQueries({ queryKey: ["reporting-pack"] });
      setForm({ ...form, description: "", amount: "", vendor: "" });
      toast.success("Posted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget"] });
      qc.invalidateQueries({ queryKey: ["budget-briefing"] });
      qc.invalidateQueries({ queryKey: ["reporting-pack"] });
    },
  });

  const overBudget = remaining < 0;

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Finance</div>
        <h1 className="font-display text-4xl font-medium">Budget</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          £500,000 envelope. Track planned vs actuals, log vendor invoices, forecast change-request impacts.
        </p>
      </header>

      <TaskContextPanel taskId={search.task} />

      <BudgetBriefing />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total budget" value={fmt(TOTAL_BUDGET)} />
        <Stat label="Spent / invoiced" value={fmt(spent)} sub={`${Math.round((spent / TOTAL_BUDGET) * 100)}% of envelope`} />
        <Stat label="Forecast (CRs)" value={fmt(forecast)} />
        <Stat
          label={overBudget ? "Over budget" : "Remaining"}
          value={fmt(remaining)}
          tone={overBudget ? "text-destructive" : remaining < TOTAL_BUDGET * 0.1 ? "text-amber-600" : "text-emerald-700"}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Burn</span>
          <span className="text-muted-foreground">{burnPct}% committed</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${overBudget ? "bg-destructive" : burnPct > 85 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${burnPct}%` }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">By category</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(byCategory).map(([cat, v]) => {
            const committed = v.spent + v.forecast;
            const pct = v.planned > 0 ? Math.min(100, Math.round((committed / v.planned) * 100)) : 0;
            const over = committed > v.planned;
            return (
              <div key={cat} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{cat}</div>
                  <div className={`text-sm ${over ? "text-destructive" : "text-muted-foreground"}`}>
                    {fmt(committed)} / {fmt(v.planned)}
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-xl">Post a budget entry</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="actual">Actual</option>
            <option value="invoice">Invoice</option>
            <option value="forecast">Forecast</option>
            <option value="planned">Planned</option>
          </select>
          <Input
            placeholder="Amount (£)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            placeholder="Vendor (optional)"
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
          />
          <Button onClick={() => add.mutate()} disabled={!form.amount || add.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Post
          </Button>
        </div>
        <Input
          className="mt-3"
          placeholder="Description / reference"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Ledger</h2>
        <ul className="space-y-2">
          {(lines ?? []).map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${kindStyle[l.kind]}`}>{l.kind}</span>
                  <span className="text-sm font-medium">{l.category}</span>
                  {l.vendor && <span className="text-xs text-muted-foreground">· {l.vendor}</span>}
                </div>
                {l.description && <div className="mt-0.5 text-xs text-muted-foreground">{l.description}</div>}
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{l.line_date}</div>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <div className={`text-sm font-semibold ${Number(l.amount) < 0 ? "text-emerald-700" : ""}`}>
                  {fmt(Number(l.amount))}
                </div>
                <button onClick={() => del.mutate(l.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl font-medium ${tone ?? ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}