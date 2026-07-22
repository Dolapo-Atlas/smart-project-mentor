import { Lightbulb } from "lucide-react";
import { getInsight, type InsightKey } from "@/lib/pm-insights";

/**
 * Inline "senior PM whispering in your ear" note.
 *
 * Sits under primary action buttons to explain WHY the action matters, without
 * requiring the user to click into the Mentor. Muted styling on purpose — it
 * should feel like a footnote, not a warning.
 */
export function RationaleChip({
  insight,
  text,
  className = "",
}: {
  /** Key from the PM insights registry. */
  insight?: InsightKey;
  /** Free-form override. Ignored when `insight` is provided. */
  text?: string;
  className?: string;
}) {
  const body = insight ? getInsight(insight).rationale : text;
  if (!body) return null;
  return (
    <p
      className={`flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground ${className}`}
      role="note"
    >
      <Lightbulb className="mt-[1px] h-3 w-3 shrink-0 text-accent-orange" />
      <span>
        <span className="font-medium text-foreground/70">Why this matters — </span>
        {body}
      </span>
    </p>
  );
}