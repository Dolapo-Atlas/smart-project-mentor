import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bell, Send, Sparkles, X } from "lucide-react";
import { askOfficeAtlas } from "@/lib/office-ask.functions";
import officeImg from "@/assets/ridgeway-office-iso.jpg";

export const Route = createFileRoute("/prototype/office")({
  head: () => ({
    meta: [
      { title: "Ridgeway Office Prototype | Atlas" },
      { name: "description", content: "Concept prototype: arrive at work inside Ridgeway Group's Office Relocation project." },
      { property: "og:title", content: "Ridgeway Office Prototype | Atlas" },
      { property: "og:description", content: "Concept prototype of an immersive Atlas workplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfficePrototype,
});

type Zone = {
  id: string;
  name: string;
  x: number; y: number; w: number; h: number; // floor grid %
  tone: string;
  blurb: string;
  furniture: "desk" | "desks" | "table" | "wall" | "pm";
};

const ZONES: Zone[] = [
  { id: "wall", name: "Project Wall", x: 4, y: 4, w: 26, h: 20, tone: "bg-surface-navy border-surface-navy-border", furniture: "wall",
    blurb: "The live project position: status, move date, open risks and issues, and the next milestone." },
  { id: "meeting", name: "Meeting Room", x: 34, y: 4, w: 32, h: 26, tone: "bg-surface-lilac border-surface-lilac-border", furniture: "table",
    blurb: "Where project meetings and Steering Committee sessions will take place later in the project." },
  { id: "finance", name: "Finance", x: 70, y: 4, w: 26, h: 22, tone: "bg-surface-green border-surface-green-border", furniture: "desks",
    blurb: "Speak with Finance about the £1.65m budget baseline, commitments and cost changes." },
  { id: "pm", name: "Project Manager", x: 4, y: 30, w: 26, h: 26, tone: "bg-surface-orange border-surface-orange-border", furniture: "pm",
    blurb: "Sarah Williams wants to speak with you about an issue requiring investigation." },
  { id: "desk", name: "Your Desk", x: 36, y: 38, w: 28, h: 24, tone: "bg-surface-cream border-surface-cream-border", furniture: "desk",
    blurb: "Your laptop: inbox, tasks and project documents for the relocation." },
  { id: "it", name: "IT", x: 70, y: 32, w: 26, h: 24, tone: "bg-surface-navy border-surface-navy-border", furniture: "desks",
    blurb: "Speak with James Lin, IT Lead. Review technical dependencies and IT readiness." },
  { id: "facilities", name: "Facilities", x: 4, y: 62, w: 30, h: 32, tone: "bg-surface-neutral border-surface-neutral-border", furniture: "desks",
    blurb: "Space planning, building works window and the move vendor — the physical side of the move." },
  { id: "hr", name: "HR", x: 66, y: 62, w: 30, h: 32, tone: "bg-surface-lilac border-surface-lilac-border", furniture: "desks",
    blurb: "Staff concerns, consultation and communications for the 480 people moving." },
];

// Hotspot areas (% of the office illustration)
const HOTSPOTS = [
  { id: "wall", x: 7, y: 4, w: 15, h: 23 },
  { id: "meeting", x: 32, y: 1, w: 35, h: 36 },
  { id: "finance", x: 68, y: 3, w: 29, h: 34 },
  { id: "pm", x: 1, y: 34, w: 29, h: 28 },
  { id: "desk", x: 33, y: 31, w: 22, h: 28 },
  { id: "it", x: 60, y: 34, w: 37, h: 28 },
  { id: "facilities", x: 0, y: 62, w: 45, h: 38 },
  { id: "hr", x: 57, y: 56, w: 41, h: 44 },
];

function Furniture({ kind }: { kind: Zone["furniture"] }) {
  if (kind === "wall")
    return <div className="absolute inset-3 rounded-md bg-navy/90 shadow-soft" />;
  if (kind === "table")
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-1/2 w-2/3 rounded-full bg-card shadow-soft-lift">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="absolute h-3 w-3 rounded-full bg-navy/40"
              style={{ left: `${10 + (i % 3) * 38}%`, top: i < 3 ? "-14px" : "calc(100% + 4px)" }} />
          ))}
        </div>
      </div>
    );
  if (kind === "desk")
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-2/5 w-3/4 rounded-md bg-card shadow-soft-lift">
          <div className="absolute left-1/2 top-1/2 h-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-navy" />
          <div className="absolute left-[12%] top-[25%] h-3 w-4 rounded-sm bg-accent-orange/70" />
          <div className="absolute right-[12%] top-[30%] h-4 w-3 rounded-sm bg-muted-foreground/30" />
        </div>
      </div>
    );
  return (
    <div className="absolute inset-0 grid grid-cols-2 place-items-center gap-2 p-4">
      {[0, 1, 2, 3].slice(0, kind === "pm" ? 2 : 4).map((i) => (
        <div key={i} className="h-6 w-12 rounded-sm bg-card shadow-soft">
          <div className="mx-auto mt-1 h-2 w-4 rounded-[2px] bg-navy/70" />
        </div>
      ))}
    </div>
  );
}

