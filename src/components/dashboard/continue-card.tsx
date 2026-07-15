import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich, listWhatsNext } from "@/lib/tasks.functions";
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

      {primary ? (
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

          {/* Orange progress bar */}
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
              <span>Actions remaining</span>
              <span className="font-medium text-white/80">
                {remaining} <span className="text-white/50">of {required}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent-orange transition-all"
                style={{
                  width: `${required > 0 ? Math.min(100, Math.max(4, ((required - remaining) / required) * 100)) : 0}%`,
                }}
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
              className="shrink-0 bg-white text-navy shadow-sm hover:bg-white/90"
            >
              <Link to={route}>
                {isResume ? "Resume task" : "Start task"}
                <ArrowRight className="ml-2 h-4 w-4 text-navy" />
              </Link>
            </Button>
          </div>

          {next?.criticalOverdue && (
            <div className="relative mt-5 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/20 p-2.5 text-xs text-white">
              <AlertTriangle className="h-3.5 w-3.5" />
              A critical task is overdue. Handle it before advancing time.
            </div>
          )}
        </>
      ) : (
        <div className="relative mt-4 rounded-md border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
          No open tasks. Summon a stakeholder email or advance time to generate work.
        </div>
      )}
    </section>
  );
}