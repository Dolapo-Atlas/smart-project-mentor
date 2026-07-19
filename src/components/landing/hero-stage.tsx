import { useEffect, useRef } from "react";
import {
  Home,
  Inbox,
  ListChecks,
  Users,
  FileText,
  Rocket,
  MoreHorizontal,
  LogOut,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Mail,
} from "lucide-react";
import atlasLogo from "@/assets/atlas-logo.png.asset.json";

/**
 * Landing hero "live workspace" scene.
 * Purely presentational — mirrors the real Atlas dashboard shell,
 * with three floating cards drifting on independent timers.
 */
export function HeroStage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const inboxRef = useRef<HTMLDivElement | null>(null);
  const taskRef = useRef<HTMLDivElement | null>(null);
  const raidRef = useRef<HTMLDivElement | null>(null);

  // Very subtle pointer parallax on desktop.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      tx = nx;
      ty = ny;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (taskRef.current) {
          taskRef.current.style.setProperty("--px", `${tx * 6}px`);
          taskRef.current.style.setProperty("--py", `${ty * 4}px`);
        }
        if (raidRef.current) {
          raidRef.current.style.setProperty("--px", `${tx * -4}px`);
          raidRef.current.style.setProperty("--py", `${ty * 6}px`);
        }
        if (inboxRef.current) {
          inboxRef.current.style.setProperty("--px", `${tx * -6}px`);
          inboxRef.current.style.setProperty("--py", `${ty * -4}px`);
        }
      });
    };
    stage.addEventListener("pointermove", onMove);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={stageRef} className="relative">
      {/* dotted texture, right side */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-6 hidden h-56 w-56 opacity-60 md:block"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--accent-orange) 55%, transparent) 1px, transparent 1.4px)",
          backgroundSize: "12px 12px",
          maskImage: "radial-gradient(closest-side, black, transparent)",
        }}
      />

      {/* Base: browser-framed mini dashboard */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_100px_-40px_rgba(30,25,15,0.35)]">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-background/70 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.17_25)]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.14_85)]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.14_160)]/75" />
          <div className="mx-auto rounded-md bg-muted/70 px-3 py-0.5 text-[10px] text-muted-foreground">
            atlasim.co
          </div>
        </div>

        <div className="grid grid-cols-[132px_1fr] sm:grid-cols-[168px_1fr]">
          {/* Sidebar (navy) */}
          <aside className="relative flex min-h-[420px] flex-col gap-3 bg-[hsl(220_45%_14%)] p-3 text-white">
            <div className="flex items-center gap-2 px-1.5 py-1">
              <img src={atlasLogo.url} alt="" className="h-5 w-5 object-contain" />
              <span className="font-display text-sm font-semibold tracking-tight">Atlas</span>
              <span className="text-white/40">/</span>
            </div>
            <div className="px-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/50">
              Digital Care<br />Records Rollout
            </div>

            <div className="mt-1 space-y-1.5">
              <div className="flex items-center justify-between rounded-md bg-white/[0.06] px-2 py-1.5 text-[10px]">
                <span className="text-white/70">Phase · Initiation</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-white/[0.06] px-2 py-1.5 text-[10px]">
                <span className="text-white/70">Switch project</span>
                <span className="rounded bg-accent-orange/90 px-1 text-[9px] font-semibold text-accent-orange-foreground">1</span>
              </div>
            </div>

            {/* nav tiles */}
            <nav className="mt-1 grid grid-cols-3 gap-1.5">
              <NavTile icon={Home} label="Home" active />
              <NavTile icon={Inbox} label="Inbox" badge={7} />
              <NavTile icon={ListChecks} label="Tasks" badge={7} />
              <NavTile icon={Users} label="People" badge={7} />
              <NavTile icon={FileText} label="Charter" />
              <NavTile icon={Rocket} label="Kick-off gate" />
            </nav>
            <div className="mt-0.5 flex justify-center">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.06] text-white/60">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* phase card */}
            <div className="mt-auto rounded-lg bg-white/[0.06] p-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Phase</div>
              <div className="mt-1 font-display text-sm">Initiation</div>
              <div className="mt-2 text-[9px] uppercase tracking-wider text-white/50">Progress</div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[11%] rounded-full bg-accent-orange animate-[stage-progress_6s_ease-in-out_infinite]" />
              </div>
              <div className="mt-1 text-right text-[9px] text-white/60">11%</div>
            </div>

            <div className="flex items-center gap-1.5 px-1.5 py-1 text-[10px] text-white/60">
              <LogOut className="h-3 w-3" /> Sign out
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-accent-orange">
              Powered by Google Gemini
            </div>
          </aside>

          {/* Main pane */}
          <div className="relative bg-background/60 p-4 sm:p-5">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Digital Care Records Rollout · Day 2 · Wk 1
            </div>
            <h3 className="mt-1 font-display text-xl tracking-tight sm:text-2xl">
              Good afternoon, Dolapo.
            </h3>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Next Day", "Next Week", "Begin Sprint", "→ Steering Committee", "⚑ Go-Live"].map((c, i) => (
                <span
                  key={c}
                  className={
                    "rounded-full border px-2.5 py-1 text-[10px] " +
                    (i >= 3
                      ? "border-accent-orange/40 bg-accent-orange/10 text-accent-orange"
                      : "border-border bg-card text-muted-foreground")
                  }
                >
                  {c}
                </span>
              ))}
            </div>

            {/* Recommended next step card */}
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent-orange" />
                Recommended next step
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Budget / Cost</span>
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-red-600 dark:text-red-400">High</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Ch. 2</span>
              </div>
              <h4 className="mt-2 font-display text-base leading-snug sm:text-lg">
                Draft Resource Plan Revision for Data Remediation
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                → Produce an updated resource allocation sheet and cost-to-complete forecast for the Oakwood site remediation.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Actions remaining <span className="ml-auto tabular-nums">0 of 4</span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[38%] rounded-full bg-accent-orange animate-[stage-progress_6s_ease-in-out_infinite]" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">For Sarah Williams</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(220_45%_14%)] px-3 py-1.5 text-[11px] font-medium text-white"
                >
                  Start task <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Kanban strip */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[
                { l: "To Do", c: "text-muted-foreground" },
                { l: "In Progress", c: "text-accent-orange" },
                { l: "Pending Review", c: "text-amber-600" },
                { l: "Completed", c: "text-emerald-600" },
              ].map((k) => (
                <div key={k.l} className="rounded-md border border-border bg-card px-2 py-1.5">
                  <div className={"text-[9px] font-semibold uppercase tracking-wider " + k.c}>{k.l}</div>
                  <div className="mt-1 h-1 w-full rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating: Inbox popover */}
      <div
        ref={inboxRef}
        className="pointer-events-none absolute -right-4 top-8 hidden w-[260px] rounded-xl border border-border bg-card p-3 shadow-[0_24px_60px_-20px_rgba(30,25,15,0.35)] md:block animate-[stage-float-a_9s_ease-in-out_infinite]"
        style={{ transform: "translate3d(var(--px,0), var(--py,0), 0)" }}
      >
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Inbox</span>
          <span className="rounded-full bg-accent-orange/15 px-1.5 py-0.5 font-semibold text-accent-orange">5 new</span>
        </div>
        <ul className="mt-2 space-y-2">
          {[
            { n: "Margaret Chen", t: "10:42", s: "Stakeholder update", p: "Please review the latest risk log." },
            { n: "James Lin", t: "09:18", s: "Meeting prep", p: "Stakeholder sync at 2pm." },
            { n: "Sarah Williams", t: "08:31", s: "Document shared", p: "RAID log updated." },
          ].map((m) => (
            <li key={m.n} className="flex items-start gap-2">
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-[9px] font-semibold">
                {m.n.split(" ").map((p) => p[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="truncate font-semibold text-foreground">{m.n}</span>
                  <span className="ml-auto text-muted-foreground">{m.t}</span>
                </div>
                <div className="truncate text-[11px] text-foreground">{m.s}</div>
                <div className="truncate text-[10px] text-muted-foreground">{m.p}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/60 pt-2 text-[10px] font-medium text-muted-foreground">
          View all messages <ChevronRight className="h-3 w-3" />
        </div>
      </div>

      {/* Floating: Task in Progress */}
      <div
        ref={taskRef}
        className="pointer-events-none absolute -bottom-8 left-4 hidden w-[280px] rounded-xl border border-border bg-card p-3 shadow-[0_24px_60px_-20px_rgba(30,25,15,0.35)] sm:block animate-[stage-float-b_11s_ease-in-out_infinite]"
        style={{ transform: "translate3d(var(--px,0), var(--py,0), 0)" }}
      >
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Task in progress</span>
          <span className="text-muted-foreground/60">×</span>
        </div>
        <div className="mt-1.5 font-display text-sm leading-snug">
          Update Project Charter<br />Technical Milestones
        </div>
        <div className="mt-2 flex gap-1">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Documentation</span>
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-red-600 dark:text-red-400">Critical</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Ch. 2</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums text-foreground">52%</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[52%] rounded-full bg-accent-orange" />
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          <span>Due this week</span>
          <span className="inline-flex items-center gap-1">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-secondary text-[8px] font-semibold text-foreground">JL</span>
            James Lin
          </span>
        </div>
      </div>

      {/* Floating: RAID Log donut */}
      <div
        ref={raidRef}
        className="pointer-events-none absolute -bottom-10 right-2 hidden w-[240px] rounded-xl border border-border bg-card p-3 shadow-[0_24px_60px_-20px_rgba(30,25,15,0.35)] lg:block animate-[stage-float-c_13s_ease-in-out_infinite]"
        style={{ transform: "translate3d(var(--px,0), var(--py,0), 0)" }}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span>RAID Log · Summary</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <RaidDonut />
          <ul className="flex-1 space-y-1 text-[10px]">
            {[
              { c: "bg-red-500", l: "Risks", n: 12 },
              { c: "bg-amber-500", l: "Actions", n: 10 },
              { c: "bg-sky-500", l: "Issues", n: 6 },
              { c: "bg-emerald-500", l: "Decisions", n: 4 },
            ].map((r) => (
              <li key={r.l} className="flex items-center gap-1.5">
                <span className={"h-1.5 w-1.5 rounded-full " + r.c} />
                <span className="text-muted-foreground">{r.l}</span>
                <span className="ml-auto tabular-nums font-semibold text-foreground">{r.n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes stage-float-a { 0%,100% { margin-top: 0 } 50% { margin-top: -8px } }
        @keyframes stage-float-b { 0%,100% { margin-bottom: 0 } 50% { margin-bottom: 8px } }
        @keyframes stage-float-c { 0%,100% { margin-bottom: 0 } 50% { margin-bottom: -6px } }
        @keyframes stage-progress { 0%,100% { opacity: .9 } 50% { opacity: .55 } }
      `}</style>
    </div>
  );
}

function NavTile({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <div
      className={
        "relative grid place-items-center gap-0.5 rounded-md px-1 py-1.5 text-center text-[8.5px] leading-tight " +
        (active
          ? "bg-white text-[hsl(220_45%_14%)]"
          : "bg-white/[0.04] text-white/75")
      }
    >
      <Icon className={"h-3.5 w-3.5 " + (active ? "text-accent-orange" : "text-white/80")} />
      <span className="line-clamp-1">{label}</span>
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-accent-orange text-[8px] font-bold text-accent-orange-foreground">
          {badge}
        </span>
      )}
    </div>
  );
}

function RaidDonut() {
  const data = [
    { v: 12, c: "#ef4444" },
    { v: 10, c: "#f59e0b" },
    { v: 6, c: "#0ea5e9" },
    { v: 4, c: "#10b981" },
  ];
  const total = data.reduce((a, b) => a + b.v, 0);
  const r = 26;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      {data.map((d, i) => {
        const len = (d.v / total) * C;
        const seg = (
          <circle
            key={i}
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={d.c}
            strokeWidth="10"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-acc}
          />
        );
        acc += len;
        return seg;
      })}
      <text
        x="36"
        y="38"
        textAnchor="middle"
        transform="rotate(90 36 36)"
        className="fill-foreground"
        fontSize="10"
        fontWeight="700"
      >
        {total}
      </text>
    </svg>
  );
}