import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich } from "@/lib/tasks.functions";
import { listChapters } from "@/lib/chapters.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, AlertTriangle, Sparkles } from "lucide-react";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive-foreground border-destructive/40",
  high: "bg-accent-orange/20 text-accent-orange-foreground border-accent-orange/40",
  medium: "bg-white/10 text-white/90 border-white/20",
  low: "bg-white/5 text-white/70 border-white/15",
};

// "Continue where you left off"
// Priority: an in_progress task if any, else the top result from listWhatsNext.
// Reads live data — no placeholder/seed rows.
export function ContinueCard() {
  const fetchTasks = useServerFn(listTasksRich);
  const fetchChapters = useServerFn(listChapters);

  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });
  const { data: chapters } = useQuery({ queryKey: ["chapters"], queryFn: () => fetchChapters() });

  // Canonical status buckets — must match task-board / task-summary-strip.
  const DONE = ["done", "approved", "completed", "closed"];
  const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const rows = tasks ?? [];

  const doneTasks = rows.filter((t) => DONE.includes(t.status));
  const inProgress = rows.find((t) => t.status === "in_progress");
  const readyTodo = rows
    .filter((t) => t.status === "todo")
    .sort((a, b) => {
      const pr = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      if (pr !== 0) return pr;
      const ad = a.due_at ? +new Date(a.due_at) : Infinity;
      const bd = b.due_at ? +new Date(b.due_at) : Infinity;
      return ad - bd;
    });
  const pendingReview = rows.find((t) => t.status === "submitted");
  const primary = inProgress ?? readyTodo[0] ?? pendingReview ?? null;

  // Progress reflects the actual task list — the same dataset the board uses.
  const total = rows.length;
  const completed = doneTasks.length;
  const remaining = Math.max(0, total - completed);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && remaining === 0;

  const activeChapter = chapters?.chapters.find((c) => c.status === "active");
  const lastCompleteChapter = [...(chapters?.chapters ?? [])]
    .reverse()
    .find((c) => c.status === "complete");
  const isResume = !!inProgress;
  const label = isResume
    ? "Resume where you left off"
    : allDone
      ? "Milestone ready"
      : "Recommended next step";
  const route = primary?.linked_module_route ?? "/app/tasks";

  const criticalOverdue = rows.some(
    (t) =>
      t.priority === "critical" &&
      t.due_at &&
      +new Date(t.due_at) < Date.now() &&
      !DONE.includes(t.status),
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-navy/30 bg-navy p-6 text-navy-foreground shadow-lg md:p-8">
      {/* soft decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-orange/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl"
      />
      <div className="relative flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
        {isResume ? <Play className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {label}
      </div>

      {tasksLoading ? (
        <div className="relative mt-4 h-40 animate-pulse rounded-md border border-white/10 bg-white/5" />
      ) : primary ? (
        <>
          <div className="relative mt-3 flex flex-wrap items-center gap-2">
            {primary.category && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/80">
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
              <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/70">
                Ch. {activeChapter.chapter_number}
              </span>
            )}
          </div>

          <h2 className="relative mt-3 font-display text-2xl font-semibold leading-tight text-white md:text-3xl">
            {primary.title}
          </h2>
          {primary.completion_action && (
            <p className="relative mt-2 max-w-2xl text-sm text-white/70 md:text-base">
              → {primary.completion_action}
            </p>
          )}

          {/* Orange progress bar — bar reflects completed / required. */}
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
              <span className="font-medium text-white/85">
                {remaining === 1 ? "1 task remaining" : `${remaining} tasks remaining`}
              </span>
              <span className="text-white/60">
                {completed} of {total} completed
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10 progress-smooth">
              <div
                className="h-full rounded-full bg-accent-orange"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-4">
            {primary.linked_stakeholder ? (
              <div className="text-sm text-white/70">
                <span className="text-[11px] uppercase tracking-wider text-white/50">For</span>
                <span className="ml-2 font-medium text-white">{primary.linked_stakeholder}</span>
              </div>
            ) : (
              <span />
            )}
            <Button
              asChild
              size="lg"
              className="hover-lift shrink-0 bg-white px-7 py-6 text-base font-semibold text-navy shadow-md ring-1 ring-black/5 hover:bg-white active:translate-y-0"
            >
              <Link to={route}>
                {isResume ? <Play className="mr-2 h-5 w-5 fill-navy text-navy" /> : <ArrowRight className="mr-2 h-5 w-5 text-navy" />}
                {isResume ? "Resume task" : "Start task"}
                <ArrowRight className="ml-2 h-5 w-5 text-navy" />
              </Link>
            </Button>
          </div>

          {criticalOverdue && (
            <div className="relative mt-5 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/20 p-2.5 text-xs text-white">
              <AlertTriangle className="h-3.5 w-3.5" />
              A critical task is overdue. Handle it before advancing time.
            </div>
          )}
        </>
      ) : allDone ? (
        <div className="relative mt-4 rounded-md border border-white/20 bg-white/5 p-6 text-center text-sm text-white/85">
          {activeChapter ? (
            <>
              <div className="font-display text-lg text-white">
                Chapter {activeChapter.chapter_number} ready to close
              </div>
              <p className="mt-1 text-white/70">
                All {total} tasks completed. Advance time to move to the next chapter.
              </p>
            </>
          ) : lastCompleteChapter ? (
            <>
              <div className="font-display text-lg text-white">
                Chapter {lastCompleteChapter.chapter_number} complete
              </div>
              <p className="mt-1 text-white/70">Continue to the next milestone.</p>
            </>
          ) : (
            <>All {total} tasks completed. Continue to the next milestone.</>
          )}
        </div>
      ) : (
        <div className="relative mt-4 rounded-md border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
          No open tasks. Summon a stakeholder email or advance time to generate work.
        </div>
      )}
    </section>
  );
}