import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLearnerTracking } from "@/lib/analytics.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tracking")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: row } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!row) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Learner tracking | Atlas admin" },
      { name: "description", content: "See how far each Atlas learner progressed and where they dropped off." },
      { property: "og:title", content: "Learner tracking | Atlas admin" },
      { property: "og:description", content: "Funnel and per-learner progress tracking for the Atlas simulation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminTracking,
});

function stageTone(stage: string) {
  if (stage.startsWith("Completed")) return "bg-emerald-100 text-emerald-800";
  if (stage.startsWith("Working")) return "bg-amber-100 text-amber-900";
  if (stage === "Signed up") return "bg-muted text-muted-foreground";
  return "bg-orange-100 text-orange-900";
}

function humanGap(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

const RANGES = [
  { label: "All time", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
] as const;

function AdminTracking() {
  const fetchTracking = useServerFn(getLearnerTracking);
  const [source, setSource] = useState("all");
  const [sinceDays, setSinceDays] = useState(0);
  const q = useQuery({
    queryKey: ["admin-tracking", source, sinceDays],
    queryFn: () => fetchTracking({ data: { source, sinceDays } }),
    refetchInterval: 60_000,
  });

  if (q.isLoading || !q.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { rows, funnel, byPhase, stalled, recordedFunnel, biggestDrop, availableSources, trackedLearners } =
    q.data;
  const top = funnel[0]?.value || 1;
  const recordedTop = recordedFunnel[0]?.value || 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium">Learner tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where every learner stopped. Refreshes every minute.
          </p>
        </div>
        <Link to="/admin/analytics" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Overview analytics →
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Learners
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Completed ≥1 task
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {rows.filter((r) => r.tasksDone > 0).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stalled &gt; 3 days
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stalled}</CardContent>
        </Card>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-medium">First-session drop-off (recorded)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Built from actual recorded steps. {trackedLearners} learner
              {trackedLearners === 1 ? "" : "s"} tracked. "Gap" is the median time from the step above.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Traffic source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All sources</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              aria-label="Date range"
              value={sinceDays}
              onChange={(e) => setSinceDays(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {RANGES.map((r) => (
                <option key={r.days} value={r.days}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {trackedLearners === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No steps recorded yet. This fills in as learners sign in and move through their first session.
          </p>
        ) : (
          <>
            {biggestDrop && (
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                Biggest leak: <strong>{biggestDrop.lost}</strong> learners ({biggestDrop.pct}%) stop between
                “{biggestDrop.from}” and “{biggestDrop.to}”.
              </div>
            )}
            <div className="mt-4 space-y-3">
              {recordedFunnel.map((f, i) => {
                const prev = i > 0 ? recordedFunnel[i - 1] : null;
                const lostPct =
                  prev && prev.value > 0 ? Math.round(((prev.value - f.value) / prev.value) * 100) : 0;
                return (
                  <div key={f.event}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span>{f.label}</span>
                      <span className="text-muted-foreground">
                        {f.value} · {Math.round((f.value / recordedTop) * 100)}%
                        {prev ? ` · −${lostPct}%` : ""}
                        {prev ? ` · gap ${humanGap(f.medianGapSeconds)}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(2, (f.value / recordedTop) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Drop-off funnel (inferred)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reconstructed from saved work. Useful for learners who signed up before tracking started.
          </p>
          <div className="mt-4 space-y-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="text-muted-foreground">
                    {f.value} · {Math.round((f.value / top) * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(2, (f.value / top) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Current phase spread</h2>
          <div className="mt-4 space-y-3">
            {byPhase.map((p) => (
              <div key={p.phase}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{p.phase}</span>
                  <span className="text-muted-foreground">{p.value}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-accent-orange transition-all"
                    style={{ width: `${Math.max(2, (p.value / Math.max(1, rows.length)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium">Per-learner progress</h2>
          <p className="text-xs text-muted-foreground">Sorted by most recent activity</p>
        </div>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Stopped at</th>
              <th className="px-4 py-3">Last recorded step</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Tasks</th>
              <th className="px-4 py-3">Docs</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stageTone(r.stage)}`}>
                    {r.stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.lastStep ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.phase ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.tasksDone}/{r.tasksTotal}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.documents}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.attempts}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  No learners yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">Tip</Badge>
        <span>
          Read the recorded funnel first. A long gap before a step means confusion; a big drop means the step
          itself is the problem.
        </span>
      </div>
    </div>
  );
}