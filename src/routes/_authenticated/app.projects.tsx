import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listProjectTemplates,
  listMyProjectInstances,
  startProject,
  setActiveProject,
  archiveProject,
} from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Briefcase,
  Monitor,
  Building2,
  Rocket,
  Zap,
  Calendar,
  Gauge,
  Users,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  Archive,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/projects")({
  component: ProjectsPicker,
});

type Template = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  duration_days: number;
  difficulty: string;
  stakeholder_count: number;
  key_skills: string[];
  icon: string;
  is_recommended: boolean;
  is_playable: boolean;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "heart-pulse": Heart,
  briefcase: Briefcase,
  monitor: Monitor,
  building: Building2,
  rocket: Rocket,
  zap: Zap,
};

const CATEGORY_TINTS: Record<string, string> = {
  Healthcare: "bg-rose-100 text-rose-600",
  "Business Systems": "bg-amber-100 text-amber-600",
  "Marketing / Digital": "bg-violet-100 text-violet-600",
  Operations: "bg-sky-100 text-sky-600",
  Product: "bg-orange-100 text-orange-600",
  Infrastructure: "bg-emerald-100 text-emerald-600",
};

const DIFFICULTY_DOT: Record<string, string> = {
  Beginner: "bg-emerald-500",
  Intermediate: "bg-amber-500",
  Advanced: "bg-rose-500",
};

function ProjectsPicker() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchTemplates = useServerFn(listProjectTemplates);
  const fetchInstances = useServerFn(listMyProjectInstances);
  const startFn = useServerFn(startProject);
  const setActiveFn = useServerFn(setActiveProject);
  const archiveFn = useServerFn(archiveProject);

  const [sort, setSort] = useState<"recommended" | "duration" | "difficulty">("recommended");

  const { data: templates = [] } = useQuery({
    queryKey: ["project-templates"],
    queryFn: () => fetchTemplates() as Promise<Template[]>,
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["my-project-instances"],
    queryFn: () => fetchInstances(),
  });

  const start = useMutation({
    mutationFn: (templateId: string) => startFn({ data: { templateId } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries();
      if (res?.requiresIntro && res?.templateId) {
        navigate({ to: "/project-intro/$templateId", params: { templateId: res.templateId } });
      } else {
        toast.success("Simulation loaded. Welcome back.");
        navigate({ to: "/app" });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't start that simulation"),
  });

  const switchTo = useMutation({
    mutationFn: (instanceId: string) => setActiveFn({ data: { instanceId } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries();
      if (res?.requiresIntro && res?.templateId) {
        navigate({ to: "/project-intro/$templateId", params: { templateId: res.templateId } });
      } else {
        toast.success("Resuming simulation");
        navigate({ to: "/app" });
      }
    },
  });

  const archive = useMutation({
    mutationFn: (instanceId: string) => archiveFn({ data: { instanceId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-project-instances"] });
      toast.success("Project archived");
    },
  });

  const sorted = [...templates].sort((a, b) => {
    if (sort === "duration") return a.duration_days - b.duration_days;
    if (sort === "difficulty") {
      const rank = { Beginner: 1, Intermediate: 2, Advanced: 3 } as Record<string, number>;
      return (rank[a.difficulty] ?? 99) - (rank[b.difficulty] ?? 99);
    }
    // recommended first, then sort_order
    if (a.is_recommended !== b.is_recommended) return a.is_recommended ? -1 : 1;
    return 0;
  });

  const activeInstances = instances.filter(
    (i: any) => i.status === "active" || i.status === "paused",
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      {/* Hero */}
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="font-display text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
            Which project
            <br />
            do you want to{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">manage?</span>
              <span className="absolute -bottom-1 left-0 right-0 h-2 bg-primary/30 rounded-full" />
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Step into real-world projects. Make decisions.
            <br />
            Manage stakeholders. Solve problems. See the impact.
          </p>
        </div>
      </div>

      {/* My active simulations */}
      {activeInstances.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your sim rooms
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeInstances.map((inst: any) => {
              const tpl = inst.project_templates;
              const Icon = ICONS[tpl?.icon] ?? Briefcase;
              return (
                <div
                  key={inst.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        CATEGORY_TINTS[tpl?.category] ?? "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {inst.display_name ?? tpl?.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last active{" "}
                        {formatDistanceToNow(new Date(inst.last_active_at), { addSuffix: true })}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {inst.current_phase}
                        </span>
                        <span className="text-muted-foreground">{inst.progress_pct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => switchTo.mutate(inst.id)}
                      disabled={switchTo.isPending}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Archive this simulation? You can start fresh later.")) {
                          archive.mutate(inst.id);
                        }
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Picker */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Choose a simulation
          </h2>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Sort by: Recommended</SelectItem>
              <SelectItem value="duration">Sort by: Duration</SelectItem>
              <SelectItem value="difficulty">Sort by: Difficulty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => {
            const Icon = ICONS[t.icon] ?? Briefcase;
            return (
              <article
                key={t.id}
                className={`relative flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md ${
                  !t.is_playable ? "opacity-80" : ""
                }`}
              >
                {t.is_recommended && (
                  <div className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                    <Sparkles className="h-3 w-3" />
                    FLAGSHIP — POLISHED END-TO-END
                  </div>
                )}
                {!t.is_playable && (
                  <div className="absolute -top-3 right-5 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
                    Coming soon
                  </div>
                )}

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    CATEGORY_TINTS[t.category] ?? "bg-muted text-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-semibold leading-tight text-foreground">
                  {t.title}
                </h3>
                <div className="mt-1 inline-flex">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      CATEGORY_TINTS[t.category] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.category}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <Stat icon={Calendar} label="Duration" value={`${t.duration_days} Days`} />
                  <Stat
                    icon={Gauge}
                    label="Difficulty"
                    value={t.difficulty}
                    dot={DIFFICULTY_DOT[t.difficulty]}
                  />
                  <Stat icon={Users} label="Stakeholders" value={String(t.stakeholder_count)} />
                </div>

                <div className="mt-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Key skills you'll practice
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.key_skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  {t.is_playable ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => start.mutate(t.id)}
                      disabled={start.isPending}
                    >
                      Select Project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button className="w-full" size="lg" variant="secondary" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-10 rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Real experience. Real impact.</div>
            <p className="text-sm text-muted-foreground">
              Every simulation mirrors real project work — so you build confidence before it counts.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  dot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  dot?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {value}
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      </div>
    </div>
  );
}