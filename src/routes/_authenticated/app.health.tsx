import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRag, upsertRag } from "@/lib/raid.functions";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/health")({
  component: HealthPage,
});

type Rag = "green" | "amber" | "red";
type Trend = "improving" | "stable" | "declining";
type Area =
  | "overall" | "scope" | "schedule" | "budget"
  | "resources" | "quality" | "benefits";

const AREAS: { key: Area; label: string; help: string }[] = [
  { key: "overall", label: "Overall RAG", help: "The headline view your Steering Committee sees first." },
  { key: "scope", label: "Scope", help: "Are deliverables and boundaries holding?" },
  { key: "schedule", label: "Schedule", help: "Will you hit your milestones?" },
  { key: "budget", label: "Budget", help: "Spend vs forecast vs approved baseline." },
  { key: "resources", label: "Resources", help: "People, vendors and capacity availability." },
  { key: "quality", label: "Quality", help: "Deliverable standards and acceptance." },
  { key: "benefits", label: "Benefits", help: "Are expected business benefits still on track?" },
];

const ragMeta: Record<Rag, { dot: string; label: string; ring: string }> = {
  green: { dot: "bg-emerald-500", label: "On track", ring: "ring-emerald-500/30" },
  amber: { dot: "bg-amber-500", label: "At risk", ring: "ring-amber-500/30" },
  red: { dot: "bg-red-500", label: "Off track", ring: "ring-red-500/30" },
};

function HealthPage() {
  const qc = useQueryClient();
  const fetchRag = useServerFn(listRag);
  const upsertRagFn = useServerFn(upsertRag);
  const { data: rag } = useQuery({ queryKey: ["rag"], queryFn: () => fetchRag() });

  const byArea: Record<string, { rag: Rag; note: string | null; trend: Trend; updated_at: string; updated_by: string | null }> = {};
  (rag ?? []).forEach((r: any) => {
    byArea[r.area] = {
      rag: r.rag as Rag,
      note: r.note,
      trend: (r.trend ?? "stable") as Trend,
      updated_at: r.updated_at,
      updated_by: r.updated_by ?? null,
    };
  });

  const setRag = useMutation({
    mutationFn: (v: { area: Area; rag: Rag; note?: string; trend?: Trend }) =>
      upsertRagFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rag"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const overall = byArea["overall"]?.rag ?? "green";

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Steering Committee view</div>
        <h1 className="font-display text-4xl font-medium">Project Health (RAG)</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Executive summary of overall project health. Update each area, explain the rating,
          and indicate the direction of travel. This is what your Sponsor and Steering Committee review.
        </p>
      </header>

      <div className={`rounded-lg border bg-card p-6 ring-4 ${ragMeta[overall].ring}`}>
        <div className="flex items-center gap-3">
          <span className={`h-4 w-4 rounded-full ${ragMeta[overall].dot}`} />
          <div className="font-display text-2xl">Overall status: <span className="capitalize">{overall}</span></div>
          <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">{ragMeta[overall].label}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {AREAS.map(({ key, label, help }) => {
          const cur = byArea[key];
          const current: Rag = cur?.rag ?? "green";
          const trend: Trend = cur?.trend ?? "stable";
          return (
            <div key={key} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${ragMeta[current].dot}`} />
                    <h3 className="font-display text-lg">{label}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{help}</p>
                </div>
                <TrendBadge trend={trend} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-1">
                {(["green", "amber", "red"] as Rag[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setRag.mutate({ area: key, rag: c, note: cur?.note ?? undefined, trend })}
                    className={`rounded-md border px-2 py-1.5 text-xs uppercase tracking-wider transition ${
                      current === c
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`mr-1 inline-block h-2 w-2 rounded-full ${ragMeta[c].dot}`} />
                    {c}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className="text-muted-foreground mr-1">Trend:</span>
                {(["improving", "stable", "declining"] as Trend[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRag.mutate({ area: key, rag: current, note: cur?.note ?? undefined, trend: t })}
                    className={`rounded-md border px-2 py-0.5 capitalize transition ${
                      trend === t ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Why is the status this colour? (e.g. 'Schedule is amber — vendor delayed integration by 2 weeks; mitigation in flight.')"
                defaultValue={cur?.note ?? ""}
                onBlur={(e) => {
                  const note = e.target.value;
                  if (note !== (cur?.note ?? "")) {
                    setRag.mutate({ area: key, rag: current, note, trend });
                  }
                }}
                className="mt-3 min-h-[64px] text-xs"
              />

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Last updated: {cur?.updated_at ? format(new Date(cur.updated_at), "d MMM yyyy, HH:mm") : "—"}</span>
                <span>By: {cur?.updated_by ?? "You"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: "improving" | "stable" | "declining" }) {
  const map = {
    improving: { icon: TrendingUp, cls: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" },
    stable: { icon: Minus, cls: "text-muted-foreground border-border bg-muted/40" },
    declining: { icon: TrendingDown, cls: "text-red-600 border-red-500/30 bg-red-500/10" },
  } as const;
  const { icon: Icon, cls } = map[trend];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>
      <Icon className="h-3 w-3" /> {trend}
    </span>
  );
}