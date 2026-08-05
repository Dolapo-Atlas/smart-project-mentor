import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Compass,
  PenLine,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { ATLAS_SIGNATURE } from "@/lib/atlas-voice";
import type { FieldSpec } from "@/lib/templates";

export type FirstTimeMode = "self" | "guided" | "example";

/**
 * Remembers, per deliverable, whether the learner has already seen the
 * "first time writing one?" screen and how they chose to work.
 * Purely presentational — no simulation state is touched.
 */
export function useFirstTimeMode(kind: string) {
  const key = `atlas.first-time.${kind}`;
  const [mode, setModeState] = useState<FirstTimeMode | null>(null);
  const [decided, setDecided] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === "self" || raw === "guided" || raw === "example") {
        setModeState(raw);
        setDecided(true);
      }
    } catch {
      /* storage unavailable */
    }
    setHydrated(true);
  }, [key]);

  const setMode = (next: FirstTimeMode) => {
    setModeState(next);
    setDecided(true);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      /* storage unavailable */
    }
  };

  return { mode, setMode, decided, hydrated } as const;
}

export function FirstTimeChoiceCard({
  label,
  onChoose,
}: {
  label: string;
  onChoose: (mode: FirstTimeMode) => void;
}) {
  const options: { mode: FirstTimeMode; title: string; body: string; icon: typeof PenLine; recommended?: boolean }[] = [
    {
      mode: "self",
      title: "I’ll try it myself",
      body: "Straight to the blank form. You can switch to coaching at any point.",
      icon: PenLine,
    },
    {
      mode: "guided",
      title: "Guide me step-by-step",
      body: "Atlas coaches you through one section at a time. You still make every decision.",
      icon: Compass,
      recommended: true,
    },
    {
      mode: "example",
      title: "Show me an example first",
      body: "See what a good one looks like on a different project, then write yours.",
      icon: BookOpen,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-6 py-6">
        <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
          First time writing one?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That’s completely normal. Most professionals write their first {label}{" "}
          on the job. Today, you’ll write yours in a safe environment.
        </p>
      </div>

      <div className="px-6 py-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          How would you like to continue?
        </div>
        <div className="mt-4 grid gap-3">
          {options.map((o) => (
            <button
              key={o.mode}
              type="button"
              onClick={() => onChoose(o.mode)}
              className="group flex items-start gap-4 rounded-lg border border-border bg-background p-4 text-left transition hover:border-accent-orange/60 hover:bg-accent-orange/5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-orange/12 text-accent-orange">
                <o.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {o.title}
                  {o.recommended && (
                    <span className="rounded-full border border-accent-orange/40 bg-accent-orange/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent-orange">
                      Recommended
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{o.body}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 border-l-2 border-accent-orange/50 pl-3 text-xs italic text-muted-foreground">
          {ATLAS_SIGNATURE}
        </p>
      </div>
    </section>
  );
}

/**
 * Coaching strip for "Guide me step-by-step". It names the next section and
 * repeats the field's own guidance — it never writes the answer.
 */
export function GuidedCoachStrip({
  fields,
  values,
  onDismiss,
}: {
  fields: FieldSpec[];
  values: Record<string, string>;
  onDismiss?: () => void;
}) {
  const filled = (f: FieldSpec) => {
    const v = (values[f.key] ?? "").trim();
    if (!v) return false;
    return v.length >= Math.min(f.minChars ?? 1, 40);
  };
  const total = fields.length;
  const done = fields.filter(filled).length;
  const current = fields.find((f) => !filled(f));

  return (
    <div className="rounded-xl border border-accent-orange/35 bg-accent-orange/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent-orange">
          <Sparkles className="h-3.5 w-3.5" />
          Coaching mode · step {Math.min(done + 1, total)} of {total}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Turn off coaching"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {current ? (
        <div className="mt-3">
          <div className="font-display text-lg leading-snug">
            Next: {current.label}
          </div>
          {current.guidance && (
            <p className="mt-1 text-sm text-foreground/80">{current.guidance}</p>
          )}
          {current.placeholder && (
            <p className="mt-2 text-xs text-muted-foreground">
              Shape to aim for: “{current.placeholder}”
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Write it in your own words — Atlas coaches, it doesn’t write it for
            you. Not sure? Put down your best judgement and the reviewer will
            tell you what a professional would add.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Every section has content. Read it back once, then submit for review.
        </div>
      )}

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background">
        <div
          className="h-full bg-accent-orange transition-all"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

/** Read-only walkthrough of what a strong version looks like. Never auto-fills. */
export function ExampleDialog({
  open,
  onOpenChange,
  label,
  fields,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  fields: FieldSpec[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            What a strong {label} looks like
          </DialogTitle>
          <DialogDescription>
            Section by section — from a different project, so you still have to
            think about yours.
          </DialogDescription>
        </DialogHeader>
        <ol className="mt-2 space-y-4">
          {fields.map((f, i) => (
            <li key={f.key} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Section {i + 1}
              </div>
              <div className="mt-1 text-sm font-medium">{f.label}</div>
              {f.guidance && (
                <p className="mt-1 text-xs text-muted-foreground">{f.guidance}</p>
              )}
              {f.placeholder && (
                <p className="mt-2 border-l-2 border-accent-orange/50 pl-3 text-sm text-foreground/80">
                  {f.placeholder}
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Nothing here is copied into your form — write yours in your own
            words.
          </p>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Got it — let me write mine
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}