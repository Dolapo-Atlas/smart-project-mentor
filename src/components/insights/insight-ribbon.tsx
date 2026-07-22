import { Info, RotateCcw, ShieldAlert, Lock, CheckCircle2 } from "lucide-react";

type Tone = "info" | "escalated" | "resolution" | "blocked" | "success";

const TONE_STYLES: Record<Tone, { wrap: string; icon: string }> = {
  info: {
    wrap: "border-navy/20 bg-navy/5 text-navy",
    icon: "text-navy",
  },
  escalated: {
    wrap: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    icon: "text-amber-600",
  },
  resolution: {
    wrap: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    icon: "text-emerald-600",
  },
  blocked: {
    wrap: "border-border bg-muted/40 text-muted-foreground",
    icon: "text-muted-foreground",
  },
  success: {
    wrap: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    icon: "text-emerald-600",
  },
};

const TONE_ICON = {
  info: Info,
  escalated: ShieldAlert,
  resolution: RotateCcw,
  blocked: Lock,
  success: CheckCircle2,
} as const;

/**
 * One-line explainer for a state change on a card ("this happened because…").
 *
 * Use above cards or inside detail sheets when a state transition (blocked,
 * escalated, resolution-received, auto-unblocked) would otherwise look like
 * mysterious system magic to the user.
 */
export function InsightRibbon({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];
  const Icon = TONE_ICON[tone];
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed ${styles.wrap} ${className}`}
      role="note"
    >
      <Icon className={`mt-[1px] h-3 w-3 shrink-0 ${styles.icon}`} />
      <span>{children}</span>
    </div>
  );
}

/**
 * Convenience wrapper that reads a task's description and picks the right
 * ribbon copy for the [Escalated] / [Resolution] markers used by the sim.
 */
export function TaskStateRibbon({
  status,
  description,
  className = "",
}: {
  status: string;
  description?: string | null;
  className?: string;
}) {
  const d = description ?? "";
  if (d.includes("[Resolution]")) {
    return (
      <InsightRibbon tone="resolution" className={className}>
        <span className="font-medium">Resolution received.</span>{" "}
        The person you escalated to has come back to you — resume the task and verify their fix fits the project.
      </InsightRibbon>
    );
  }
  if (d.includes("[Escalated]")) {
    return (
      <InsightRibbon tone="escalated" className={className}>
        <span className="font-medium">Parked with a senior owner.</span>{" "}
        They're unblocking it, but you still own the outcome — expect to verify the resolution when it lands.
      </InsightRibbon>
    );
  }
  if (status === "blocked") {
    return (
      <InsightRibbon tone="blocked" className={className}>
        <span className="font-medium">Blocked by a prerequisite.</span>{" "}
        Clear the dependency task and this one will move itself back to your to-do list automatically.
      </InsightRibbon>
    );
  }
  return null;
}