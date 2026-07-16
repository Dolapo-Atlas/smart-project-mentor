import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview } from "@/lib/sim.functions";
import { listTasksRich } from "@/lib/tasks.functions";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { Mail, Users } from "lucide-react";

export function ProjectSidePanel() {
  const fetchOverview = useServerFn(getOverview);
  const fetchTasks = useServerFn(listTasksRich);

  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const { data: tasks } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks() as Promise<any[]>,
  });

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
      {/* Inbox */}
      <Link
        to="/app/inbox"
        className="hover-lift flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-md ring-1 ring-black/[0.03] transition hover:border-primary/50"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Inbox</div>
            <div className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
            {unread}
          </span>
        )}
      </Link>

      {/* Active stakeholders */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-md ring-1 ring-black/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
            <Users className="h-3.5 w-3.5" />
            Active stakeholders
          </div>
          <Link to="/app/stakeholders" className="text-[11px] font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {activeStakeholders.length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">
            No stakeholders tied to open work yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {activeStakeholders.map((name) => (
              <li key={name} className="flex items-center gap-2.5 text-sm text-foreground">
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