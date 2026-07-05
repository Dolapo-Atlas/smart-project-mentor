import { useEffect, useRef, useState } from "react";
import { Mail, Sparkles, CheckCircle2, ArrowUpRight, ArrowDownRight, Pause, Play, RotateCw } from "lucide-react";

/**
 * Auto-playing scripted "in-page demo" for the Atlas landing page.
 * Three acts on a ~22s loop. No real product footage — choreographed
 * brand motion that mirrors the real app flow.
 *   ACT 1 (0–6s)   Email from Margaret arrives, opens.
 *   ACT 2 (6–13s)  Three linked tasks materialize; coordinator submits one.
 *   ACT 3 (13–22s) AI scorecard appears; stakeholder sentiment shifts.
 */

// Total beats (in ms from loop start)
const BEATS = {
  emailArrive: 900,
  emailOpen: 3400,
  tasksAppear: 7800,
  taskFocus: 10800,
  submit: 13800,
  scorecard: 16400,
  sentiment: 20000,
  dayAdvance: 25000,
  reset: 29500,
} as const;

const LOOP_MS = 31000;

export function AutoDemo() {
  // `t` only re-renders when a beat boundary is crossed. The progress bar and
  // the ticking clock are updated directly via refs to avoid a 60fps React
  // re-render of the entire demo section (which was making the whole page
  // feel unresponsive to hover and clicks).
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (paused) return;
    const beatValues = Object.values(BEATS) as number[];
    const start = performance.now() - t;
    let raf = 0;
    let lastBeatIdx = -1;
    for (let i = 0; i < beatValues.length; i++) {
      if (t >= beatValues[i]) lastBeatIdx = i;
    }
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= LOOP_MS) {
        setT(0);
        setCycle((c) => c + 1);
        return;
      }
      // Direct DOM updates — cheap, no React reconciliation.
      if (progressRef.current) {
        progressRef.current.style.width = `${Math.min(100, (elapsed / LOOP_MS) * 100)}%`;
      }
      if (clockRef.current) {
        clockRef.current.textContent = `09:${(Math.floor(elapsed / 1000) + 12)
          .toString()
          .padStart(2, "0")}`;
      }
      // Only re-render React when we cross a beat boundary.
      let idx = -1;
      for (let i = 0; i < beatValues.length; i++) {
        if (elapsed >= beatValues[i]) idx = i;
      }
      if (idx !== lastBeatIdx) {
        lastBeatIdx = idx;
        setT(elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, cycle]);

  const after = (ms: number) => t >= ms;

  // Derived states
  const showEmail = after(BEATS.emailArrive);
  const emailOpen = after(BEATS.emailOpen);
  const showTasks = after(BEATS.tasksAppear);
  const focusTask = after(BEATS.taskFocus);
  const submitted = after(BEATS.submit);
  const showScores = after(BEATS.scorecard);
  const sentimentShift = after(BEATS.sentiment);
  const dayAdvanced = after(BEATS.dayAdvance);

  // Active "act" label
  const act = !showTasks ? 1 : !showScores ? 2 : 3;

  // Progress bar
  const progress = Math.min(100, (t / LOOP_MS) * 100);

  return (
    <section id="demo" className="relative border-y border-border/60 bg-gradient-to-b from-background via-card/30 to-background py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground/80">
              Live demo · plays in your browser
            </div>
            <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
              A Monday morning at Atlas, in 30 seconds.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              One stakeholder email. Three tasks generated. One submission. The simulation reacts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-foreground/5 px-2.5 py-1 font-medium">Act {act} of 3</span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition hover:bg-accent"
              aria-label={paused ? "Play demo" : "Pause demo"}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setT(0);
                setCycle((c) => c + 1);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition hover:bg-accent"
              aria-label="Restart demo"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card/70 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] backdrop-blur">
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              atlas · {dayAdvanced ? "tuesday" : "monday"} · wk {dayAdvanced ? 4 : 3}
            </div>
            <div ref={clockRef} className="text-[10px] text-muted-foreground tabular-nums">09:12</div>
          </div>

          {/* Body */}
          <div className="grid min-h-[460px] grid-cols-1 md:grid-cols-[1.05fr_1fr]">
            {/* LEFT: inbox + email */}
            <div className="border-b border-border/60 p-5 md:border-b-0 md:border-r">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Inbox · {showEmail ? "1 new" : "0 new"}
              </div>

              {/* Empty state placeholder */}
              {!showEmail && (
                <div className="grid h-[380px] place-items-center rounded-lg border border-dashed border-border bg-background/40 text-xs text-muted-foreground">
                  Waiting for stakeholder activity…
                </div>
              )}

              {/* Email row */}
              {showEmail && (
                <div
                  className={`rounded-lg border bg-background transition-all duration-500 ${
                    emailOpen ? "border-primary/40 shadow-[0_0_0_3px_rgba(217,119,6,0.08)]" : "border-border"
                  }`}
                  style={{
                    transform: showEmail ? "translateY(0)" : "translateY(8px)",
                    opacity: showEmail ? 1 : 0,
                  }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple-500/15 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                      MC
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">Margaret Chen <span className="text-xs font-normal text-muted-foreground">· Sponsor</span></div>
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
                          Urgent
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-medium">Friday status report — board call</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        Need the pack updated before Friday. RAID owners are missing — please refresh and confirm Q3 budget variance.
                      </p>
                    </div>
                  </div>

                  {/* Expanded body */}
                  <div
                    className="grid overflow-hidden transition-[grid-template-rows] duration-500 ease-out"
                    style={{ gridTemplateRows: emailOpen ? "1fr" : "0fr" }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t border-border/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                        "Three things I need: refreshed status pack, owners on the top risks, and a budget reforecast.
                        I'm presenting to the board Friday — don't make me chase."
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Day advance toast */}
              {dayAdvanced && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400 animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Day advanced — Margaret reviewed your submission overnight.
                </div>
              )}
            </div>

            {/* RIGHT: tasks → submission → AI score → sentiment */}
            <div className="relative p-5">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Linked work
              </div>

              {!showTasks && (
                <div className="grid h-[380px] place-items-center rounded-lg border border-dashed border-border bg-background/40 px-6 text-center text-xs text-muted-foreground">
                  Reading the email…<br />
                  <span className="mt-1 text-[10px]">Atlas turns stakeholder messages into concrete coordinator tasks.</span>
                </div>
              )}

              {showTasks && (
                <div className="space-y-2">
                  {TASKS.map((task, i) => {
                    const visible = t >= BEATS.tasksAppear + i * 350;
                    const isFocus = focusTask && i === 0;
                    const isDone = submitted && i === 0;
                    return (
                      <div
                        key={task.title}
                        className={`flex items-start gap-3 rounded-lg border bg-background p-3 transition-all duration-500 ${
                          isFocus ? "border-primary/50 shadow-[0_0_0_3px_rgba(217,119,6,0.08)]" : "border-border"
                        }`}
                        style={{
                          transform: visible ? "translateY(0)" : "translateY(8px)",
                          opacity: visible ? 1 : 0,
                        }}
                      >
                        <div
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                            isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {task.category}
                            </span>
                            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-400">
                              {task.priority}
                            </span>
                          </div>
                          <div className={`mt-1 text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                            {task.title}
                          </div>
                          <div className="text-xs text-muted-foreground">→ {task.action}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AI scorecard overlay */}
              {showScores && (
                <div className="mt-4 rounded-lg border border-border bg-background p-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      AI review · Status pack v1
                    </div>
                    <div className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Approved
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {SCORES.map((s, i) => (
                      <ScoreBar key={s.label} {...s} delay={i * 180} animate={showScores} />
                    ))}
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                    "Strong improvement on governance. Add mitigation owners on R-04 before the board call."
                  </div>
                </div>
              )}

              {/* Sentiment shift */}
              {sentimentShift && (
                <div className="mt-4 rounded-lg border border-border bg-background p-3 animate-fade-in">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Stakeholder reaction
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <SentimentRow name="Margaret Chen" role="Sponsor" delta={+8} initials="MC" tone="up" />
                    <SentimentRow name="Priya Patel" role="Finance" delta={+3} initials="PP" tone="up" />
                    <SentimentRow name="David Okafor" role="Operations" delta={-2} initials="DO" tone="down" />
                    <SentimentRow name="Rachel Stone" role="Clinical Governance" delta={+5} initials="RS" tone="up" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-1 w-full overflow-hidden bg-muted">
            <div
              ref={progressRef}
              className="h-full bg-primary"
              style={{ width: "0%" }}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Choreographed preview. The live product responds the same way to your decisions.
        </p>
      </div>
    </section>
  );
}

const TASKS = [
  { title: "Draft Friday status report", action: "Refresh RAG, achievements, plans", category: "Reporting", priority: "Critical" },
  { title: "Refresh RAID owners", action: "Assign mitigation owners on R-03, R-04", category: "RAID", priority: "High" },
  { title: "Confirm Q3 budget variance", action: "Reconcile against finance forecast", category: "Budget", priority: "High" },
];

const SCORES = [
  { label: "Clarity", value: 84, prev: 71 },
  { label: "Completeness", value: 78, prev: 62 },
  { label: "Governance", value: 69, prev: 41 },
];

function ScoreBar({ label, value, prev, delay, animate }: { label: string; value: number; prev: number; delay: number; animate: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="line-through opacity-50">{prev}</span>
          <span className="mx-1">→</span>
          <span className="font-semibold text-foreground">{value}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: animate ? `${value}%` : `${prev}%`, transitionDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

function SentimentRow({
  name,
  role,
  delta,
  initials,
  tone,
}: {
  name: string;
  role: string;
  delta: number;
  initials: string;
  tone: "up" | "down";
}) {
  const Icon = tone === "up" ? ArrowUpRight : ArrowDownRight;
  const color =
    tone === "up"
      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15"
      : "text-red-700 dark:text-red-400 bg-red-500/15";
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-6 w-6 place-items-center rounded-full bg-foreground/5 text-[9px] font-semibold">
        {initials}
      </div>
      <div className="min-w-0 flex-1 text-xs">
        <span className="font-medium">{name}</span>
        <span className="ml-1 text-muted-foreground">· {role}</span>
      </div>
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
        <Icon className="h-2.5 w-2.5" />
        {delta > 0 ? `+${delta}` : delta}
      </span>
    </div>
  );
}