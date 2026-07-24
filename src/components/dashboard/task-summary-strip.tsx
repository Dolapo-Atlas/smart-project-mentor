import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksRich } from "@/lib/tasks.functions";
import { Circle, CircleDot, Clock, CheckCircle2 } from "lucide-react";
import { motion, fadeUp, stagger, CountUp } from "@/components/motion/primitives";

const TILES: Array<{
  key: string;
  label: string;
  icon: typeof Circle;
  statuses: string[];
  accent: string;
  bar: string;
}> = [
  {
    key: "todo",
    label: "To do",
    icon: Circle,
    statuses: ["todo", "blocked"],
    accent: "text-navy",
    bar: "bg-navy",
  },
  {
    key: "in_progress",
    label: "In progress",
    icon: CircleDot,
    statuses: ["in_progress"],
    accent: "text-accent-orange",
    bar: "bg-accent-orange",
  },
  {
    key: "pending",
    label: "Pending review",
    icon: Clock,
    statuses: ["submitted"],
    accent: "text-warning-foreground",
    bar: "bg-warning",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    statuses: ["done", "approved", "completed", "closed"],
    accent: "text-success",
    bar: "bg-success",
  },
];

export function TaskSummaryStrip() {
  const fetchTasks = useServerFn(listTasksRich);
  const { data: tasks } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });
  const rows = tasks ?? [];
  const openStatuses = ["todo", "blocked", "in_progress"];
  const requiredOpen = rows.filter(
    (r) => r.source === "onboarding" && openStatuses.includes(r.status),
  ).length;
  const requiredTotal = rows.filter((r) => r.source === "onboarding").length;
  return (
    <div className="space-y-2">
      {requiredTotal > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent-orange/30 bg-accent-orange/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-orange" />
            <span>
              <span className="font-semibold text-foreground">
                {requiredOpen}
              </span>{" "}
              required {requiredOpen === 1 ? "task" : "tasks"} left to move this phase forward
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Focus these first
          </span>
        </div>
      )}
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {TILES.map((t) => {
        const count = rows.filter((r) => t.statuses.includes(r.status)).length;
        const Icon = t.icon;
        return (
          <motion.div
            key={t.key}
            variants={fadeUp}
            className="hover-lift relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <span className={`absolute left-0 top-0 h-full w-1 ${t.bar}`} aria-hidden />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </div>
                <div className="mt-1.5 font-display text-2xl font-semibold text-foreground">
                  <CountUp value={count} />
                </div>
              </div>
              <Icon className={`h-4 w-4 ${t.accent}`} />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
    </div>
  );
}