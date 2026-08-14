import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ActionChip — the Atlas "soft tinted card" action control.
 *
 * Translucent saturated surface + high-radius blur, tinted per tone, with a
 * soft layered shadow, hover lift and a physical press. Used for the dashboard
 * quick actions and the simulation clock controls so both read as one family
 * while staying visually secondary to the navy next-step card.
 */
export type ChipTone = "lilac" | "green" | "cream" | "orange" | "navy" | "neutral";

const TONE: Record<ChipTone, string> = {
  lilac:
    "bg-surface-lilac/70 border-surface-lilac-border/70 [--chip-icon:var(--surface-lilac-accent)]",
  green:
    "bg-surface-green/70 border-surface-green-border/70 [--chip-icon:var(--surface-green-accent)]",
  cream:
    "bg-surface-cream/70 border-surface-cream-border/70 [--chip-icon:var(--surface-cream-accent)]",
  orange:
    "bg-surface-orange/75 border-surface-orange-border/70 [--chip-icon:var(--surface-orange-accent)]",
  navy:
    "bg-surface-navy/70 border-surface-navy-border/70 [--chip-icon:var(--surface-navy-accent)]",
  neutral:
    "bg-surface-neutral/70 border-surface-neutral-border/70 [--chip-icon:var(--surface-neutral-accent)]",
};

export interface ActionChipProps extends React.ComponentProps<"button"> {
  tone?: ChipTone;
  icon?: React.ComponentType<{ className?: string }>;
  /** Renders full-width and centred — used in the clock grid. */
  block?: boolean;
}

export function ActionChip({
  tone = "neutral",
  icon: Icon,
  block = false,
  className,
  children,
  ...props
}: ActionChipProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-left",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-[var(--shadow-soft)] transition-all duration-300",
        "hover:shadow-[var(--shadow-soft-lift)] motion-safe:hover:-translate-y-0.5",
        "motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97]",
        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-60",
        block && "w-full justify-center",
        TONE[tone],
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-4 w-4 shrink-0 text-[var(--chip-icon)] transition-transform duration-300 motion-safe:group-hover:scale-110" />
      ) : null}
      <span className="text-[13px] font-semibold whitespace-nowrap text-foreground">
        {children}
      </span>
    </button>
  );
}

/** Hairline label divider used above a chip cluster. */
export function ChipGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="h-px flex-1 bg-border/70" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  );
}