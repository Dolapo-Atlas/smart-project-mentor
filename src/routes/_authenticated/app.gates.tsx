import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGates, submitGate } from "@/lib/pm.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, CheckCircle2, XCircle, Gavel } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/gates")({
  component: Gates,
});

type Phase = "initiation" | "planning" | "execution" | "closure";
type Status = "locked" | "open" | "passed" | "failed";

function Gates() {
  const qc = useQueryClient();
  const fetchGates = useServerFn(listGates);
  const submitFn = useServerFn(submitGate);
  const { data: gates } = useQuery({ queryKey: ["gates"], queryFn: () => fetchGates() });

  const [defence, setDefence] = useState("");
  const [submittingFor, setSubmittingFor] = useState<Phase | null>(null);

  const submit = useMutation({
    mutationFn: (phase: Phase) => submitFn({ data: { phase, defence } }),
    onSuccess: (_d, phase) => {
      qc.invalidateQueries({ queryKey: ["gates"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setDefence(""); setSubmittingFor(null);
      toast.success(`${phase} gate reviewed.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Governance</div>
        <h1 className="font-display text-4xl font-medium">Phase gates</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          At the end of each phase, defend your work to the governance board (Sponsor + PMO + Finance + Clinical). They'll pass, fail with conditions, or block the next phase entirely.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {(gates ?? []).map((g) => {
          const status = g.status as Status;
          const phase = g.phase as Phase;
          const fb = g.feedback as FB | null;
          return (
            <article key={g.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <h2 className="font-display text-xl capitalize">{phase}</h2>
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
                submittingFor === phase ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={defence}
                      onChange={(e) => setDefence(e.target.value)}
                      placeholder={`Make your case for closing the ${phase} phase. Reference artefacts, RAID, status reports, key decisions, open risks. The board will be tough.`}
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
                    {status === "failed" ? "Re-submit for review" : "Submit for review"}
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