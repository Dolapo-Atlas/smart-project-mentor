import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Award,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FolderKanban,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { startProject } from "@/lib/projects.functions";
import { listMilestones } from "@/lib/milestones.functions";
import { MilestoneShareDialog } from "@/components/milestones/milestone-share-dialog";
import type { CompletionState } from "@/lib/completion.server";

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 font-display text-lg font-medium tracking-tight">{value}</div>
    </div>
  );
}

export function CompletionHub({
  state,
  onReviewWorkspace,
}: {
  state: CompletionState;
  onReviewWorkspace: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = useServerFn(startProject);
  const fetchMilestones = useServerFn(listMilestones);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: feed } = useQuery({
    queryKey: ["milestones"],
    queryFn: () => fetchMilestones() as Promise<any>,
  });
  const completionMilestone =
    (feed?.milestones ?? []).find((m: any) => m.kind === "completion") ??
    (feed?.milestones ?? [])[0] ??
    null;

  const startMut = useMutation({
    mutationFn: (vars: { templateId: string; restart?: boolean }) =>
      start({ data: { templateId: vars.templateId, restart: vars.restart } }) as Promise<any>,
    onSuccess: (res: any) => {
      qc.invalidateQueries();
      if (res?.completed) {
        toast.success("Reopening your completed run — nothing was reset.");
        navigate({ to: "/app" });
      } else if (res?.requiresIntro && res?.templateId) {
        navigate({ to: "/project-intro/$templateId", params: { templateId: res.templateId } });
      } else {
        navigate({ to: "/app" });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't start that simulation"),
  });

  const playable = state.recommendations.filter((r) => r.isPlayable);
  const comingSoon = state.recommendations.filter((r) => !r.isPlayable);

  return (
    <div className="space-y-10 pb-6">
      {/* Hero */}
      <section className="atlas-rise overflow-hidden rounded-3xl border border-border bg-surface-cream p-7 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] md:p-10">
        <div className="text-[11px] uppercase tracking-[0.28em] text-accent-orange">
          Simulation complete
        </div>
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-5xl">
          Congratulations, {state.learnerName}.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          You’ve closed out <span className="font-medium text-foreground">{state.projectName}</span>{" "}
          end to end — from initiation through governance sign-off at closure.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            icon={Award}
            label="Final score"
            value={state.score != null ? `${state.score}/100` : "—"}
          />
          <Stat icon={BadgeCheck} label="Grade" value={state.grade ?? "—"} />
          <Stat icon={UserRound} label="Simulated role" value={state.simulatedRole} />
          <Stat
            icon={Clock}
            label="Project duration"
            value={state.durationDays ? `${state.durationDays} simulated days` : "—"}
          />
          <Stat
            icon={ClipboardList}
            label="Deliverables approved"
            value={String(state.deliverablesApproved)}
          />
          <Stat
            icon={CheckCircle2}
            label="Credential"
            value={state.credential.issued ? "Issued & verifiable" : "Ready to issue"}
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Button asChild size="lg">
            <Link to="/app/results">
              View results <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/app/milestones">
              <Award className="mr-2 h-4 w-4" /> View credential
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/app/deliverables">
              <FolderKanban className="mr-2 h-4 w-4" /> View deliverables
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShareOpen(true)}
            disabled={!completionMilestone}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share achievement
          </Button>
          <Button variant="ghost" size="lg" onClick={onReviewWorkspace}>
            Review completed project
          </Button>
        </div>
      </section>

      {/* Phase recap */}
      <section className="atlas-rise atlas-rise-1">
        <h2 className="font-display text-xl font-medium tracking-tight">Your journey</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {state.phases.map((p, i) => (
            <div key={p.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{p.label}</span>
              </div>
              {i < state.phases.length - 1 && (
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Next simulation */}
      <section className="atlas-rise atlas-rise-2">
        <h2 className="font-display text-2xl font-medium tracking-tight">
          What would you like to work on next?
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your completed project stays archived and verifiable. Starting a new simulation
          won’t change it.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {playable.map((r) => (
            <Card key={r.id} variant="soft" className="flex flex-col p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {r.category}
              </div>
              <h3 className="mt-2 font-display text-lg font-medium tracking-tight">{r.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {r.simulatedRole && (
                  <span className="rounded-full border border-border/70 px-2 py-0.5">
                    {r.simulatedRole}
                  </span>
                )}
                {(r.estimatedHours || r.durationDays) && (
                  <span className="rounded-full border border-border/70 px-2 py-0.5">
                    <CalendarDays className="mr-1 inline h-3 w-3" />
                    {r.estimatedHours ?? `${r.durationDays} days`}
                  </span>
                )}
                {r.difficulty && (
                  <span className="rounded-full border border-border/70 px-2 py-0.5">
                    {r.difficulty}
                  </span>
                )}
              </div>
              <Button
                className="mt-5 w-full"
                onClick={() => startMut.mutate({ templateId: r.id })}
                disabled={startMut.isPending}
              >
                {startMut.isPending ? "Starting…" : "Start simulation"}
              </Button>
            </Card>
          ))}

          {playable.length === 0 && (
            <Card variant="soft" className="flex flex-col p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-accent-orange">
                Run it again
              </div>
              <h3 className="mt-2 font-display text-lg font-medium tracking-tight">
                Restart this simulation
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start a fresh run of {state.projectName} and aim for a stronger outcome. Your
                archived run and credential are untouched.
              </p>
              <Button
                className="mt-5 w-full"
                onClick={() =>
                  state.templateId &&
                  confirm(
                    "Start a brand-new run of this simulation? Your completed run stays saved and reviewable.",
                  ) &&
                  startMut.mutate({ templateId: state.templateId, restart: true })
                }
                disabled={!state.templateId || startMut.isPending}
              >
                {startMut.isPending ? "Starting…" : "Restart this simulation"}
              </Button>
            </Card>
          )}

          {comingSoon.map((r) => (
            <Card key={r.id} variant="soft" className="flex flex-col p-5 opacity-80">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Coming soon
              </div>
              <h3 className="mt-2 font-display text-lg font-medium tracking-tight">{r.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
              <Button className="mt-5 w-full" variant="outline" disabled>
                <Sparkles className="mr-2 h-4 w-4" /> In development
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-5">
          <Button asChild variant="ghost">
            <Link to="/app/projects">
              Browse all simulations <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <MilestoneShareDialog
        milestone={completionMilestone}
        learnerName={state.learnerName}
        simulatedRole={state.simulatedRole}
        projectName={state.projectName}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
