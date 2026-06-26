import { useEffect, useLayoutEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { markTourCompleted } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Step = {
  selector: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  { selector: '[data-tour="inbox"]', title: "Inbox", body: "This is where stakeholders communicate with you. Every email matters." },
  { selector: '[data-tour="tasks"]', title: "Tasks", body: "Your workload. Deadlines and priorities will shift as the project evolves." },
  { selector: '[data-tour="dashboard"]', title: "Dashboard", body: "Monitor project health. Watch risks. Track budget. Keep an eye on stakeholder confidence." },
  { selector: '[data-tour="documents"]', title: "Documents", body: "Create reports, update documentation and complete project deliverables here." },
  { selector: '[data-tour="stakeholders"]', title: "Stakeholders", body: "Every stakeholder has different personalities and priorities. Managing people is as important as managing projects." },
  { selector: '[data-tour="learning"]', title: "Atlas Mentor", body: "Need help? Atlas has built-in learning and guidance. You never have to leave the workspace." },
];

type Rect = { top: number; left: number; width: number; height: number };

export function GuidedTour({ instanceId, onDone }: { instanceId: string; onDone: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const qc = useQueryClient();
  const markFn = useServerFn(markTourCompleted);
  const mark = useMutation({
    mutationFn: () => markFn({ data: { instanceId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-project"] });
      onDone();
    },
  });

  const step = STEPS[stepIdx];

  useLayoutEffect(() => {
    function measure() {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    const id = window.setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.selector]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function next() {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      mark.mutate();
    }
  }

  function skip() {
    mark.mutate();
  }

  const padding = 8;
  const spotlight = rect
    ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null;

  // Card position: prefer right of spotlight on desktop, fallback to bottom
  const cardWidth = 320;
  const cardGap = 16;
  let cardStyle: React.CSSProperties = {
    position: "fixed",
    width: cardWidth,
    zIndex: 1001,
  };
  if (spotlight) {
    const spaceRight = window.innerWidth - (spotlight.left + spotlight.width + cardGap);
    const spaceBelow = window.innerHeight - (spotlight.top + spotlight.height + cardGap);
    if (spaceRight >= cardWidth) {
      cardStyle.top = Math.max(16, spotlight.top);
      cardStyle.left = spotlight.left + spotlight.width + cardGap;
    } else if (spaceBelow >= 180) {
      cardStyle.top = spotlight.top + spotlight.height + cardGap;
      cardStyle.left = Math.max(16, Math.min(spotlight.left, window.innerWidth - cardWidth - 16));
    } else {
      cardStyle.top = Math.max(16, spotlight.top - 180 - cardGap);
      cardStyle.left = Math.max(16, Math.min(spotlight.left, window.innerWidth - cardWidth - 16));
    }
  } else {
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <div className="fixed inset-0 z-[1000]" aria-modal role="dialog">
      {/* Four overlay rects creating the cutout, or full overlay if no target */}
      {spotlight ? (
        <>
          <div className="fixed bg-black/60" style={{ top: 0, left: 0, right: 0, height: spotlight.top }} />
          <div className="fixed bg-black/60" style={{ top: spotlight.top + spotlight.height, left: 0, right: 0, bottom: 0 }} />
          <div className="fixed bg-black/60" style={{ top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height }} />
          <div className="fixed bg-black/60" style={{ top: spotlight.top, left: spotlight.left + spotlight.width, right: 0, height: spotlight.height }} />
          <div
            className="pointer-events-none fixed rounded-lg ring-2 ring-primary/80 shadow-[0_0_0_4px_rgba(0,0,0,0.4)] transition-all duration-200"
            style={spotlight}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      <div
        style={cardStyle}
        className="rounded-lg border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Step {stepIdx + 1} of {STEPS.length}
          </div>
          <button
            type="button"
            onClick={skip}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-2 font-display text-lg">{step.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            className="text-xs text-muted-foreground transition hover:text-foreground"
          >
            Skip tour
          </button>
          <Button size="sm" onClick={next} disabled={mark.isPending}>
            {stepIdx === STEPS.length - 1 ? "Finish tour" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}