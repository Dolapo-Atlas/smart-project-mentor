import * as React from "react";
import { Check } from "lucide-react";
import type { Milestone } from "@/lib/milestones.functions";
import { SIMULATION_DISCLAIMER } from "@/lib/milestone-copy";
import { cn } from "@/lib/utils";

/**
 * The shareable Atlas milestone card. Deep navy field, cream type, a single
 * orange accent — no gradients, badges or celebration effects.
 */
export const MilestoneCard = React.forwardRef<
  HTMLDivElement,
  {
    milestone: Milestone;
    learnerName: string;
    simulatedRole: string;
    projectName: string;
    className?: string;
  }
>(function MilestoneCard({ milestone: m, learnerName, simulatedRole, projectName, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex aspect-[4/5] w-full flex-col justify-between overflow-hidden bg-navy p-8 text-navy-foreground sm:aspect-[1.91/1] sm:p-12",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-surface-orange-accent" />

      <div className="flex items-start justify-between gap-6">
        <div className="font-display text-2xl font-medium tracking-[0.3em]">ATLAS</div>
        <div className="text-right text-[10px] uppercase tracking-[0.28em] text-navy-foreground/60">
          {m.kind === "gate"
            ? "Phase Complete"
            : m.kind === "completion"
              ? "Project Complete"
              : "Project Milestone"}
        </div>
      </div>

      <div className="mt-8 min-w-0 flex-1">
        <h3 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
          {m.kind === "gate" ? m.title.toUpperCase() : m.title}
        </h3>
        <p className="mt-2 text-sm text-navy-foreground/75">{projectName}</p>

        {m.items.length > 0 && (
          <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
            {m.items.slice(0, 6).map((it) => (
              <li key={it} className="flex items-start gap-2 text-[13px] text-navy-foreground/85">
                <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-surface-orange-accent" />
                <span className="min-w-0 truncate">{it}</span>
              </li>
            ))}
          </ul>
        )}

        {m.summary.length > 0 && (
          <dl className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {m.summary.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-4 border-b border-navy-foreground/10 pb-1">
                <dt className="text-[11px] uppercase tracking-[0.16em] text-navy-foreground/55">
                  {s.label}
                </dt>
                <dd className="text-[13px] font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {m.kind === "artifact" && (
          <div className="mt-6 space-y-1 text-[13px] text-navy-foreground/80">
            {learnerName && <div className="font-medium text-navy-foreground">{learnerName}</div>}
            <div>Simulated role: {simulatedRole}</div>
            {m.score != null && <div>AI review: {m.score}/100</div>}
          </div>
        )}

        {m.kind !== "artifact" && (
          <div className="mt-5 space-y-1 text-[13px] text-navy-foreground/80">
            {learnerName && <div className="font-medium text-navy-foreground">{learnerName}</div>}
            <div>Simulated role: {simulatedRole}</div>
            {m.nextPhaseLabel && <div>Next: {m.nextPhaseLabel}</div>}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-t border-navy-foreground/15 pt-4">
        <p className="max-w-[26rem] text-[11px] leading-relaxed text-navy-foreground/55">
          Building practical project judgement through simulated workplace experience.
          <br />
          {SIMULATION_DISCLAIMER}
        </p>
        <div className="text-[11px] uppercase tracking-[0.2em] text-surface-orange-accent">
          atlassim.co
        </div>
      </div>
    </div>
  );
});