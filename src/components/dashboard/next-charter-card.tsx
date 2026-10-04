import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich } from "@/lib/tasks.functions";
import { nudgeStalledCharter } from "@/lib/first-run.functions";
import { useFirstEmailGate } from "@/lib/use-first-email-gate";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, FileText } from "lucide-react";

const DONE = ["submitted", "done", "approved", "completed", "closed"];

/**
 * Single clear next step after the first email reply: start the charter in
 * the step-by-step builder. Once the charter is under way it switches to a
 * short hint about moving the clock forward.
 */
export function NextCharterCard() {
  const { replied, gate } = useFirstEmailGate();
  const fetchTasks = useServerFn(listTasksRich);
  const nudge = useServerFn(nudgeStalledCharter);
  const qc = useQueryClient();
  const { data: tasks } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });

  const initiation = String(gate?.phase ?? "initiation").startsWith("init");
  const rows = tasks ?? [];
  const charterTask = rows.find((t) => /charter/i.test(String(t.title ?? "")));
  const charterDone = charterTask ? DONE.includes(charterTask.status) : false;
  const anyDone = rows.some((t) => DONE.includes(t.status));

  useEffect(() => {
    if (!replied || !initiation || charterDone) return;
    nudge()
      .then((r: any) => {
        if (r?.sent) qc.invalidateQueries({ queryKey: ["inbox"] });
      })
      .catch(() => {});
  }, [replied, initiation, charterDone, nudge, qc]);

  if (!replied || !initiation || !gate?.instanceId) return null;

  if (!charterDone) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <FileText className="h-3.5 w-3.5" /> Your next step
        </div>
        <h2 className="mt-2 font-display text-xl font-medium tracking-tight sm:text-2xl">
          Draft your Project Charter
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Start with just the first section: what problem this project solves and why now.
          Two or three sentences is enough. Everything saves as you go.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-4"
          onClick={() => {
            try {
              window.localStorage.setItem("atlas.charter-mode", "guided");
            } catch {
              /* ignore */
            }
          }}
        >
          <Link to="/app/charter">
            Start the first section <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (!anyDone) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Done for today?</span> Use the time
        controls at the top to move to the next day. New emails, updates and reactions to
        your work arrive as the days go by.
      </p>
    </div>
  );
}
