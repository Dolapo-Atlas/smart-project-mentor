import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getTemplateById, getActiveProject, markIntroSeen } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Gauge, Sparkles, Coffee } from "lucide-react";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { factsFor } from "@/lib/project-facts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/project-intro/$templateId")({
  component: ProjectIntro,
});

function ProjectIntro() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const fetchTpl = useServerFn(getTemplateById);
  const fetchActive = useServerFn(getActiveProject);
  const markSeen = useServerFn(markIntroSeen);

  const { data: tpl } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => fetchTpl({ data: { templateId } }) as Promise<any>,
  });
  const { data: active } = useQuery({
    queryKey: ["active-project"],
    queryFn: () => fetchActive(),
  });

  // One short pre-start screen replaces the old loader + "grab a coffee"
  // sequence, so there is a single click between here and the brief.
  type Stage = "ready" | "intro";
  const [stage, setStage] = useState<Stage>("ready");
  const [starting, setStarting] = useState(false);

  const seenMut = useMutation({
    mutationFn: () => markSeen({ data: { instanceId: (active as any).id, templateId } }),
  });

  async function begin() {
    if (!(active as any)?.id) return;
    setStarting(true);
    try {
      await seenMut.mutateAsync();
      // The workspace Home is the single first destination. It owns the
      // first-run sequence: open the full brief, then offer the inbox prompt.
      navigate({ to: "/app", replace: true });
    } catch (error) {
      setStarting(false);
      toast.error(error instanceof Error ? error.message : "Couldn't start your first day");
    }
  }

  if (!tpl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background paper-texture text-muted-foreground">
        Loading…
      </div>
    );
  }

  const skills: string[] = tpl.key_skills ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background paper-texture">
      {/* Single pre-start screen */}
      {stage === "ready" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="w-full max-w-lg px-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
              <Coffee className="h-9 w-9 text-primary animate-pulse" />
            </div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Before you begin
            </div>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
              Your first day at {(tpl as any).title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Grab a coffee and take a breath. Next you'll read the project brief,
              and {(tpl as any).pm_name ?? "your project manager"}'s welcome email
              will be waiting the moment you sit down.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={() => setStage("intro")}>
                I'm ready — show me the brief
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Tip: This sim runs at your pace. Nothing happens until you act.
            </div>
          </div>
        </div>
      )}

      <main
        className={`mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16 md:py-24 ${
          stage === "intro" ? "" : "invisible"
        }`}
      >
        <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Welcome to {tpl.title}
        </div>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
          {tpl.title}
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {tpl.welcome_intro ?? tpl.description}
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <Meta
            icon={Calendar}
            label="Simulated project length"
            value={`${factsFor((tpl as any).slug).durationDays} simulated days`}
          />
          <Meta icon={Clock} label="Your time to complete" value={tpl.estimated_hours ?? "8–12 hours"} />
          <Meta icon={Gauge} label="Difficulty" value={tpl.difficulty ?? "Beginner"} />
        </div>

        {skills.length > 0 && (
          <div className="mt-10">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Skills you'll practise
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Your team
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Person
              name={tpl.sponsor_name ?? "Priya Anand"}
              role={tpl.sponsor_role ?? "Primary Sponsor"}
            />
            <Person
              name={tpl.pm_name ?? "Emma Collins"}
              role={tpl.pm_role ?? "Programme Manager"}
            />
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={begin} disabled={starting || !(active as any)?.id}>
            <Sparkles className="mr-2 h-4 w-4" />
            {starting ? "Starting…" : "Start First Day"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => navigate({ to: "/app/projects" })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Choose a different project
          </button>
        </div>
      </main>
    </div>
  );
}

function projectCodeName(title: string) {
  if (/health|care|record/i.test(title)) return "Project Amber";
  if (/crm/i.test(title)) return "Project Atlas CRM";
  if (/website|marketing/i.test(title)) return "Project Beacon";
  if (/office|relocation/i.test(title)) return "Project Harbour";
  if (/launch|product/i.test(title)) return "Project Vega";
  if (/cloud|migration|infra/i.test(title)) return "Project Northwind";
  return title;
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-display text-xl font-medium">{value}</div>
    </div>
  );
}

function Person({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <StakeholderAvatar name={name} size="md" />
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}