import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getOverview,
  generateStakeholderMessage,
  listInbox,
  listTasks,
} from "@/lib/sim.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, ListChecks, Activity, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { TimeControls } from "@/components/time-controls";
import { WhatsNextPanel } from "@/components/whats-next-panel";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

type InboxItem = { id: string; subject: string; sender_name: string; sender_role: string; body: string; read: boolean; tone?: string; created_at?: string };
type TaskItem = { id: string; title: string; status: string };

function Dashboard() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getOverview);
  const fetchInbox = useServerFn(listInbox);
  const genMessage = useServerFn(generateStakeholderMessage);

  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const { data: inbox } = useQuery({ queryKey: ["inbox"], queryFn: () => fetchInbox() });

  const summon = useMutation({
    mutationFn: () => genMessage(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("New email in your inbox.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const recent = (inbox ?? []).slice(0, 3);
  const story = (overview?.state?.story_log as Array<{ at: string; beat: string }> | undefined) ?? [];
  const lastBeat = story[story.length - 1];
  const state = overview?.state;
  const health = (state?.health as "green" | "amber" | "red" | undefined) ?? "amber";
  const healthStyle: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
    amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40",
    red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
  };
  const activity = overview?.activity ?? [];
  const profile = overview?.profile;
  const name =
    profile?.preferred_name?.trim() ||
    profile?.first_name?.trim() ||
    profile?.display_name?.trim() ||
    "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {state?.chapter ?? "Chapter One"} · {state?.company ?? "Northbridge Health Services"} · Day {state?.current_day ?? 1} · Week {state?.current_week ?? 1}
        </div>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">
          {greeting}, {name}.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {state?.project_name ?? "Digital Care Records Rollout"} · 12 care homes ·
          £500,000 budget · 6-month timeline. You have {overview?.unread ?? 0} unread,{" "}
          {overview?.openTasks ?? 0} open tasks, and {overview?.pendingReviews ?? 0} document(s)
          awaiting review.
        </p>
        <div className="mt-4">
          <TimeControls />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className={`rounded-lg border p-5 ${healthStyle[health]}`}>
          <div className="text-xs uppercase tracking-[0.18em] opacity-80">Project Health</div>
          <div className="mt-2 font-display text-3xl font-medium capitalize">{health}</div>
          <div className="mt-1 text-xs opacity-80">Sponsor's current view</div>
        </div>
        <Stat label="Chapter" value={state?.chapter?.replace(/^Chapter\s+/i, "Ch. ") ?? "—"} hint="Current storyline" icon={Sparkles} />
        <Stat label="Open tasks" value={overview?.openTasks ?? 0} hint="Not yet completed" icon={ListChecks} />
        <Stat label="Pending reviews" value={overview?.pendingReviews ?? 0} hint="Awaiting AI panel" icon={ClipboardCheck} />
        <Stat label="Reputation" value={`${state?.reputation ?? 50}/100`} hint="Across stakeholders" icon={Activity} />
      </section>

      <WhatsNextPanel />

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Inbox</h2>
            <Button
              size="sm"
              onClick={() => summon.mutate()}
              disabled={summon.isPending}
              variant="secondary"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {summon.isPending ? "Drafting…" : "New stakeholder email"}
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {recent.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Quiet inbox. Sarah will check in shortly.
              </li>
            )}
            {recent.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-4">
                <StakeholderAvatar name={m.sender_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{m.subject}</div>
                    {!m.read && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">new</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.sender_name} · {m.sender_role}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link to="/app/inbox" className="text-sm font-medium text-primary hover:underline">
              Open inbox →
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {activity.length === 0 && (
              <li className="text-sm text-muted-foreground">No activity yet today.</li>
            )}
            {activity.slice(0, 6).map((a) => (
              <li key={`${a.kind}-${a.id}`} className="flex items-start gap-2 text-sm">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{a.text}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.at), { addSuffix: true })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {lastBeat ? (
            <blockquote className="mt-6 border-l-2 border-primary pl-4 font-display text-base italic leading-snug text-muted-foreground">
              "{lastBeat.beat}"
            </blockquote>
          ) : null}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Link
              to="/app/tasks"
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <ListChecks className="h-4 w-4" /> Tasks
            </Link>
            <Link
              to="/app/documents"
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <FileText className="h-4 w-4" /> Documents
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-medium">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}