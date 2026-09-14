import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATES } from "@/lib/templates";
import { trackLearner } from "@/lib/learner-events";
import { toast } from "sonner";

type FieldSpec = (typeof TEMPLATES)["project_charter"]["fields"][number];

type StepDef = {
  id: string;
  title: string;
  instruction: string;
  /** Where in the Project Initiation Pack the learner can look. */
  pointer: string;
  /** Short reflective questions — never answers. */
  prompts: string[];
  keys: string[];
};

/**
 * Mobile-first step definitions. The keys map 1:1 onto the canonical charter
 * template fields, so the Guided Builder and the Full Workspace produce the
 * exact same document and are scored by the same rubric.
 */
const STEPS: StepDef[] = [
  {
    id: "purpose",
    title: "Purpose and problem",
    instruction:
      "Name the project, then explain in your own words why it exists and what problem it solves.",
    pointer: "Initiation Pack → Background and business driver.",
    prompts: [
      "What is going wrong today that this project fixes?",
      "Who feels that problem most?",
    ],
    keys: ["title", "purpose"],
  },
  {
    id: "objectives",
    title: "Objectives",
    instruction: "Write 3–5 objectives. Each one should say what, how much, and by when.",
    pointer: "Initiation Pack → Objectives and expected benefits.",
    prompts: ["Could someone measure this objective?", "Is the deadline realistic?"],
    keys: ["objectives"],
  },
  {
    id: "scope",
    title: "Scope — in and out",
    instruction:
      "List what this project will deliver, and just as importantly what it will not.",
    pointer: "Initiation Pack → Scope, and the vendor/technical notes.",
    prompts: [
      "What might a stakeholder assume is included when it isn't?",
      "Which request would you push to a later phase?",
    ],
    keys: ["scope_in", "scope_out"],
  },
  {
    id: "people",
    title: "Sponsor and key stakeholders",
    instruction: "Name the sponsor, then list the people who can make or break delivery.",
    pointer: "Initiation Pack → Governance and the People workspace.",
    prompts: ["Who signs off decisions?", "Whose day changes when this goes live?"],
    keys: ["sponsor", "key_stakeholders"],
  },
  {
    id: "milestones",
    title: "Milestones",
    instruction: "Give the high-level milestones with dates — the sponsor's view, not a task list.",
    pointer: "Initiation Pack → Timeline and key dates.",
    prompts: ["What has to be true before go-live?", "Which date is fixed and which can move?"],
    keys: ["milestones"],
  },
  {
    id: "success",
    title: "Success criteria",
    instruction: "Describe how you will judge whether this project actually succeeded.",
    pointer: "Initiation Pack → Expected benefits.",
    prompts: ["What number will you point to?", "When will you measure it?"],
    keys: ["success_criteria"],
  },
  {
    id: "risks",
    title: "Key risks and assumptions",
    instruction: "List the risks you already know about today, with a first-pass owner each.",
    pointer: "Initiation Pack → Known risks and constraints.",
    prompts: ["What are you assuming is true but haven't confirmed?", "Who owns each risk?"],
    keys: ["initial_risks"],
  },
  { id: "review", title: "Review and submit", instruction: "", pointer: "", prompts: [], keys: [] },
];

export const CHARTER_REFLECTION_KEY = "key_decision";

/** Local, non-generative tidy-up: whitespace, sentence case, bullet alignment. */
function tidy(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l, i, arr) => l.length > 0 || (i > 0 && arr[i - 1]!.length > 0));
  return lines
    .map((line) => {
      if (!line) return line;
      let l = line.replace(/\s{2,}/g, " ");
      l = l.replace(/^[-*•]\s*/, "- ");
      const body = l.replace(/^- /, "");
      const cased = body.charAt(0).toUpperCase() + body.slice(1);
      return l.startsWith("- ") ? `- ${cased}` : cased;
    })
    .join("\n")
    .trim();
}

/** Voice-to-text where the browser supports it. Transcript is never auto-saved
 * without the learner seeing it — it lands in the field for review. */
function useDictation(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const supported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += e.results[i][0].transcript;
      }
      if (chunk.trim()) onText(chunk.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [onText, supported]);

  useEffect(() => () => stop(), [stop]);
  return { supported, listening, start, stop };
}

type Rag = "red" | "amber" | "green";

function stepRag(step: StepDef, fields: FieldSpec[], values: Record<string, string>): Rag {
  const specs = fields.filter((f) => step.keys.includes(f.key));
  const required = specs.filter((f) => f.required);
  const filled = required.filter((f) => {
    const v = (values[f.key] ?? "").trim();
    return v.length >= (f.minChars ?? 1);
  });
  const anyContent = specs.some((f) => (values[f.key] ?? "").trim().length > 0);
  if (required.length > 0 && filled.length === required.length) return "green";
  if (anyContent) return "amber";
  return "red";
}

