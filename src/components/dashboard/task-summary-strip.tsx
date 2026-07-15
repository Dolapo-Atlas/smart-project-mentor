import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich } from "@/lib/tasks.functions";
import { Circle, CircleDot, Clock, CheckCircle2 } from "lucide-react";

const TILES: Array<{
  key: string;
  label: string;
  icon: typeof Circle;
  statuses: string[];
  accent: string;
}> = [
  {
    key: "todo",
    label: "To do",
    icon: Circle,
    statuses: ["todo"],
    accent: "text-muted-foreground",
  },
  {
    key: "in_progress",
    label: "In progress",
    icon: CircleDot,
    statuses: ["in_progress"],
    accent: "text-primary",
  },
  {
    key: "pending",
    label: "Pending review",
    icon: Clock,
    statuses: ["submitted"],
    accent: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    statuses: ["done", "approved", "completed", "closed"],
    accent: "text-emerald-600 dark:text-emerald-400",
  },
];

export function TaskSummaryStrip() {
  const fetchTasks = useServerFn(listTasksRich);
  const { data: tasks } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });
  const rows = tasks ?? [];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((t) => {
        const count = rows.filter((r) => t.statuses.includes(r.status)).length;
        const Icon = t.icon;
        return (
          <div
            key={t.key}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${t.accent}`}>
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </div>
            <div className="mt-1.5 font-display text-2xl font-semibold">{count}</div>
          </div>
        );
      })}
    </div>
  );
}