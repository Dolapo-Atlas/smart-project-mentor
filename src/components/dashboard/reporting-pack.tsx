import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReportingPack } from "@/lib/pm.functions";
import { FileText, CheckCircle2, AlertTriangle, GitBranch, MessageSquareWarning, Wallet } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

/**
 * Evidence pack shown above the status-report form. The user interprets this
 * evidence to write their own report — Atlas does NOT auto-write the report.
 */
export function ReportingPack() {
  const fetchPack = useServerFn(getReportingPack);
  const { data: pack } = useQuery({
    queryKey: ["reporting-pack"],
    queryFn: () => fetchPack(),
  });
  if (!pack) return null;
  const overBudget = pack.budget.variance > 0;
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Reporting pack — week of {pack.week_start}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Evidence for you to interpret. Use it to write the report yourself — do not paste it verbatim.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Panel icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />} title={`Completed this week (${pack.completed_this_week.length})`}>
          {pack.completed_this_week.length === 0 ? (
            <Empty>No completions logged this week.</Empty>
          ) : (
            <ul className="space-y-1 text-xs">
              {pack.completed_this_week.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />} title={`Open tasks (${pack.open_tasks_count})`}>
          {pack.top_open_tasks.length === 0 ? (
            <Empty>Nothing outstanding.</Empty>
          ) : (
            <ul className="space-y-1 text-xs">
              {pack.top_open_tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600" />} title={`Active RAID (${pack.raid.length})`}>
          {pack.raid.length === 0 ? (
            <Empty>No active RAID items.</Empty>
          ) : (
            <ul className="space-y-1 text-xs">
              {pack.raid.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.kind}</span> {r.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={<GitBranch className="h-3.5 w-3.5 text-purple-600" />} title={`Change requests (${pack.change_requests.length})`}>
          {pack.change_requests.length === 0 ? (
            <Empty>No active CRs.</Empty>
          ) : (
            <ul className="space-y-1 text-xs">
              {pack.change_requests.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.status} · {fmt(Number(c.cost_impact))} · {c.schedule_impact_days}d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={<Wallet className="h-3.5 w-3.5 text-blue-600" />} title="Budget position">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Kv k="Baseline" v={fmt(pack.budget.baseline)} />
            <Kv k="Spent" v={fmt(pack.budget.spent)} />
            <Kv k="Forecast" v={fmt(pack.budget.forecast)} />
            <Kv k="EAC" v={fmt(pack.budget.eac)} strong />
            <div className="col-span-2 mt-1 text-[11px]">
              Variance:{" "}
              <span className={overBudget ? "text-destructive font-semibold" : "text-emerald-700 font-semibold"}>
                {overBudget ? "+" : ""}{fmt(pack.budget.variance)}
              </span>
            </div>
          </div>
        </Panel>

        <Panel icon={<MessageSquareWarning className="h-3.5 w-3.5 text-orange-600" />} title={`Stakeholder concerns (${pack.concerns.length})`}>
          {pack.concerns.length === 0 ? (
            <Empty>No unresolved concerns.</Empty>
          ) : (
            <ul className="space-y-1 text-xs">
              {pack.concerns.map((c, i) => (
                <li key={i}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.tone}</span>{" "}
                  <span className="font-medium">{c.sender_name}:</span> {c.subject}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] italic text-muted-foreground">{children}</div>;
}
function Kv({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="rounded border border-border/60 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{v}</div>
    </div>
  );
}