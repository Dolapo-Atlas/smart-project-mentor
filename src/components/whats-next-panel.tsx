import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listWhatsNext } from "@/lib/tasks.functions";
import { ArrowRight, Sparkles, AlertTriangle } from "lucide-react";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  low: "bg-muted text-muted-foreground",
};

export function WhatsNextPanel() {
  const fetchNext = useServerFn(listWhatsNext);
  const { data } = useQuery({ queryKey: ["whats-next"], queryFn: () => fetchNext() });

  if (!data) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="text-sm text-muted-foreground">Loading priorities…</div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/80">
          <Sparkles className="h-4 w-4" />
          What's next
        </div>
        <Link to="/app/tasks" className="text-xs text-primary hover:underline">
          All tasks →
        </Link>
      </div>
      {data.criticalOverdue && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          A critical task is overdue. Resolve it before advancing time.
        </div>
      )}
      <ul className="mt-3 space-y-2">
        {data.tasks.length === 0 && (
          <li className="rounded-md border border-dashed border-border bg-background p-4 text-center text-sm text-muted-foreground">
            No ready tasks. Summon a stakeholder email or advance time to generate work.
          </li>
        )}
        {data.tasks.map((t: any) => (
          <li
            key={t.id}
            className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {t.category && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.category}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium}`}
                >
                  {t.priority}
                </span>
                {t.linked_stakeholder && (
                  <span className="text-[11px] text-muted-foreground">for {t.linked_stakeholder}</span>
                )}
              </div>
              <div className="mt-1 text-sm font-medium">{t.title}</div>
              {t.completion_action && (
                <div className="text-xs text-muted-foreground">→ {t.completion_action}</div>
              )}
            </div>
            <Link
              to={t.linked_module_route ?? "/app/tasks"}
              className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Do it <ArrowRight className="h-3 w-3" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}