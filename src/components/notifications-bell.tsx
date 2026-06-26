import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listNotifications, type Notification } from "@/lib/notifications.functions";
import { Bell, Mail, CheckCircle2, Users, BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function relTime(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const ICON: Record<Notification["kind"], typeof Bell> = {
  email: Mail,
  task_done: CheckCircle2,
  stakeholder: Users,
  story: BookOpen,
};

export function NotificationsBell() {
  const fetchFn = useServerFn(listNotifications);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchFn(),
    refetchInterval: 20000,
  });
  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-md border border-border bg-card/60 p-2 text-foreground/80 transition hover:border-primary hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-medium text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Notifications
          </div>
          <div className="font-display text-sm">
            {unread > 0 ? `${unread} need attention` : "All caught up"}
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No activity yet.
            </div>
          )}
          {items.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <Link
                key={n.id}
                to={n.href}
                className={`flex gap-3 border-b border-border/60 px-4 py-3 text-xs transition hover:bg-accent ${
                  n.unread ? "bg-primary/[0.03]" : ""
                }`}
              >
                <Icon
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    n.unread ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{n.title}</div>
                  <div className="truncate text-muted-foreground">{n.detail}</div>
                </div>
                <div className="shrink-0 text-[10px] text-muted-foreground">
                  {relTime(n.at)}
                </div>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}