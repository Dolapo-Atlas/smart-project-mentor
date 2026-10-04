import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Sparkles, X } from "lucide-react";

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

      <main className="relative flex flex-1 items-center justify-center py-10">
        <div className="relative aspect-[4/3] w-[min(92vw,900px)]" style={{ perspective: "1600px" }}>
          <div className="absolute inset-0 rounded-3xl border border-border bg-muted/60 shadow-soft-lift"
            style={{ transform: "rotateX(52deg) rotateZ(-32deg)", transformStyle: "preserve-3d" }}>
            {ZONES.map((z) => {
              const active = hover === z.id;
              return (
                <button key={z.id} type="button"
                  onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(z.id)} onBlur={() => setHover(null)}
                  onClick={() => setOpen(z)} aria-label={z.name}
                  className={`absolute rounded-xl border-2 transition-all duration-300 ${z.tone} ${active ? "shadow-soft-lift ring-2 ring-accent-orange" : ""}`}
                  style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`,
                    transform: active ? "translateZ(14px)" : "translateZ(0)" }}>
                  <Furniture kind={z.furniture} />
                </button>
              );
            })}
          </div>

          {/* Upright labels & overlays (not tilted, so they stay readable) */}
          <Overlay x={18} y={6} >
            <div className="w-44 rounded-lg bg-navy p-3 text-[11px] text-navy-foreground shadow-soft-lift">
              <div className="mb-1.5 font-semibold uppercase tracking-widest opacity-70">Project Wall</div>
              <Row k="Overall status" v={<span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-success" />Green</span>} />
              <Row k="Move date" v="84 days" />
              <Row k="Open risks" v="2" />
              <Row k="Open issues" v="1" />
              <Row k="Next milestone" v="Design Sign-off" />
            </div>
          </Overlay>
          <Overlay x={20} y={40}>
            <div className="animate-bounce rounded-full bg-accent-orange px-3 py-1 text-[11px] font-medium text-accent-orange-foreground shadow-soft">
              Sarah wants to speak with you.
            </div>
            <Person label="Sarah Williams" tone="bg-accent-orange" />
          </Overlay>
          <Overlay x={58} y={62}>
            <Person label="You" tone="bg-navy" />
          </Overlay>

          {ZONES.filter((z) => z.id !== "wall").map((z) => {
            const pos: Record<string, [number, number]> = {
              meeting: [56, 16], finance: [84, 34], pm: [12, 56], desk: [44, 52], it: [80, 60], facilities: [22, 84], hr: [72, 92],
            };
            const [x, y] = pos[z.id];
            return (
              <Overlay key={z.id} x={x} y={y}>
                <span className={`rounded-full border border-border bg-card/90 px-2.5 py-0.5 text-[11px] font-medium shadow-soft transition ${hover === z.id ? "scale-110 text-accent-orange" : "text-foreground/80"}`}>
                  {z.name}
                </span>
              </Overlay>
            );
          })}
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

      <button className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground shadow-soft-lift hover:opacity-90">
        <Sparkles className="h-4 w-4 text-accent-orange" /> Ask Atlas
      </button>
    </div>
  );
}

function Overlay({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
      style={{ left: `${x}%`, top: `${y}%` }}>
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
