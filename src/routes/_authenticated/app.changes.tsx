import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChangeRequests, generateChangeRequest, decideChangeRequest } from "@/lib/pm.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/changes")({
  component: Changes,
});

const riskStyle: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
};
const statusStyle: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-700",
  approved: "bg-emerald-500/10 text-emerald-700",
  rejected: "bg-red-500/10 text-red-700",
  draft: "bg-muted text-muted-foreground",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function Changes() {
  const qc = useQueryClient();
  const fetchCRs = useServerFn(listChangeRequests);
  const genFn = useServerFn(generateChangeRequest);
  const decideFn = useServerFn(decideChangeRequest);
  const { data: crs } = useQuery({ queryKey: ["change_requests"], queryFn: () => fetchCRs() });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = crs?.find((c) => c.id === selectedId) ?? crs?.[0];

  const [assessment, setAssessment] = useState("");
  const [notes, setNotes] = useState("");

  const gen = useMutation({
    mutationFn: () => genFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change_requests"] });
      toast.success("New change request");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const decide = useMutation({
    mutationFn: (v: { decision: "approved" | "rejected" }) => decideFn({ data: { id: selected!.id, decision: v.decision, impact_assessment: assessment, decision_notes: notes || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change_requests"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["budget"] });
      setAssessment(""); setNotes("");
      toast.success("Decision recorded.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Governance</div>
          <h1 className="font-display text-4xl font-medium">Change requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Stakeholders raise CRs. You write an impact assessment (cost / schedule / risk) and approve or reject.
            Approved CRs post to the budget automatically.
          </p>
        </div>
        <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
          <Sparkles className="mr-2 h-4 w-4" /> {gen.isPending ? "Drafting…" : "Receive a new CR"}
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ul className="space-y-2">
          {(crs ?? []).length === 0 && (
            <li className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No change requests yet.
            </li>
          )}
          {crs?.map((c) => {
            const active = selected?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-md border p-4 text-left ${active ? "border-foreground bg-card" : "border-border bg-card/60 hover:bg-card"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusStyle[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">From {c.requested_by}</div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className={Number(c.cost_impact) < 0 ? "text-emerald-700" : "text-foreground"}>{fmt(Number(c.cost_impact))}</span>
                    <span className="text-muted-foreground">{c.schedule_impact_days >= 0 ? "+" : ""}{c.schedule_impact_days}d</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <article className="min-h-[400px] rounded-lg border border-border bg-card p-6">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    From {selected.requested_by} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-medium">{selected.title}</h2>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusStyle[selected.status]}`}>{selected.status}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Cell label="Cost impact" value={fmt(Number(selected.cost_impact))} tone={Number(selected.cost_impact) < 0 ? "text-emerald-700" : Number(selected.cost_impact) > 0 ? "text-destructive" : ""} />
                <Cell label="Schedule" value={`${selected.schedule_impact_days >= 0 ? "+" : ""}${selected.schedule_impact_days} days`} />
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Risk</div>
                  <div className="mt-1">
                    <span className={`rounded px-2 py-0.5 text-xs uppercase tracking-wider ${riskStyle[selected.risk_impact]}`}>{selected.risk_impact}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Description</div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{selected.description}</p>
              </div>

              {selected.status === "submitted" ? (
                <div className="mt-6 space-y-3 rounded-md border border-border bg-background p-4">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your impact assessment</div>
                    <Textarea
                      placeholder="Assess the impact on scope, schedule, budget, risk, and stakeholders. Be specific — this goes to the change board."
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decision notes (optional)</div>
                    <Textarea
                      placeholder="Rationale for the decision."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => decide.mutate({ decision: "rejected" })} disabled={assessment.length < 10 || decide.isPending}>
                      <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => decide.mutate({ decision: "approved" })} disabled={assessment.length < 10 || decide.isPending}>
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3 rounded-md border border-border bg-background p-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Impact assessment</div>
                    <p className="mt-1 whitespace-pre-wrap">{selected.impact_assessment ?? "—"}</p>
                  </div>
                  {selected.decision_notes && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decision notes</div>
                      <p className="mt-1 whitespace-pre-wrap">{selected.decision_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">Select a change request</div>
          )}
        </article>
      </div>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-lg font-medium ${tone ?? ""}`}>{value}</div>
    </div>
  );
}