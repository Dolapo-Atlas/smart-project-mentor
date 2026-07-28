import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import { listTasksRich } from "@/lib/tasks.functions";
import { getTaskModuleLink } from "@/lib/task-module-link";
import { Button } from "@/components/ui/button";
import { Check, Circle, Compass, ArrowRight, Trophy } from "lucide-react";

const DONE = ["submitted", "done", "approved", "completed", "closed"];
const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * First-win activation panel.
 *
 * Purely presentational: it reads the existing task list and shows a tiny
 * three-step path to the learner's first completed task. It disappears for
 * good once one task has been submitted/completed, and celebrates that moment.
 */
export function FirstWinPanel({
  projectId,
  onOpenBrief,
}: {
  projectId?: string;
  onOpenBrief: () => void;
}) {
  const fetchTasks = useServerFn(listTasksRich);
  const { data: tasks, isLoading } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });

  const rows = tasks ?? [];
  const doneCount = rows.filter((t) => DONE.includes(t.status)).length;
  const started = rows.some((t) => t.status === "in_progress") || doneCount > 0;

  const briefKey = projectId ? `atlas.brief-seen.${projectId}` : null;
  const [briefSeen, setBriefSeen] = useState(false);
  useEffect(() => {
    if (!briefKey || typeof window === "undefined") return;
    setBriefSeen(window.localStorage.getItem(briefKey) === "1");
  }, [briefKey, isLoading]);

  // Celebrate the very first completed task, once per project.
  const firedRef = useRef(false);
  const [justWon, setJustWon] = useState(false);
  useEffect(() => {
    if (doneCount < 1 || firedRef.current) return;
    if (typeof window === "undefined") return;
    const key = `atlas.first-win.${projectId ?? "default"}`;
    if (window.localStorage.getItem(key) === "1") {
      firedRef.current = true;
      return;
    }
    firedRef.current = true;
    window.localStorage.setItem(key, "1");
    setJustWon(true);
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.3 },
      disableForReducedMotion: true,
    });
    const t = window.setTimeout(() => setJustWon(false), 12000);
    return () => window.clearTimeout(t);
  }, [doneCount, projectId]);

  const firstTask = [...rows]
    .filter((t) => !DONE.includes(t.status))
    .sort((a, b) => {
      const pr = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      if (pr !== 0) return pr;
      const ad = a.due_at ? +new Date(a.due_at) : Infinity;
      const bd = b.due_at ? +new Date(b.due_at) : Infinity;
      return ad - bd;
    })[0];

  if (isLoading) return null;

  if (justWon) {
    return (
      <section className="rounded-2xl border border-success/40 bg-success/10 p-5">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <h2 className="font-display text-lg font-medium">
              First task done. That’s the hardest one.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything from here is the same loop: read what’s asked, do the
              work in the module, submit it for review. Your phase progress
              updates as you go.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Once the learner has a completed task, the panel retires.
  if (doneCount > 0) return null;

  const steps = [
    {
      done: briefSeen,
      label: "Read your project brief",
      hint: "Two minutes. Who you are, what the project is, who to keep happy.",
      action: (
        <Button
          size="sm"
          variant="secondary"
          className="border border-border"
          onClick={() => {
            if (briefKey && typeof window !== "undefined") {
              window.localStorage.setItem(briefKey, "1");
              setBriefSeen(true);
            }
            onOpenBrief();
          }}
        >
          <Compass className="mr-2 h-4 w-4" />
          Open brief
        </Button>
      ),
    },
    {
      done: started,
      label: firstTask ? `Open “${firstTask.title}”` : "Open your first task",
      hint: "We’ll take you straight to the module where the work happens.",
      action: firstTask ? (
        <Button size="sm" asChild>
          <Link {...(getTaskModuleLink(firstTask) as any)}>
            Start task
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button size="sm" asChild>
          <Link to="/app/tasks">
            View tasks
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ),
    },
    {
      done: false,
      label: "Submit it for review",
      hint: "You’ll get written feedback — there’s no way to “fail” a submission.",
      action: null,
    },
  ];

  return (
    <section className="rounded-2xl border border-accent-orange/40 bg-accent-orange/5 p-5">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent-orange">
        Start here
      </div>
      <h2 className="mt-1 font-display text-xl font-medium tracking-tight">
        Three steps to your first finished task
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Most people stall before their first submission. This takes about ten
        minutes — after that, the simulation runs itself.
      </p>

      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              {s.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <div
                  className={`truncate text-sm font-medium ${
                    s.done ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {s.label}
                </div>
                <div className="text-xs text-muted-foreground">{s.hint}</div>
              </div>
            </div>
            {!s.done && s.action ? <div className="shrink-0">{s.action}</div> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}