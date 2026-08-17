import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Share2, Download, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Milestone } from "@/lib/milestones.functions";

/**
 * The restrained success moment: a quiet fade/scale, an elegant check, one
 * orange highlight. No confetti, no trophies.
 */
export function MilestoneAchievedDialog({
  milestone,
  projectName,
  simulatedRole,
  open,
  onOpenChange,
  onShare,
}: {
  milestone: Milestone | null;
  projectName: string;
  simulatedRole: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onShare: () => void;
}) {
  if (!milestone) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-orange ring-1 ring-surface-orange-border shadow-[0_0_0_6px_var(--surface-orange)]">
              <Check className="h-5 w-5 text-surface-orange-accent" />
            </span>
            <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Milestone achieved
            </span>
          </div>

          <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-tight">
            {milestone.title}
          </h2>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div>{projectName}</div>
            <div>Simulated role: {simulatedRole}</div>
            {milestone.score != null && (
              <div>
                {milestone.kind === "artifact" ? "AI review" : "Governance gate"}:{" "}
                <span className="font-medium text-foreground">{milestone.score}/100</span>
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share milestone
            </Button>
            {milestone.deliverableId ? (
              <Button variant="outline" asChild>
                <Link to="/app/deliverables">
                  <Download className="mr-2 h-4 w-4" /> Download work
                </Link>
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Continue project <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}