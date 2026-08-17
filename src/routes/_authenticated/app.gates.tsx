import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGates, submitGate } from "@/lib/pm.functions";
import { getPhaseProgress } from "@/lib/phase.functions";
import { GATE_LABELS, PHASE_LABELS, type PhaseKey } from "@/lib/phases";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, CheckCircle2, XCircle, Gavel } from "lucide-react";
import { toast } from "sonner";
import { LockedModuleGate } from "@/components/dashboard/locked-module-gate";

export const Route = createFileRoute("/_authenticated/app/gates")({
  component: GatedGates,
});

type Phase = PhaseKey;
type Status = "locked" | "open" | "passed" | "failed";

function Gates() {
  const qc = useQueryClient();
  const fetchGates = useServerFn(listGates);
  const submitFn = useServerFn(submitGate);
  const fetchPhase = useServerFn(getPhaseProgress);
  const { data: gates } = useQuery({ queryKey: ["gates"], queryFn: () => fetchGates() });
  const { data: progress } = useQuery({ queryKey: ["phase-progress"], queryFn: () => fetchPhase() });

  const [defence, setDefence] = useState("");
  const [submittingFor, setSubmittingFor] = useState<Phase | null>(null);

  const submit = useMutation({
    mutationFn: (phase: Phase) => submitFn({ data: { phase, defence } }),
    onSuccess: (d, phase) => {
      if (d && (d as any).blocked) {
        toast.error((d as any).message ?? "This gate isn't ready yet.");
        qc.invalidateQueries({ queryKey: ["phase-progress"] });
        return;
      }
      qc.invalidateQueries({ queryKey: ["gates"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      setDefence(""); setSubmittingFor(null);
      const advancedTo = (d as any)?.advancedTo as PhaseKey | null | undefined;
      toast.success(
        advancedTo
          ? `${GATE_LABELS[phase]} passed — you're now in ${PHASE_LABELS[advancedTo]}.`
          : `${GATE_LABELS[phase]} reviewed.`,
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Governance</div>
        <h1 className="font-display text-4xl font-medium">Phase gates</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          At the end of each phase, defend your work to the governance board (Sponsor + PMO + Finance + Clinical). A pass moves you forward exactly one phase — nothing else changes your phase.
        </p>
      </header>

      {progress && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Before the {GATE_LABELS[progress.phase]}
          </div>
          {progress.gateReady ? (
            <p className="mt-1 text-sm">
              All {progress.phaseLabel} deliverables are in. You can defend the gate below.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm">
                {progress.outstanding.length} item{progress.outstanding.length === 1 ? "" : "s"} still
                outstanding in {progress.phaseLabel}:
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {progress.outstanding.map((it) => (
                  <li key={it.key}>
                    <Link
                      to={it.route}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:border-foreground/20 hover:bg-muted/40"
                    >
                      <span className="truncate">{it.label}</span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{it.pct}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(gates ?? []).map((g: any) => {
          const status = g.status as Status;
          const phase = g.phase as Phase;
          const fb = g.feedback as FB | null;
          const isCurrent = progress?.phase === phase;
          const blockedByChecklist = isCurrent && progress ? !progress.gateReady : false;
          return (
            <article key={g.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <h2 className="font-display text-xl">{GATE_LABELS[phase] ?? phase}</h2>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge[status]}`}>
                  {status}
                </span>
              </div>
              {g.score != null && (
                <div className="mt-2 text-sm text-muted-foreground">Score: {g.score}/100</div>
              )}

              {fb && (
                <div className="mt-4 space-y-3 rounded-md border border-border bg-background p-3 text-sm">
                  <p className="leading-snug">{fb.summary}</p>
                  {fb.strengths.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Strengths</div>
                      <ul className="mt-1 space-y-0.5 text-xs">{fb.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                  {fb.concerns.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-400">Concerns</div>
                      <ul className="mt-1 space-y-0.5 text-xs">{fb.concerns.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                  {fb.conditions.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-primary">Conditions</div>
                      <ul className="mt-1 space-y-0.5 text-xs">{fb.conditions.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {status === "locked" && (
                <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Pass the previous gate to unlock.
                </div>
              )}

              {(status === "open" || status === "failed") && (
                blockedByChecklist ? (
                  <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Finish the outstanding {progress?.phaseLabel} deliverables listed above, then defend this gate.
                  </div>
                ) : submittingFor === phase ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={defence}
                      onChange={(e) => setDefence(e.target.value)}
                      placeholder={`Make your case for closing ${PHASE_LABELS[phase]}. Reference artefacts, RAID, status reports, key decisions, open risks. The board will be tough.`}
                      className="min-h-[140px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSubmittingFor(null); setDefence(""); }}>Cancel</Button>
                      <Button size="sm" onClick={() => submit.mutate(phase)} disabled={defence.length < 20 || submit.isPending}>
                        <Gavel className="mr-2 h-4 w-4" /> Submit to board
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="mt-4 w-full" onClick={() => setSubmittingFor(phase)}>
                    {status === "failed" ? "Address concerns and defend again" : "Submit for review"}
                  </Button>
                )
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

type FB = { summary: string; strengths: string[]; concerns: string[]; conditions: string[] };

const statusBadge: Record<Status, string> = {
  locked: "bg-muted text-muted-foreground",
  open: "bg-blue-500/10 text-blue-700",
  passed: "bg-emerald-500/10 text-emerald-700",
  failed: "bg-red-500/10 text-red-700",
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "locked") return <Lock className="h-4 w-4 text-muted-foreground" />;
  if (status === "open") return <Unlock className="h-4 w-4 text-blue-600" />;
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

function GatedGates() {
  return (
    <LockedModuleGate>
      <Gates />
    </LockedModuleGate>
  );
}
