import * as React from "react";
import { Check } from "lucide-react";
import type { Milestone } from "@/lib/milestones.functions";
import { SIMULATION_DISCLAIMER } from "@/lib/milestone-copy";
import { cn } from "@/lib/utils";

/**
 * The shareable Atlas milestone card — a premium 4:5 portrait social asset
 * (1080 x 1350). Warm cream field, one elevated deep-navy achievement card,
 * selective orange highlights. Purely presentational: all values arrive
 * already verified from the milestone feed.
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
  const eyebrow =
    m.kind === "gate" ? "Phase Complete" : m.kind === "completion" ? "Project Complete" : "Project Milestone";

  const findSummary = (needle: string) =>
    m.summary.find((s) => s.label.toLowerCase().includes(needle))?.value ?? null;
  const credential = findSummary("credential");
  const deliverables = findSummary("deliverable");
  const duration = findSummary("duration");

  return (
    <div
      ref={ref}
      className={cn(
        "@container relative flex aspect-[4/5] w-full flex-col overflow-hidden bg-surface-cream p-[5%]",
        className,
      )}
    >
      {/* restrained abstract background detail */}
      <div className="pointer-events-none absolute -right-[18%] -top-[12%] h-[45%] w-[45%] rounded-full border border-surface-cream-border" />
      <div className="pointer-events-none absolute -left-[22%] bottom-[6%] h-[38%] w-[38%] rounded-full bg-surface-orange" />

      <div className="relative flex flex-1 flex-col justify-center">
        <div className="flex flex-col rounded-[2rem] bg-navy px-[8%] py-[10%] text-navy-foreground shadow-[var(--shadow-soft-lift)]">
          <div className="flex items-center gap-3">
            <span className="font-display text-[clamp(0.9rem,2.6cqw,1.4rem)] font-medium tracking-[0.4em]">
              ATLAS
            </span>
            <span className="h-px flex-1 bg-navy-foreground/20" />
          </div>

          <p className="mt-[8%] text-[clamp(0.65rem,2.1cqw,1rem)] font-medium uppercase tracking-[0.32em] text-surface-orange-accent">
            {eyebrow}
          </p>

          <h3 className="mt-3 font-display text-[clamp(1.6rem,7cqw,3.4rem)] font-medium leading-[1.05] tracking-tight">
            {m.kind === "gate" ? m.phaseLabel ?? m.title : m.title.replace(/\s+Approved$/i, "")}
            {m.kind !== "completion" && (
              <Check className="ml-3 inline h-[0.7em] w-[0.7em] align-[-0.05em] text-surface-orange-accent" />
            )}
          </h3>

          {m.kind === "completion" ? (
            <>
              <p className="mt-[7%] font-display text-[clamp(2.4rem,11cqw,5rem)] font-medium leading-none">
                {m.score ?? "—"}
                <span className="text-[0.42em] text-navy-foreground/55">/100</span>
              </p>
              {m.grade && (
                <p className="mt-3 text-[clamp(0.8rem,2.6cqw,1.25rem)] font-medium uppercase tracking-[0.3em] text-surface-orange-accent">
                  {m.grade}
                </p>
              )}
            </>
          ) : (
            <p className="mt-[6%] text-[clamp(0.9rem,3cqw,1.4rem)] text-navy-foreground/85">
              {m.kind === "gate"
                ? `Governance Gate: ${m.score != null ? `${m.score}/100` : "Passed"}`
                : m.score != null
                  ? `AI Review: ${m.score}/100`
                  : "Reviewed and approved"}
            </p>
          )}

          <div className="mt-[8%] space-y-2 border-t border-navy-foreground/15 pt-[6%] text-[clamp(0.8rem,2.5cqw,1.2rem)] leading-relaxed text-navy-foreground/80">
            <p className="font-medium text-navy-foreground">{projectName}</p>
            {learnerName && <p>{learnerName}</p>}
            <p>{simulatedRole}</p>
            {m.kind === "completion" ? (
              <>
                {duration && <p>{duration}</p>}
                {deliverables && <p>{deliverables} deliverables completed</p>}
                {credential && credential !== "Not yet issued" && (
                  <p className="flex items-center gap-2 text-surface-orange-accent">
                    <Check className="h-[1em] w-[1em] shrink-0" /> Verified Atlas Credential
                  </p>
                )}
              </>
            ) : (
              m.nextPhaseLabel && <p className="text-surface-orange-accent">Next: {m.nextPhaseLabel} →</p>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-4 pt-[5%] text-[clamp(0.6rem,1.9cqw,0.9rem)] text-foreground/55">
        <span className="uppercase tracking-[0.2em]">{SIMULATION_DISCLAIMER}</span>
        <span className="uppercase tracking-[0.2em] text-surface-cream-accent">atlassim.co</span>
      </div>
    </div>
  );
});
