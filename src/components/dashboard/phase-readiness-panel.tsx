import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReadiness } from "@/lib/time.functions";
import { getOverview } from "@/lib/sim.functions";
import { getPhaseProgress } from "@/lib/phase.functions";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

const PHASE_ORDER = [
  "initiation",
  "planning",
  "execution",
  "monitoring",
  "go-live",
  "closure",
] as const;

function nextOf(phase?: string) {
  const i = PHASE_ORDER.indexOf((phase ?? "initiation") as (typeof PHASE_ORDER)[number]);
  if (i < 0 || i >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[i + 1];
}

function titleCase(s: string) {
  return s.replace(/(^|[-\s])(\w)/g, (_, a, b) => a + b.toUpperCase());
}

type Row = {
  key: string;
  label: string;
  count: number;
  route: string;
  emptyLabel: string;
};

export function PhaseReadinessPanel() {
  const fetchReadiness = useServerFn(getReadiness);
  const fetchOverview = useServerFn(getOverview);
  const fetchPhase = useServerFn(getPhaseProgress);

  const { data: readiness } = useQuery({
    queryKey: ["readiness"],
    queryFn: () => fetchReadiness(),
    refetchInterval: 20000,
  });
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
  });
  const { data: phaseProgress } = useQuery({
    queryKey: ["phase-progress"],
    queryFn: () => fetchPhase(),
    refetchInterval: 20000,
  });

  const phase = (overview as any)?.state?.phase ?? "initiation";
  const next = nextOf(phase);

  const rows: Row[] = [
    {
      key: "tasks",
      label: "Open tasks",
      count: readiness?.openTasks.length ?? 0,
      route: "/app/tasks",
      emptyLabel: "All tasks handled",
    },
    {
      key: "inbox",
      label: "Unread messages",
      count: readiness?.unreadInbox.length ?? 0,
      route: "/app/inbox",
      emptyLabel: "Inbox clear",
    },
    {
      key: "docs",
      label: "Documents pending submission",
      count: readiness?.unsubmittedDocs.length ?? 0,
      route: "/app/documents",
      emptyLabel: "No documents waiting",
    },
    {
      key: "minutes",
      label: "Meetings missing minutes",
      count: readiness?.meetingsMissingMinutes.length ?? 0,
      route: "/app/meetings",
      emptyLabel: "All minutes sent",
    },
    {
      key: "risks",
      label: "High-severity RAID items",
      count: readiness?.openHighRisks.length ?? 0,
      route: "/app/raid",
      emptyLabel: "No high-severity items",
    },
    {
      key: "sentiment",
      label: "Stakeholders needing attention",
      count: readiness?.frustratedStakeholders.length ?? 0,
      route: "/app/people",
      emptyLabel: "Stakeholders on side",
    },
  ];

  const blockers = readiness?.blockerCount ?? 0;
  const ready = blockers === 0;
  const totalDone = rows.filter((r) => r.count === 0).length;
  const pct = Math.round((totalDone / rows.length) * 100);

  const deliverables = phaseProgress?.overall ?? 0;
  const deliverablesDone = deliverables >= 100;
  const deliverableHint = (phaseProgress?.items ?? [])
    .filter((it) => it.pct < 100)
    .slice(0, 2)
    .map((it) => it.label)
    .join(" · ");

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      aria-label="Phase readiness"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Phase readiness
          </div>
          <h2 className="mt-1 font-display text-lg font-medium tracking-tight">
            {ready ? (
              <>Ready to advance {next ? `to ${titleCase(next)}` : ""}</>
            ) : (
              <>
                {blockers} {blockers === 1 ? "item" : "items"} to clear before{" "}
                {next ? titleCase(next) : "closure"}
              </>
            )}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Currently in <span className="font-medium text-foreground">{titleCase(phase)}</span>. Clear the checklist below, then run{" "}
            {phase === "go-live" || phase === "closure" ? "Go Live" : "Steering Committee"} from the time controls to move forward.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Cleared
          </div>
          <div className="tabular-nums font-display text-2xl">
            {totalDone}<span className="text-muted-foreground">/{rows.length}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            ready ? "bg-emerald-500" : "bg-accent-orange"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Phase deliverables
            </div>
            <div className="mt-0.5 truncate text-sm">
              {deliverablesDone ? (
                <span className="font-medium text-emerald-700">All {titleCase(phase)} deliverables complete</span>
              ) : deliverableHint ? (
                <span className="text-muted-foreground">Still to build: <span className="font-medium text-foreground">{deliverableHint}</span></span>
              ) : (
                <span className="text-muted-foreground">Live progress across {titleCase(phase)} modules</span>
              )}
            </div>
          </div>
          <div className="shrink-0 tabular-nums font-display text-lg">{deliverables}%</div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              deliverablesDone ? "bg-emerald-500" : "bg-accent-orange"
            }`}
            style={{ width: `${deliverables}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The readiness checklist shows time-advance blockers. This bar shows how much of the phase you've actually built — matches the sidebar.
        </p>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => {
          const done = r.count === 0;
          return (
            <li key={r.key}>
              <Link
                to={r.route}
                className={`group flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition ${
                  done
                    ? "border-emerald-200/70 bg-emerald-50/60 hover:bg-emerald-50"
                    : "border-border bg-background hover:border-foreground/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-accent-orange" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.label}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {done ? r.emptyLabel : `${r.count} to resolve`}
                    </div>
                  </div>
                </div>
                {!done && (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {ready && next && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          You're clear to move into <span className="font-semibold">{titleCase(next)}</span>. Use{" "}
          <span className="font-semibold">
            {phase === "monitoring" || phase === "go-live" ? "Go Live" : "Steering Committee"}
          </span>{" "}
          in the time controls above.
        </div>
      )}
    </section>
  );
}