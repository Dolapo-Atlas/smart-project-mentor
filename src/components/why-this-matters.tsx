import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  title: string;
  body: React.ReactNode;
  tip?: React.ReactNode;
  /** localStorage key so users can dismiss/collapse per module */
  storageKey?: string;
  defaultOpen?: boolean;
};

/**
 * "Why are you doing this?" explainer used at the top of every artifact
 * module (Charter, RAID, Status Report, Stakeholders, Change Requests,
 * Budget, Meetings, Lessons Learned). Beginner-friendly framing of what
 * the artifact is for in real PM work — not a template description.
 */
export function WhyThisMatters({ title, body, tip, storageKey, defaultOpen = true }: Props) {
  const initial = (() => {
    if (typeof window === "undefined" || !storageKey) return defaultOpen;
    const v = window.localStorage.getItem(`why-open:${storageKey}`);
    if (v === null) return defaultOpen;
    return v === "1";
  })();
  const [open, setOpen] = useState(initial);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey && typeof window !== "undefined") {
      window.localStorage.setItem(`why-open:${storageKey}`, next ? "1" : "0");
    }
  };

  return (
    <div className="rounded-lg border border-accent-orange/30 bg-accent-orange/5">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <Lightbulb className="h-4 w-4 shrink-0 text-accent-orange" />
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4 pl-10 text-sm leading-relaxed text-muted-foreground">
          {body}
          {tip && (
            <p className="text-xs text-muted-foreground/80">
              <span className="font-medium">Tip:</span> {tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}