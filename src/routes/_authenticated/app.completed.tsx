import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCompletedWork } from "@/lib/tasks.functions";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/completed")({
  component: CompletedWork,
});

function CompletedWork() {
  const fetchFn = useServerFn(listCompletedWork);
  const { data: tasks } = useQuery({ queryKey: ["completed-work"], queryFn: () => fetchFn() });

  return (
    <div className="space-y-6">
      <header>
        <Link to="/app/tasks" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to tasks
        </Link>
        <h1 className="mt-2 font-display text-4xl font-medium">Completed work</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every task you have closed, with the review feedback and the impact it had on the project. This is your
          record of what you actually did as Project Coordinator.
        </p>
      </header>

      <ul className="space-y-4">
        {(tasks ?? []).length === 0 && (
          <li className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing closed yet. Submit and close a task to see it here.
          </li>
        )}
        {tasks?.map((t: any) => (
          <li key={t.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.category && <span>{t.category}</span>}
              <span>·</span>
              <span>
                {t.completed_at
                  ? formatDistanceToNow(new Date(t.completed_at), { addSuffix: true })
                  : "recently"}
              </span>
              {t.linked_stakeholder && (
                <>
                  <span>·</span>
                  <span>for {t.linked_stakeholder}</span>
                </>
              )}
            </div>
            <h2 className="mt-1 font-display text-xl font-medium">{t.title}</h2>
            {t.completion_action && (
              <div className="mt-1 text-sm text-muted-foreground">→ {t.completion_action}</div>
            )}

            {t.submission && (
              <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">What you submitted</div>
                <div className="mt-1 whitespace-pre-wrap">{t.submission}</div>
              </div>
            )}

            {t.feedback && (
              <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-semibold">{t.feedback.skill}</span>
                  <span className="text-xs">Score {t.feedback.score}/5</span>
                </div>
                <div className="mt-2"><span className="font-medium">Did well:</span> {t.feedback.did_well}</div>
                <div className="mt-1"><span className="font-medium">Improve:</span> {t.feedback.improve}</div>
                <div className="mt-2 text-xs italic text-muted-foreground">
                  In a real project: {t.feedback.real_world}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}