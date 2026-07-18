import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTaskById } from "@/lib/tasks.functions";
import { getOverview } from "@/lib/sim.functions";
import { MentorTriggerButton } from "./task-mentor";
import { AlertCircle, Flag, User2, Compass, Info } from "lucide-react";

/**
 * Reusable "why am I doing this?" panel for module pages that receive a
 * `?task=<uuid>` link from the dashboard/task board. Shows:
 *   - task title + description (why it exists)
 *   - requesting stakeholder (who)
 *   - priority + category
 *   - current project phase (context)
 *   - Mentor hint button (Socratic — never fills fields)
 *
 * Renders nothing when there is no linked task.
 */
export function TaskContextPanel({ taskId }: { taskId?: string | null }) {
  const fetchTask = useServerFn(getTaskById);
  const fetchOverview = useServerFn(getOverview);

  const taskQ = useQuery({
    queryKey: ["task-by-id", taskId ?? null],
    queryFn: () => fetchTask({ data: { id: taskId! } }),
    enabled: !!taskId,
  });
  const overviewQ = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
  });

  if (!taskId) return null;
  const task = taskQ.data as any;
  if (!task) return null;

  const phase = (overviewQ.data as any)?.state?.current_phase ?? null;
  const priorityStyle: Record<string, string> = {
    critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    high: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    low: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  };
  const pStyle = priorityStyle[task.priority] ?? priorityStyle.medium;

  return (
    <div className="rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-orange">
            <Info className="h-3 w-3" /> Why you're here
          </div>
          <div className="mt-1 font-display text-base leading-snug text-foreground">
            {task.title}
          </div>
          {task.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>
        <MentorTriggerButton
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            stakeholder: task.linked_stakeholder,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 capitalize ${pStyle}`}
        >
          <Flag className="h-3 w-3" /> {task.priority}
        </span>
        {task.linked_stakeholder && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-foreground/80">
            <User2 className="h-3 w-3" /> Requested by {task.linked_stakeholder}
          </span>
        )}
        {task.category && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-foreground/70">
            {task.category}
          </span>
        )}
        {phase && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-foreground/70">
            <Compass className="h-3 w-3" /> Phase: {phase.replace(/_/g, " ")}
          </span>
        )}
        {task.due_at && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-foreground/70">
            Due {new Date(task.due_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {task.completion_action && (
        <div className="mt-3 flex items-start gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 text-[11px] text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-accent-orange" />
          <span>
            <span className="font-semibold text-foreground/80">To close this task:</span>{" "}
            {task.completion_action}
          </span>
        </div>
      )}
    </div>
  );
}