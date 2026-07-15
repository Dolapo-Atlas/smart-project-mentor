import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChapters } from "@/lib/chapters.functions";
import { getOverview } from "@/lib/sim.functions";
import { listTasksRich } from "@/lib/tasks.functions";
import { Progress } from "@/components/ui/progress";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { Mail, MapPin, Users } from "lucide-react";

export function ProjectSidePanel() {
  const fetchChapters = useServerFn(listChapters);
  const fetchOverview = useServerFn(getOverview);
  const fetchTasks = useServerFn(listTasksRich);

  const { data: chapters } = useQuery({ queryKey: ["chapters"], queryFn: () => fetchChapters() });
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const { data: tasks } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });

  const active = chapters?.chapters.find((c) => c.status === "active");
  const total = chapters?.totalCount ?? 0;
  const done = chapters?.completedCount ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const activeStakeholders = Array.from(
    new Set(
      (tasks ?? [])
        .filter((t) => !["done", "approved", "completed", "closed"].includes(t.status))
        .map((t) => t.linked_stakeholder)
        .filter(Boolean),
    ),
  ).slice(0, 5) as string[];

  const unread = overview?.unread ?? 0;

  return (
    <aside className="space-y-4">
      {/* Phase + progress */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          Current phase
        </div>
        <div className="mt-1 font-display text-lg font-semibold">
          {active ? active.phase : done === total && total > 0 ? "Complete" : "Kick-off"}
        </div>
        {active && (
          <div className="mt-0.5 text-sm text-muted-foreground">
            Ch. {active.chapter_number} · {active.title}
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Story arc</span>
            <span>
              {done} / {total}
            </span>
          </div>
          <Progress value={pct} className="mt-1.5 h-1.5" />
        </div>

        {active?.completion_hint && (
          <p className="mt-4 rounded-md border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
            → {active.completion_hint}
          </p>
        )}
      </div>

      {/* Inbox */}
      <Link
        to="/app/inbox"
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">Inbox</div>
            <div className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
            {unread}
          </span>
        )}
      </Link>

      {/* Active stakeholders */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Active stakeholders
          </div>
          <Link to="/app/stakeholders" className="text-[11px] text-primary hover:underline">
            View all
          </Link>
        </div>
        {activeStakeholders.length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">
            No stakeholders tied to open work yet.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {activeStakeholders.map((name) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <StakeholderAvatar name={name} size="sm" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}