const RAG_STYLE: Record<Rag, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-muted-foreground/30",
};

export function GuidedCharterBuilder(props: {
  charterId: string;
  values: Record<string, string>;
  setField: (key: string, value: string) => void;
  lockedKeys?: Set<string>;
  completionPct: number;
  saving: boolean;
  dirty: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onUnlockNeeded?: () => void;
  onOpenPack: () => void;
  onSwitchToFull: () => void;
}) {
  const {
    charterId,
    values,
    setField,
    lockedKeys,
    completionPct,
    saving,
    dirty,
    canSubmit,
    submitting,
    onSubmit,
    onUnlockNeeded,
    onOpenPack,
    onSwitchToFull,
  } = props;

  const fields = TEMPLATES.project_charter.fields as unknown as FieldSpec[];
  const stepKey = `atlas.charter-step.${charterId}`;

  const rags = useMemo(
    () => STEPS.map((s) => stepRag(s, fields, values)),
    [fields, values],
  );

  // Resume at the saved step, else the first section that isn't complete.
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let start = 0;
    try {
      const raw = window.localStorage.getItem(stepKey);
      if (raw !== null) start = Math.min(STEPS.length - 1, Math.max(0, Number(raw) || 0));
      else {
        const firstIncomplete = STEPS.findIndex(
          (s, i) => s.id !== "review" && rags[i] !== "green",
        );
        start = firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete;
      }
    } catch {
      start = 0;
    }
    setIndex(start);
    setHydrated(true);
    trackLearner("charter_builder_started", { props: { charter_id: charterId, resumed_step: start } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charterId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(stepKey, String(index));
    } catch {
      /* ignore */
    }
  }, [index, hydrated, stepKey]);

  // Time spent per section + abandonment signal.
  const enteredAt = useRef<number>(Date.now());
  useEffect(() => {
    enteredAt.current = Date.now();
  }, [index]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      const step = STEPS[index];
      if (!step || step.id === "review") return;
      if (rags[index] === "green") return;
      trackLearner("charter_builder_abandoned", {
        props: {
          charter_id: charterId,
          section: step.id,
          step: index + 1,
          seconds_on_section: Math.round((Date.now() - enteredAt.current) / 1000),
        },
      });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [index, rags, charterId]);

  const step = STEPS[index]!;
  const isReview = step.id === "review";

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const dictation = useDictation((text) => {
    if (!activeKey) return;
    const current = values[activeKey] ?? "";
    setField(activeKey, current ? `${current} ${text}` : text);
    toast.info("Transcribed — please read it back and correct anything wrong.");
  });

  const goNext = () => {
    if (!isReview) {
      const seconds = Math.round((Date.now() - enteredAt.current) / 1000);
      // Only counted when the learner's own content is genuinely in the field.
      if (rags[index] === "green") {
        trackLearner("charter_section_completed", {
          props: {
            charter_id: charterId,
            section: step.id,
            step: index + 1,
            seconds_on_section: seconds,
          },
        });
      }
    }
    setIndex((i) => Math.min(STEPS.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reviewedRef = useRef(false);
  useEffect(() => {
    if (isReview && !reviewedRef.current) {
      reviewedRef.current = true;
      trackLearner("charter_draft_reviewed", {
        props: { charter_id: charterId, completion_pct: completionPct },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReview]);

  const reflection = (values[CHARTER_REFLECTION_KEY] ?? "").trim();
  const requiredIncomplete = STEPS.filter(
    (s, i) => s.id !== "review" && rags[i] !== "green",
  ).map((s) => s.title);

  const renderField = (f: FieldSpec) => {
    const locked = lockedKeys?.has(f.key);
    const value = values[f.key] ?? "";
    const min = f.minChars ?? 0;
    if (locked) {
      return (
        <div key={f.key} className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div className="text-sm font-semibold">{f.label}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            This section unlocks with the full experience.
          </p>
          <Button size="sm" className="mt-3" onClick={onUnlockNeeded}>
            Unlock to continue
          </Button>
        </div>
      );
    }
    return (
      <div key={f.key} className="rounded-2xl border border-border bg-card p-4">
        <label className="text-sm font-semibold">
          {f.label}
          {f.required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {f.guidance && <p className="mt-1 text-xs text-muted-foreground">{f.guidance}</p>}
        {f.kind === "text" ? (
          <Input
            className="mt-2 h-12 text-base"
            value={value}
            placeholder={f.placeholder}
            onFocus={() => setActiveKey(f.key)}
            onChange={(e) => setField(f.key, e.target.value)}
          />
        ) : (
          <Textarea
            className="mt-2 min-h-[168px] text-base leading-relaxed"
            value={value}
            placeholder={f.placeholder}
            onFocus={() => setActiveKey(f.key)}
            onChange={(e) => setField(f.key, e.target.value)}
          />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {min > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {value.trim().length} / {min} characters
            </span>
          )}
          {dictation.supported && f.kind !== "text" && (
            <Button
              type="button"
              variant={dictation.listening && activeKey === f.key ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => {
                setActiveKey(f.key);
                dictation.listening ? dictation.stop() : dictation.start();
              }}
            >
              {dictation.listening && activeKey === f.key ? (
                <>
                  <MicOff className="mr-2 h-3.5 w-3.5" /> Stop
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-3.5 w-3.5" /> Speak
                </>
              )}
            </Button>
          )}
          {value.trim().length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => setField(f.key, tidy(value))}
            >
              <Wand2 className="mr-2 h-3.5 w-3.5" /> Tidy my wording
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step {index + 1} of {STEPS.length}
          </div>
          <button
            type="button"
            onClick={onSwitchToFull}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Use full workspace
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.title}
              onClick={() => setIndex(i)}
              className={`h-2 flex-1 rounded-full transition-all ${
                i === index ? "ring-2 ring-accent-orange/50" : ""
              } ${s.id === "review" ? "bg-muted-foreground/20" : RAG_STYLE[rags[i]!]}`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{completionPct}% of the Charter complete</span>
          <span>{saving ? "Saving…" : dirty ? "Autosaving…" : "All changes saved"}</span>
        </div>
      </div>

      {!isReview ? (
        <>
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <h2 className="font-display text-2xl font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{step.instruction}</p>
            <div className="mt-3 rounded-xl border border-border/60 bg-card p-3">
              <div className="flex items-start gap-2 text-xs">
                <Compass className="mt-0.5 h-4 w-4 shrink-0 text-accent-orange" />
                <div>
                  <div className="font-semibold text-foreground">Where to look</div>
                  <p className="mt-0.5 text-muted-foreground">{step.pointer}</p>
                  <Button variant="outline" size="sm" className="mt-2 h-9" onClick={onOpenPack}>
                    Open Project Initiation Pack
                  </Button>
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                {step.prompts.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-orange" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] italic text-muted-foreground">
                Atlas won't write these answers for you — the judgement has to be yours.
              </p>
            </div>
          </div>

          {fields.filter((f) => step.keys.includes(f.key)).map(renderField)}
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <h2 className="font-display text-2xl font-semibold">Review and submit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Read your Charter as your sponsor will read it. You can still edit every section here.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Project Charter
            </div>
            <h3 className="mt-1 font-display text-2xl font-semibold">
              {(values.title ?? "").trim() || "(Untitled charter)"}
            </h3>
            <div className="mt-4 space-y-4">
              {fields
                .filter((f) => f.key !== "title")
                .map((f) => {
                  const v = (values[f.key] ?? "").trim();
                  return (
                    <div key={f.key}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </div>
                      {v ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{v}</p>
                      ) : (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          Still to write
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {requiredIncomplete.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <div className="font-semibold text-amber-800 dark:text-amber-300">
                Still thin in {requiredIncomplete.length}{" "}
                {requiredIncomplete.length === 1 ? "section" : "sections"}
              </div>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                {requiredIncomplete.join(" · ")}
              </p>
            </div>
          )}

          <details className="rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold">Edit any section</summary>
            <div className="mt-4 space-y-4">{fields.map(renderField)}</div>
          </details>

          <div className="rounded-2xl border border-accent-orange/40 bg-accent-orange/5 p-4">
            <label className="text-sm font-semibold">
              What was the most important decision you made in this Charter, and why?
              <span className="ml-1 text-destructive">*</span>
            </label>
            <Textarea
              className="mt-2 min-h-[140px] text-base"
              value={values[CHARTER_REFLECTION_KEY] ?? ""}
              placeholder="Name the decision and the trade-off behind it."
              onFocus={() => setActiveKey(CHARTER_REFLECTION_KEY)}
              onChange={(e) => setField(CHARTER_REFLECTION_KEY, e.target.value)}
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              {reflection.length} / 60 characters
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur lg:static lg:rounded-2xl lg:border lg:p-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1"
            onClick={goBack}
            disabled={index === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {!isReview ? (
            <Button className="h-12 flex-1" onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-12 flex-1"
              onClick={() => {
                if (reflection.length < 60) {
                  toast.error("Answer the closing question before you submit.");
                  return;
                }
                trackLearner("charter_submitted", {
                  props: { charter_id: charterId, completion_pct: completionPct, mode: "guided" },
                });
                onSubmit();
              }}
              disabled={submitting || !canSubmit || reflection.length < 60}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit for approval
            </Button>
          )}
        </div>
        {isReview && !canSubmit && (
          <p className="mx-auto mt-2 flex max-w-3xl items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Complete more of the required sections before
            submitting.
          </p>
        )}
      </div>
    </div>
  );
}
