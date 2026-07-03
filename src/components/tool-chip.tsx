import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ToolChip — a small badge to sprinkle on existing Atlas features so users
 * see the equivalence with industry-standard software. Never rebrands the
 * feature; just adds a subtle "Jira-style" hint.
 *
 * Usage:
 *   <ToolChip family="Jira" />
 *   <ToolChip family="Confluence" hint="Same as a project wiki" />
 */
export function ToolChip({
  family,
  hint,
  className,
}: {
  family: string;
  hint?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
      title={hint ?? `${family}-style workflow`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {family}-style
    </span>
  );
}
