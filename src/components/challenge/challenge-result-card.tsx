import * as React from "react";
import atlasMark from "@/assets/atlas-mark.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * 1080 x 1080 shareable result card for "The 18:00 Friday Crisis".
 * Rendered off-screen at full size and rasterised with html2canvas.
 */
export const ChallengeResultCard = React.forwardRef<
  HTMLDivElement,
  { total: number; tier: string; strongest: string; className?: string }
>(function ChallengeResultCard({ total, tier, strongest, className }, ref) {
  return (
    <div
      ref={ref}
      style={{ width: 1080, height: 1080 }}
      className={cn("relative flex flex-col overflow-hidden bg-surface-cream p-16", className)}
    >
      <div className="pointer-events-none absolute -right-40 -top-32 h-[420px] w-[420px] rounded-full border border-surface-cream-border" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-[320px] w-[320px] rounded-full bg-surface-orange" />

      <div className="relative flex items-center gap-5">
        <img src={atlasMark.url} alt="" className="h-14 w-14 object-contain" />
        <span className="font-display text-3xl font-medium tracking-[0.42em] text-foreground">
          ATLAS
        </span>
        <span className="h-px flex-1 bg-surface-cream-border" />
      </div>

      <div className="relative mt-12 flex flex-1 flex-col rounded-[3rem] bg-navy px-16 py-14 text-navy-foreground shadow-[var(--shadow-soft-lift)]">
        <p className="text-xl font-medium uppercase tracking-[0.34em] text-surface-orange-accent">
          The 18:00 Friday Crisis
        </p>
        <p className="mt-10 font-display text-[10rem] font-medium leading-none">
          {total}
          <span className="text-[0.34em] text-navy-foreground/55">/100</span>
        </p>
        <p className="mt-6 font-display text-5xl font-medium leading-tight tracking-tight">{tier}</p>
        <div className="mt-auto space-y-3 border-t border-navy-foreground/15 pt-10 text-2xl leading-relaxed text-navy-foreground/85">
          <p>
            Strongest competency:{" "}
            <span className="text-surface-orange-accent">{strongest}</span>
          </p>
          <p className="font-medium text-navy-foreground">I survived the Friday Crisis.</p>
          <p>Can you beat my score?</p>
        </div>
      </div>

      <div className="relative flex items-end justify-between pt-10 text-xl uppercase tracking-[0.2em] text-foreground/55">
        <span>3-minute project challenge</span>
        <span className="text-surface-cream-accent">atlassim.co/challenge/friday-crisis</span>
      </div>
    </div>
  );
});
