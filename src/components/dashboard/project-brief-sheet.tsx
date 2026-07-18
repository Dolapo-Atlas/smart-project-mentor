import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getActiveProject } from "@/lib/projects.functions";
import { getOverview } from "@/lib/sim.functions";
import { listWhatsNext } from "@/lib/tasks.functions";
import { getPhaseProgress } from "@/lib/phase.functions";
import {
  Target,
  UserCircle2,
  Sparkles,
  ListChecks,
  Wrench,
  Trophy,
  ArrowRight,
  BookOpen,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PHASE_LABEL: Record<string, string> = {
  initiation: "Initiation",
  planning: "Planning",
  execution: "Execution",
  monitoring: "Monitoring & Control",
  closure: "Closure",
};

const HOW_IT_WORKS = [
  "Review project information as it arrives.",
  "Interpret stakeholder requests in the inbox.",
  "Complete tasks using the module templates.",
  "Decide when to act, delegate, or escalate.",
  "Submit your work for structured feedback.",
  "Improve and continue the project.",
];

const TOOLS: { label: string; to: string }[] = [
  { label: "Inbox", to: "/app/inbox" },
  { label: "Tasks", to: "/app/tasks" },
  { label: "People", to: "/app/stakeholders" },
  { label: "Meetings", to: "/app/meetings" },
  { label: "Project Charter", to: "/app/charter" },
  { label: "RAID Log", to: "/app/raid" },
  { label: "Status Reports", to: "/app/reports" },
  { label: "Documents", to: "/app/documents" },
  { label: "Progress", to: "/app/progress" },
];

export function ProjectBriefSheet({ open, onOpenChange }: Props) {
  const fetchActive = useServerFn(getActiveProject);
  const fetchOverview = useServerFn(getOverview);
  const fetchNext = useServerFn(listWhatsNext);
  const fetchPhase = useServerFn(getPhaseProgress);

  const { data: active } = useQuery({
    queryKey: ["active-project"],
    queryFn: () => fetchActive(),
    enabled: open,
  });
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
    enabled: open,
  });
  const { data: whatsNext } = useQuery({
    queryKey: ["whats-next"],
    queryFn: () => fetchNext(),
    enabled: open,
  });
  const { data: phase } = useQuery({
    queryKey: ["phase-progress"],
    queryFn: () => fetchPhase(),
    enabled: open,
  });

  const activeAny = active as any;
  const tpl = activeAny?.project_templates ?? {};
  const title =
    activeAny?.display_name ??
    tpl?.title ??
    overview?.state?.project_name ??
    "Your project";
  const mission =
    tpl?.welcome_intro ??
    tpl?.description ??
    "Guide this project from initiation to closure, managing stakeholders, risks, issues and competing priorities.";
  const roleTitle = "Project Coordinator";
  const phaseKey = normalisePhase(overview?.state?.phase as string | undefined);
  const phaseLabel = PHASE_LABEL[phaseKey] ?? "In progress";

  const priorities: { title: string; to?: string }[] =
    (whatsNext?.tasks ?? []).slice(0, 5).map((t: any) => ({
      title: t.title,
      to: t.linked_module_route ?? "/app/tasks",
    }));

  const phaseItems = (phase as any)?.items ?? [];
  const doneRecently = phaseItems.filter((i: any) => i.done).slice(0, 4);
  const success =
    phaseKey === "closure"
      ? "Close the project cleanly: capture lessons, sign off deliverables and complete the final review."
      : "Deliver measurable outcomes, keep stakeholders informed, and pass each phase gate on evidence — not opinion.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto bg-background sm:max-w-xl"
      >
        <SheetHeader className="text-left">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Project brief
          </div>
          <SheetTitle className="font-display text-3xl font-medium tracking-tight">
            Welcome to {title}
          </SheetTitle>
          <SheetDescription>
            A short orientation to your role, the current phase and your
            immediate priorities. Reopen any time from the sidebar.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Section icon={UserCircle2} label="Your role">
            <p>
              You are the <span className="font-medium text-foreground">{roleTitle}</span>{" "}
              supporting {title}. You coordinate work across the team, keep
              stakeholders aligned, and make the calls that keep the project
              moving.
            </p>
          </Section>

          <Section icon={Target} label="Your mission">
            <p>{mission}</p>
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <MiniCard label="Current phase" value={phaseLabel} tint="navy" />
            <MiniCard
              label="Overall phase progress"
              value={
                typeof (phase as any)?.overall === "number"
                  ? `${Math.round((phase as any).overall)}%`
                  : "—"
              }
              tint="orange"
            />
          </div>

          {doneRecently.length > 0 && (
            <Section icon={Sparkles} label="What has already happened">
              <ul className="space-y-1.5">
                {doneRecently.map((i: any) => (
                  <li key={i.key} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{i.label}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={ListChecks} label="Your immediate priorities">
            {priorities.length > 0 ? (
              <ol className="space-y-2">
                {priorities.map((p, i) => (
                  <li key={`${p.title}-${i}`} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
                      {i + 1}
                    </span>
                    {p.to ? (
                      <Link
                        to={p.to}
                        onClick={() => onOpenChange(false)}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {p.title}
                      </Link>
                    ) : (
                      <span>{p.title}</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No open tasks right now — check your inbox for the next
                stakeholder update.
              </p>
            )}
          </Section>

          <Section icon={Wrench} label="Your available tools">
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={() => onOpenChange(false)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground/80 transition hover:border-accent-orange hover:text-foreground"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </Section>

          <Section icon={BookOpen} label="How the simulation works">
            <ol className="space-y-1.5 pl-1">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={Trophy} label="What success looks like">
            <p>{success}</p>
          </Section>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button asChild onClick={() => onOpenChange(false)}>
              <Link to="/app/tasks">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue project
              </Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="border border-border"
            >
              <Compass className="mr-2 h-4 w-4" />
              Close brief
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent-orange" />
        {label}
      </div>
      <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function MiniCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: "navy" | "orange";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-xl font-medium ${
          tint === "orange" ? "text-accent-orange" : "text-navy"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function normalisePhase(p?: string | null): string {
  const k = (p ?? "").toLowerCase().trim();
  if (k.startsWith("init")) return "initiation";
  if (k.startsWith("plan")) return "planning";
  if (k.startsWith("exec")) return "execution";
  if (k.startsWith("mon")) return "monitoring";
  if (k.startsWith("clos")) return "closure";
  return "execution";
}