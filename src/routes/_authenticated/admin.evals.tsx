import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { listEvalRuns, listEvalResults, runEvalSuite } from "@/lib/evals.functions";

const ADMIN_EMAILS = [
  "rasaqdolapo@gmail.com",
  "fuhad.dolapo@gmail.com",
];

export const Route = createFileRoute("/_authenticated/admin/evals")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) throw redirect({ to: "/app" });
  },
  component: EvalsAdmin,
});

function EvalsAdmin() {
  const qc = useQueryClient();
  const runs = useQuery({
    queryKey: ["eval-runs"],
    queryFn: () => listEvalRuns(),
  });
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const results = useQuery({
    queryKey: ["eval-results", openRunId],
    queryFn: () => listEvalResults({ data: { runId: openRunId! } }),
    enabled: !!openRunId,
  });

  const runFn = useServerFn(runEvalSuite);
  const run = useMutation({
    mutationFn: () => runFn(),
    onSuccess: (r) => {
      toast.success(`Eval complete — ${r.passed}/${r.total} passed · avg ${r.avgScore}`);
      qc.invalidateQueries({ queryKey: ["eval-runs"] });
      setOpenRunId(r.runId);
    },
    onError: (e: any) => toast.error(e?.message ?? "Eval run failed"),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI evaluation suite</h1>
          <p className="text-sm text-muted-foreground">
            Golden prompts scored 1-5 by an LLM judge. A case passes at score ≥ 4.
          </p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          Run suite
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (runs.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <div className="divide-y">
              {(runs.data ?? []).map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setOpenRunId(r.id)}
                  className={`flex w-full items-center justify-between py-3 text-left hover:bg-muted/40 px-2 rounded ${openRunId === r.id ? "bg-muted/60" : ""}`}
                >
                  <div>
                    <div className="text-sm font-medium">{r.suite}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.passed === r.total ? "default" : r.passed >= r.total * 0.7 ? "secondary" : "destructive"}>
                      {r.passed}/{r.total} passed
                    </Badge>
                    <span className="text-sm tabular-nums">avg {Number(r.avg_score).toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {openRunId && (
        <Card>
          <CardHeader>
            <CardTitle>Case results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading cases…</p>
            ) : (
              (results.data ?? []).map((c: any) => (
                <div key={c.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{c.category}</Badge>
                      <span className="text-sm font-medium">{c.case_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.passed ? "default" : "destructive"}>
                        {c.passed ? "PASS" : "FAIL"}
                      </Badge>
                      <span className="text-sm tabular-nums">{c.score}/5</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground"><b>Prompt:</b> {c.prompt}</p>
                  <p className="text-xs text-muted-foreground"><b>Expected:</b> {c.expected}</p>
                  <pre className="whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs">{c.response}</pre>
                  {c.judge_notes && (
                    <p className="text-xs"><b>Judge:</b> {c.judge_notes}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}