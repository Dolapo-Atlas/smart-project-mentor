import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich, listWhatsNext } from "@/lib/tasks.functions";
import { listChapters } from "@/lib/chapters.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, AlertTriangle, Sparkles } from "lucide-react";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

// "Continue where you left off"
// Priority: an in_progress task if any, else the top result from listWhatsNext.
// Reads live data — no placeholder/seed rows.
export function ContinueCard() {
  const fetchTasks = useServerFn(listTasksRich);
  const fetchNext = useServerFn(listWhatsNext);
  const fetchChapters = useServerFn(listChapters);

  const { data: tasks } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });
  const { data: next } = useQuery({ queryKey: ["whats-next"], queryFn: () => fetchNext() });
  const { data: chapters } = useQuery({ queryKey: ["chapters"], queryFn: () => fetchChapters() });

  const inProgress = (tasks ?? []).find((t) => t.status === "in_progress");
  const suggestion = next?.tasks?.[0];
  const primary = inProgress ?? suggestion ?? null;

  // Actions remaining in the current chapter (option b): required completed
  // tasks for the active chapter minus what's already done.
  const activeChapter = chapters?.chapters.find((c) => c.status === "active");
  const chapterNumber = activeChapter?.chapter_number ?? 1;
  const required = Math.max(2, chapterNumber * 2);
  const doneCount = (tasks ?? []).filter((t) =>
    ["done", "approved", "completed", "closed"].includes(t.status),
  ).length;
  const remaining = Math.max(0, required - doneCount);

  const isResume = !!inProgress;
  const label = isResume ? "Resume where you left off" : "Recommended next step";
  const route = primary?.linked_module_route ?? "/app/tasks";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {isResume ? <Play className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {label}
      </div>

      {primary ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {primary.category && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {primary.category}
              </span>
            )}
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                PRIORITY_STYLE[primary.priority] ?? PRIORITY_STYLE.medium
              }`}
            >
              {primary.priority}
            </span>
            {activeChapter && (
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Ch. {activeChapter.chapter_number}
              </span>
            )}
          </div>

          <h2 className="mt-3 font-display text-2xl font-semibold leading-tight md:text-3xl">
            {primary.title}
          </h2>
          {primary.completion_action && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              → {primary.completion_action}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <div className="text-[11px] uppercase tracking-wider">Actions remaining</div>
                <div className="mt-0.5 font-display text-xl font-medium text-foreground">
                  {remaining}
                  <span className="ml-1 text-xs text-muted-foreground">of {required}</span>
                </div>
              </div>
              {primary.linked_stakeholder && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider">For</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">
                    {primary.linked_stakeholder}
                  </div>
                </div>
              )}
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to={route}>
                {isResume ? "Resume task" : "Start task"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {next?.criticalOverdue && (
            <div className="mt-5 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              A critical task is overdue. Handle it before advancing time.
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
          No open tasks. Summon a stakeholder email or advance time to generate work.
        </div>
      )}
    </section>
  );
}