import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview } from "@/lib/sim.functions";
import { getActiveProject } from "@/lib/projects.functions";
import { listNotifications } from "@/lib/notifications.functions";
import { listWhatsNext } from "@/lib/tasks.functions";
import { getPhaseProgress } from "@/lib/phase.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, ListChecks, AlertTriangle, X, Sparkles } from "lucide-react";

const GAP_MS = 4 * 60 * 60 * 1000; // 4 hours

function isNewDay(prev: Date, now: Date) {
  return (
    prev.getFullYear() !== now.getFullYear() ||
    prev.getMonth() !== now.getMonth() ||
    prev.getDate() !== now.getDate()
  );
}

const PHASE_LABEL: Record<string, string> = {
  initiation: "Initiation",
  planning: "Planning",
  execution: "Execution",
  monitoring: "Monitoring & Control",
  closure: "Closure",
};

export function WelcomeBackPanel() {
  const fetchActive = useServerFn(getActiveProject);
  const fetchOverview = useServerFn(getOverview);
  const fetchNotes = useServerFn(listNotifications);
  const fetchNext = useServerFn(listWhatsNext);
  const fetchPhase = useServerFn(getPhaseProgress);

  const { data: active } = useQuery({ queryKey: ["active-project"], queryFn: () => fetchActive() });
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const { data: notes } = useQuery({ queryKey: ["notifications"], queryFn: () => fetchNotes() });
  const { data: next } = useQuery({ queryKey: ["whats-next"], queryFn: () => fetchNext() });
  const { data: phase } = useQuery({ queryKey: ["phase-progress"], queryFn: () => fetchPhase() });

  const activeId = (active as any)?.id as string | undefined;
  const [visible, setVisible] = useState(false);
  const [sinceIso, setSinceIso] = useState<string | null>(null);

  // Decide whether to show the panel exactly once per session per project.
  useEffect(() => {
    if (!activeId || typeof window === "undefined") return;
    const shownKey = `atlas.wb-shown.${activeId}`;
    if (window.sessionStorage.getItem(shownKey) === "1") return;

    const seenKey = `atlas.last-seen.${activeId}`;
    const raw = window.localStorage.getItem(seenKey);
    const now = new Date();

    if (!raw) {
      // First visit — brief sheet handles onboarding, don't double up.
      window.localStorage.setItem(seenKey, now.toISOString());
      window.sessionStorage.setItem(shownKey, "1");
      return;
    }
    const prev = new Date(raw);
    const gap = now.getTime() - prev.getTime();
    if (gap >= GAP_MS || isNewDay(prev, now)) {
      setSinceIso(prev.toISOString());
      setVisible(true);
    }
    window.sessionStorage.setItem(shownKey, "1");
  }, [activeId]);

  const summary = useMemo(() => {
    if (!sinceIso) return null;
    const since = new Date(sinceIso).getTime();
    const items = (notes as any)?.items ?? [];
    const newMessages = items.filter(
      (n: any) => n.kind === "email" && new Date(n.at).getTime() > since,
    );
    const newTasks = items.filter(
      (n: any) => n.kind === "task_done" && new Date(n.at).getTime() > since,
    );
    const urgent = (next as any)?.criticalOverdue ? 1 : 0;
    const rec = ((next as any)?.tasks ?? [])[0] ?? null;
    return { newMessages, newTasks, urgent, rec };
  }, [sinceIso, notes, next]);

  if (!visible || !summary) return null;

  const dismiss = () => {
    setVisible(false);
    if (activeId && typeof window !== "undefined") {
      window.localStorage.setItem(
        `atlas.last-seen.${activeId}`,
        new Date().toISOString(),
      );
    }
  };

  const profile = overview?.profile as any;
  const name =
    profile?.preferred_name?.trim() ||
    profile?.first_name?.trim() ||
    profile?.display_name?.trim() ||
    "there";
  const state: any = overview?.state ?? {};
  const phaseKey = (state.phase ?? "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  const phaseLabelKey = Object.keys(PHASE_LABEL).find((k) => k.startsWith(phaseKey)) ?? "execution";
  const phaseLabel = PHASE_LABEL[phaseLabelKey];
  const phaseOverall = typeof (phase as any)?.overall === "number"
    ? Math.round((phase as any).overall)
    : null;
  const chapterLabel = state.current_chapter
    ? `Chapter ${state.current_chapter}`
    : `Day ${state.current_day ?? 1}`;

  return (
    <section
      role="region"
      aria-label="Welcome back"
      className="atlas-rise relative rounded-2xl border border-navy/20 bg-gradient-to-br from-navy to-navy/90 p-5 text-white shadow-lg"
    >
      <button
        type="button"
        aria-label="Dismiss welcome back"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/70">
        <Sparkles className="h-3.5 w-3.5 text-accent-orange" />
        Welcome back
      </div>
      <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
        Good to see you again, {name}.
      </h2>
      <p className="mt-1 text-sm text-white/80">
        You’re in <span className="font-medium text-white">{phaseLabel}</span>
        {phaseOverall !== null ? ` · ${phaseOverall}% through the phase` : ""} · {chapterLabel}.
        Here’s what has moved since you were last here.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={Mail}
          value={summary.newMessages.length}
          label="new stakeholder message"
          plural="new stakeholder messages"
        />
        <SummaryTile
          icon={ListChecks}
          value={summary.newTasks.length}
          label="task moved forward"
          plural="tasks moved forward"
        />
        <SummaryTile
          icon={AlertTriangle}
          value={summary.urgent}
          label="urgent item needs attention"
          plural="urgent items need attention"
          tone={summary.urgent > 0 ? "warn" : "muted"}
        />
      </div>

      {summary.rec && (
        <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
            Recommended next
          </div>
          <div className="mt-1 font-medium text-white">{summary.rec.title}</div>
          {summary.rec.completion_action && (
            <div className="mt-0.5 text-xs text-white/70">
              → {summary.rec.completion_action}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          className="bg-white text-navy hover:bg-white/90"
          onClick={dismiss}
        >
          <Link to={summary.rec?.linked_module_route ?? "/app/tasks"}>
            Continue project <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={dismiss}
        >
          <Link to="/app/inbox">Review what changed</Link>
        </Button>
      </div>
    </section>
  );
}

function SummaryTile({
  icon: Icon,
  value,
  label,
  plural,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  plural: string;
  tone?: "default" | "warn" | "muted";
}) {
  const toneClass =
    tone === "warn"
      ? "text-accent-orange"
      : tone === "muted" && value === 0
        ? "text-white/50"
        : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneClass}`} />
        <div className={`font-display text-2xl font-medium ${toneClass}`}>{value}</div>
      </div>
      <div className="mt-1 text-xs leading-snug text-white/75">
        {value === 1 ? label : plural}
      </div>
    </div>
  );
}