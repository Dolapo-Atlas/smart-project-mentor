import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, generateStakeholderMessage, listInbox } from "@/lib/sim.functions";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles, FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

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
      toast.success("A new message arrived.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const recent = (inbox ?? []).slice(0, 3);
  const story = (overview?.state?.story_log as Array<{ at: string; beat: string }> | undefined) ?? [];
  const lastBeat = story[story.length - 1];

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Day {Math.max(1, story.length + 1)} · {overview?.state?.phase ?? "kickoff"}
        </div>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">
          Good morning, coordinator.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The project is breathing. {overview?.unread ?? 0} unread, {overview?.openTasks ?? 0} open
          tasks, {overview?.docs ?? 0} documents on file.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Reputation" value={`${overview?.state?.reputation ?? 50}/100`} hint="How stakeholders see you" />
        <Stat label="Progress" value={`${overview?.state?.progress ?? 0}%`} hint="Toward launch" />
        <Stat label="Phase" value={overview?.state?.phase ?? "—"} hint="Current chapter" capitalize />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Latest in the inbox</h2>
            <Button
              size="sm"
              onClick={() => summon.mutate()}
              disabled={summon.isPending}
              variant="secondary"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {summon.isPending ? "Summoning…" : "Summon a stakeholder"}
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {recent.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Nothing yet — summon a stakeholder to kick things off.
              </li>
            )}
            {recent.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-4">
                <Mail className="mt-1 h-4 w-4 text-primary" />
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
          <h2 className="font-display text-xl font-semibold">Story so far</h2>
          {lastBeat ? (
            <blockquote className="mt-4 border-l-2 border-primary pl-4 font-display text-lg italic leading-snug">
              "{lastBeat.beat}"
            </blockquote>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No beats yet. Upload your first document to start writing the project's story.
            </p>
          )}
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
  capitalize,
}: {
  label: string;
  value: string | number;
  hint: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl font-medium ${capitalize ? "capitalize" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}