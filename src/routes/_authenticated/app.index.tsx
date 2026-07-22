import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getOverview,
  generateStakeholderMessage,
} from "@/lib/sim.functions";
import { getActiveProject } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, Compass } from "lucide-react";
import { toast } from "sonner";
import { TimeControls } from "@/components/time-controls";
import { ContinueCard } from "@/components/dashboard/continue-card";
import { TaskSummaryStrip } from "@/components/dashboard/task-summary-strip";
import { TaskBoard } from "@/components/dashboard/task-board";
import { ProjectSidePanel } from "@/components/dashboard/project-side-panel";
import { ProjectBriefSheet } from "@/components/dashboard/project-brief-sheet";
import { WelcomeBackPanel } from "@/components/dashboard/welcome-back-panel";
import { PhaseReadinessPanel } from "@/components/dashboard/phase-readiness-panel";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});


function Dashboard() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getOverview);
  const genMessage = useServerFn(generateStakeholderMessage);
  const fetchActive = useServerFn(getActiveProject);

  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const { data: active, isSuccess: activeLoaded } = useQuery({
    queryKey: ["active-project"],
    queryFn: () => fetchActive(),
  });

  const [briefOpen, setBriefOpen] = useState(false);
  const activeId = (active as any)?.id as string | undefined;
  const autoOpenedRef = useRef<string | null>(null);

  // Auto-open the Project Brief the first time the user lands on the
  // dashboard for a given project instance. Uses localStorage so returning
  // users are not interrupted.
  useEffect(() => {
    if (!activeId) return;
    if (typeof window === "undefined") return;
    if (autoOpenedRef.current === activeId) return;
    const key = `atlas.brief-seen.${activeId}`;
    if (window.localStorage.getItem(key) === "1") return;
    autoOpenedRef.current = activeId;
    setBriefOpen(true);
    window.localStorage.setItem(key, "1");
  }, [activeId]);

  const summon = useMutation({
    mutationFn: () => genMessage(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
      toast.success("New email in your inbox.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // No active project (never picked one, or the current one was archived).
  // Show a calm prompt instead of stale dashboard data.
  if (activeLoaded && !active) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          No active simulation
        </div>
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight md:text-5xl">
          You don't have a project running.
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Your previous simulation has been archived. Pick another project to
          continue your Atlas experience — your progress from other simulations
          is safe.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/app/projects">
              <Sparkles className="mr-2 h-4 w-4" />
              Pick a project
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const state = overview?.state;
  const profile = overview?.profile;
  const name =
    profile?.preferred_name?.trim() ||
    profile?.first_name?.trim() ||
    profile?.display_name?.trim() ||
    "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const tpl = (active as any)?.project_templates;
  const projectTitle = (active as any)?.display_name ?? tpl?.title ?? state?.project_name ?? "Digital Care Records Rollout";

  return (
    <div className="space-y-6">
      <header className="atlas-rise flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {projectTitle} · Day {state?.current_day ?? 1} · Week {state?.current_week ?? 1}
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight md:text-4xl">
            {greeting}, {name}.
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="border border-border"
            onClick={() => setBriefOpen(true)}
          >
            <Compass className="mr-2 h-4 w-4" />
            Project brief
          </Button>
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
      </header>

      <div className="atlas-rise atlas-rise-1">
        <TimeControls />
      </div>

      <WelcomeBackPanel />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className="atlas-rise atlas-rise-2"><ContinueCard /></div>
          <div className="atlas-rise atlas-rise-2"><PhaseReadinessPanel /></div>
          <div className="atlas-rise atlas-rise-3"><TaskSummaryStrip /></div>
          <div className="atlas-rise atlas-rise-4"><TaskBoard /></div>
        </div>
        <div className="atlas-rise atlas-rise-2">
          <ProjectSidePanel />
        </div>
      </div>
      <ProjectBriefSheet open={briefOpen} onOpenChange={setBriefOpen} />
    </div>
  );
}