function OfficePrototype() {
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<Zone | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-5 py-2.5 backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy">Office Relocation Project</div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground sm:gap-6">
          <span>Day 1 · Week 1</span>
          <span className="font-medium text-foreground">£1.65m Budget</span>
          <span className="text-accent-orange font-medium">84 Days to Move</span>
          <button aria-label="Notifications" className="relative rounded-full p-1.5 hover:bg-muted">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-orange" />
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-auto p-2 sm:p-4">
        <div className="relative w-full max-w-[1600px] min-w-[720px] overflow-hidden rounded-2xl shadow-soft-lift">
          <img src={officeImg} alt="Ridgeway Group office floor" width={1920} height={1280} className="block h-auto w-full select-none" draggable={false} />
          {HOTSPOTS.map((h) => {
            const z = ZONES.find((zz) => zz.id === h.id)!;
            const active = hover === h.id;
            return (
              <button key={h.id} type="button" aria-label={z.name}
                onMouseEnter={() => setHover(h.id)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(h.id)} onBlur={() => setHover(null)}
                onClick={() => setOpen(z)}
                className={`absolute rounded-xl transition duration-300 ${active ? "bg-accent-orange/10 ring-2 ring-accent-orange/70" : ""}`}
                style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}>
                <span className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-3 py-1 text-[11px] font-medium text-navy-foreground shadow-soft transition ${active ? "opacity-100" : "opacity-0"}`}>{z.name}</span>
              </button>
            );
          })}
          <div className="pointer-events-none absolute" style={{ left: "21%", top: "36%" }}>
            <div className="-translate-x-1/2 animate-bounce whitespace-nowrap rounded-full bg-accent-orange px-3 py-1 text-[11px] font-medium text-accent-orange-foreground shadow-soft">Sarah wants to speak with you</div>
          </div>
        </div>
      </main>

      {open && (
        <div className="fixed bottom-24 left-1/2 z-30 w-[min(90vw,380px)] -translate-x-1/2 rounded-2xl border border-border bg-card p-5 shadow-soft-lift">
          <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-orange">{open.name}</div>
          <p className="mt-2 font-display text-lg leading-snug">{open.blurb}</p>
          <p className="mt-3 text-xs text-muted-foreground">Coming soon in the immersive office.</p>
        </div>
      )}

      {askOpen && <AskAtlasPanel zone={open?.name} onClose={() => setAskOpen(false)} />}

      <button onClick={() => setAskOpen((v) => !v)} aria-expanded={askOpen}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground shadow-soft-lift hover:opacity-90">
        <Sparkles className="h-4 w-4 text-accent-orange" /> Ask Atlas
      </button>
    </div>
  );
}

type Turn = { role: "learner" | "mentor"; content: string };
const SUGGESTIONS = ["What should I do first today?", "What are the biggest risks to the move date?", "Who do I speak to about the budget?"];

function AskAtlasPanel({ zone, onClose }: { zone?: string; onClose: () => void }) {
  const ask = useServerFn(askOfficeAtlas);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = turns;
    setTurns([...history, { role: "learner", content: question }]);
    setQ("");
    setBusy(true);
    try {
      const r = await ask({ data: { question, zone, history } });
      setTurns((t) => [...t, { role: "mentor", content: r.answer }]);
    } catch {
      setTurns((t) => [...t, { role: "mentor", content: "I couldn't answer just now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-5 z-40 flex max-h-[70vh] w-[min(92vw,380px)] flex-col rounded-2xl border border-border bg-card shadow-soft-lift">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Ask Atlas</div>
          <div className="text-[11px] text-muted-foreground">Office Relocation{zone ? ` · ${zone}` : ""}</div>
        </div>
        <button onClick={onClose} aria-label="Close Ask Atlas" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground">Ask anything about the Ridgeway move.</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-muted">{s}</button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "learner" ? "ml-8 rounded-xl bg-navy px-3 py-2 text-navy-foreground" : "mr-4 whitespace-pre-wrap rounded-xl bg-muted px-3 py-2"}>{t.content}</div>
        ))}
        {busy && <div className="mr-4 rounded-xl bg-muted px-3 py-2 text-muted-foreground">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="flex gap-2 border-t border-border p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={600} placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={busy || !q.trim()} aria-label="Send"
          className="rounded-lg bg-navy px-3 text-navy-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function Billboard({ children }: { children: React.ReactNode }) {
  // Counter-rotates the floor tilt so labels and people stand upright.
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 flex flex-col items-center gap-1"
      style={{ transform: "translate(-50%,-100%) rotateZ(32deg) rotateX(-52deg) translateZ(10px)", transformOrigin: "50% 100%" }}>
      {children}
    </div>
  );
}

function Person({ label, tone }: { label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`h-4 w-4 rounded-full ${tone} ring-2 ring-card`} />
      <span className={`-mt-0.5 h-5 w-6 rounded-t-full ${tone} opacity-90`} />
      <span className="mt-0.5 rounded bg-card/90 px-1.5 text-[10px] font-medium shadow-soft">{label}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="opacity-70">{k}</span><span className="font-medium">{v}</span>
    </div>
  );
}
