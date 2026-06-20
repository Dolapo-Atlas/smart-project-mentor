import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview } from "@/lib/sim.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/progress")({
  component: Progress,
});

const PHASES = ["initiation", "planning", "execution", "monitoring", "closure"] as const;

const PERF_LABELS: Record<string, string> = {
  documentation: "Documentation",
  stakeholder: "Stakeholder Management",
  governance: "Governance",
  risk: "Risk Management",
  communication: "Communication",
};

type Beat = { at: string; phase: string; score: number; doc: string; beat: string };

function Progress() {
  const fetchOverview = useServerFn(getOverview);
  const { data } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const state = data?.state;
  const story = (state?.story_log as Beat[] | undefined) ?? [];
  const currentIdx = Math.max(0, PHASES.indexOf((state?.phase ?? "initiation") as (typeof PHASES)[number]));
  const perf = (state?.performance as Record<string, number> | undefined) ?? {};
  const perfEntries = Object.entries(PERF_LABELS).map(([k, label]) => ({
    key: k,
    label,
    value: perf[k] ?? 50,
  }));
  const strengths = [...perfEntries].sort((a, b) => b.value - a.value).slice(0, 2);
  const improvements = [...perfEntries].sort((a, b) => a.value - b.value).slice(0, 2);

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Performance dashboard</div>
        <h1 className="font-display text-4xl font-medium">How you're doing</h1>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Project</div>
            <div className="mt-1 font-display text-2xl font-semibold">{state?.project_name}</div>
          </div>
          <div className="flex gap-6">
            <Metric label="Progress" value={`${state?.progress ?? 0}%`} />
            <Metric label="Reputation" value={`${state?.reputation ?? 50}/100`} />
            <Metric label="Phase" value={state?.phase ?? "—"} capitalize />
          </div>
        </div>

        <div className="mt-8">
          <ol className="relative flex items-center justify-between gap-2">
            <div className="absolute left-0 right-0 top-3 -z-10 h-px bg-border" />
            {PHASES.map((p, i) => {
              const active = i <= currentIdx;
              return (
                <li key={p} className="flex flex-col items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    } text-xs font-semibold`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-xs capitalize ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {p}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">Competency scores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rolling averages from every document the AI panel reviews.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {perfEntries.map((p) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="font-display text-sm font-semibold">{p.value}/100</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${p.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Strengths
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {strengths.map((s) => (
                <li key={s.key}>• {s.label} — {s.value}/100</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Areas to improve
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {improvements.map((s) => (
                <li key={s.key}>• {s.label} — {s.value}/100</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Story beats</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each document review writes a new beat. Your reputation and progress are the cumulative
          effect of every decision so far.
        </p>

        <ol className="mt-6 space-y-4">
          {story.length === 0 && (
            <li className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No beats yet — upload and review your first document.
            </li>
          )}
          {[...story].reverse().map((b, i) => (
            <li key={i} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {format(new Date(b.at), "PPp")} · <span className="capitalize">{b.phase}</span>
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                  {b.score}/100
                </span>
              </div>
              <div className="mt-1 text-sm font-medium">{b.doc}</div>
              <blockquote className="mt-2 border-l-2 border-primary pl-4 font-display text-lg italic leading-snug">
                "{b.beat}"
              </blockquote>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({ label, value, capitalize }: { label: string; value: string | number; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${capitalize ? "capitalize" : ""}`}>{value}</div>
    </div>
  );
}