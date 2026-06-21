import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { getLearningJourney, submitReflection, backfillLearningJourney } from "@/lib/learning.functions";
import { reflectionPromptFor } from "@/lib/learning";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronDown, Lock, Sparkles, Circle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/learning")({
  component: LearningJourneyPage,
});

type Phase = {
  phase: number;
  title: string;
  unlock_hint: string;
  unlocked: boolean;
  completion: number;
  mastered: number;
  total: number;
  competencies: Array<{
    id: string;
    label: string;
    status: "locked" | "drafting" | "mastered";
    mastered_at: string | null;
  }>;
};
type Reflection = {
  id: string;
  phase: number | null;
  prompt: string;
  answer: string;
  created_at: string;
};
type Journey = {
  total: number;
  mastered: number;
  drafting: number;
  locked: number;
  current_phase: number;
  phases: Phase[];
  reflections: Reflection[];
};

function ProgressRing({ pct, size = 140 }: { pct: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="hsl(var(--primary))"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
    </svg>
  );
}

function LearningJourneyPage() {
  const qc = useQueryClient();
  const fetchJourney = useServerFn(getLearningJourney);
  const submitFn = useServerFn(submitReflection);
  const backfillFn = useServerFn(backfillLearningJourney);
  const { data } = useQuery<Journey>({
    queryKey: ["learning-journey"],
    queryFn: () => fetchJourney(),
  });

  const backfill = useMutation({
    mutationFn: () => backfillFn(),
    onSuccess: (r: { mastered: number; drafting: number }) => {
      toast.success(`Synced past work — ${r.mastered} mastered, ${r.drafting} in progress.`);
      qc.invalidateQueries({ queryKey: ["learning-journey"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
  });

  // Run backfill automatically once per browser, so existing users see their
  // prior work reflected without having to click anything.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "atlas.learning.backfilled.v1";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    backfill.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [reflectOpen, setReflectOpen] = useState(false);
  const [reflectPhase, setReflectPhase] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");

  // Auto-trigger reflection prompt when a phase has 3+ mastered competencies
  // and no reflection has been written for that phase yet.
  const promptablePhase = useMemo(() => {
    if (!data) return null;
    const reflectedPhases = new Set(
      data.reflections.map((r) => r.phase).filter((n): n is number => !!n),
    );
    for (const p of data.phases) {
      if (!p.unlocked) continue;
      if (p.mastered >= 3 && !reflectedPhases.has(p.phase)) return p.phase;
    }
    return null;
  }, [data]);

  useEffect(() => {
    if (promptablePhase && !reflectOpen) {
      setReflectPhase(promptablePhase);
      setReflectOpen(true);
    }
  }, [promptablePhase, reflectOpen]);

  const submit = useMutation({
    mutationFn: (vars: { phase: number; prompt: string; answer: string }) =>
      submitFn({ data: vars }),
    onSuccess: () => {
      toast.success("Reflection saved.");
      setReflectOpen(false);
      setAnswer("");
      qc.invalidateQueries({ queryKey: ["learning-journey"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const overall = data
    ? Math.round((data.mastered / Math.max(1, data.total)) * 100)
    : 0;

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Atlas / Learning Journey
        </div>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
            Your competencies
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
          >
            {backfill.isPending ? "Syncing…" : "Sync past work"}
          </Button>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every artefact you submit, every email you send, every status report
          you file builds a competency. Mastered means the work passed sponsor
          standard. Drafting means it's recognised but not yet at the bar.
        </p>
      </header>

      {/* Top dashboard */}
      <section className="grid gap-6 rounded-lg border border-border bg-card p-6 md:grid-cols-[auto_1fr]">
        <div className="relative flex items-center justify-center">
          <ProgressRing pct={overall} />
          <div className="absolute text-center">
            <div className="font-display text-3xl font-medium">{overall}%</div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Mastered
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Current phase"
            value={
              data
                ? `Phase ${data.current_phase}: ${
                    data.phases.find((p) => p.phase === data.current_phase)?.title ?? ""
                  }`
                : "—"
            }
          />
          <Stat
            label="Skills snapshot"
            value={
              data
                ? `${data.mastered} mastered · ${data.drafting} in progress · ${data.locked} locked`
                : "—"
            }
          />
          <Stat
            label="Total competencies"
            value={data ? `${data.mastered}/${data.total}` : "—"}
          />
        </div>
      </section>

      {/* Phase cards */}
      <section className="space-y-4">
        {(data?.phases ?? []).map((p) => (
          <PhaseCard key={p.phase} phase={p} />
        ))}
      </section>

      {/* Reflection journal */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Reflection journal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Short reflections after each phase. Future-you will read these in interviews.
            </p>
          </div>
          {data && data.phases.find((p) => p.unlocked) ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setReflectPhase(data.current_phase);
                setReflectOpen(true);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Write reflection
            </Button>
          ) : null}
        </div>
        <ul className="mt-6 space-y-4">
          {(data?.reflections ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">
              No reflections yet. Master 3 competencies in a phase to be prompted.
            </li>
          )}
          {(data?.reflections ?? []).map((r) => (
            <li key={r.id} className="border-l-2 border-primary pl-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Phase {r.phase ?? "—"} ·{" "}
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
              </div>
              <div className="mt-1 text-sm font-medium">{r.prompt}</div>
              <div className="mt-1 text-sm text-muted-foreground">{r.answer}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* Reflection modal */}
      <Dialog open={reflectOpen} onOpenChange={setReflectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reflect — Phase {reflectPhase ?? data?.current_phase ?? 1}
            </DialogTitle>
            <DialogDescription>
              {reflectPhase ? reflectionPromptFor(reflectPhase) : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="One or two sentences is enough."
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReflectOpen(false)}
              disabled={submit.isPending}
            >
              Skip
            </Button>
            <Button
              onClick={() =>
                reflectPhase &&
                submit.mutate({
                  phase: reflectPhase,
                  prompt: reflectionPromptFor(reflectPhase),
                  answer: answer.trim(),
                })
              }
              disabled={submit.isPending || answer.trim().length < 3 || !reflectPhase}
            >
              Save reflection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-base">{value}</div>
    </div>
  );
}

function PhaseCard({ phase: p }: { phase: Phase }) {
  const [open, setOpen] = useState(p.unlocked && p.completion < 100);
  const status = !p.unlocked
    ? "LOCKED"
    : p.completion >= 100
    ? "COMPLETED"
    : "ACTIVE";
  const badgeClass: Record<string, string> = {
    LOCKED: "bg-muted text-muted-foreground border-border",
    ACTIVE: "bg-primary/15 text-primary border-primary/40",
    COMPLETED:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border bg-card"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
          disabled={!p.unlocked}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Phase {p.phase}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClass[status]}`}
              >
                {status}
              </span>
            </div>
            <div className="mt-1 font-display text-lg font-medium">
              {p.unlocked ? p.title : "???"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {p.unlocked
                ? `${p.mastered}/${p.total} mastered · ${p.completion}%`
                : p.unlock_hint}
            </div>
            {p.unlocked ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${p.completion}%` }}
                />
              </div>
            ) : null}
          </div>
          {p.unlocked ? (
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="grid gap-2 border-t border-border p-5 sm:grid-cols-2">
          {p.competencies.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              {c.status === "mastered" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : c.status === "drafting" ? (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={
                    c.status === "locked"
                      ? "select-none text-muted-foreground/60 blur-[2px]"
                      : ""
                  }
                >
                  {c.status === "locked" ? "Hidden competency" : c.label}
                </div>
                {c.status === "mastered" && c.mastered_at ? (
                  <div className="text-xs text-muted-foreground">
                    Completed {formatDistanceToNow(new Date(c.mastered_at), { addSuffix: true })}
                  </div>
                ) : c.status === "drafting" ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    In progress
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}