import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { advanceTime, getReadiness } from "@/lib/time.functions";
import { AlertTriangle, Mail, FileText, ListChecks, ClipboardList, ShieldAlert, Frown } from "lucide-react";
import { toast } from "sonner";

type Mode = "day" | "week" | "sprint" | "steerco" | "golive";

const MODE_LABEL: Record<Mode, string> = {
  day: "Next Day",
  week: "Next Week",
  sprint: "Next Sprint",
  steerco: "Steering Committee",
  golive: "Go-Live",
};

export function AdvanceTimeDialog({
  open,
  mode,
  onOpenChange,
}: {
  open: boolean;
  mode: Mode;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const advance = useServerFn(advanceTime);
  const readiness = useServerFn(getReadiness);
  const [data, setData] = useState<Awaited<ReturnType<typeof getReadiness>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Lazy load readiness when opening
  if (open && data === null && !loading) {
    setLoading(true);
    readiness()
      .then((r) => setData(r))
      .finally(() => setLoading(false));
  }
  if (!open && data !== null) {
    // reset on close
    setTimeout(() => setData(null), 200);
  }

  const blockerCount = data?.blockerCount ?? 0;

  async function doAdvance(force: boolean) {
    setAdvancing(true);
    try {
      const res = await advance({ data: { mode, force } });
      if (res.blocked) {
        toast.warning("Resolve blockers or choose Continue Anyway.");
        return;
      }
      const s = res.summary!;
      toast.success(
        `Advanced ${s.days} day${s.days === 1 ? "" : "s"} → Day ${s.toDay}` +
          (s.healthChange ? ` · Health ${s.healthChange.from} → ${s.healthChange.to}` : "") +
          (s.newEmails.length ? ` · ${s.newEmails.length} new email${s.newEmails.length === 1 ? "" : "s"}` : ""),
      );
      qc.invalidateQueries();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to advance time");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Advance time: {MODE_LABEL[mode]}
          </DialogTitle>
          <DialogDescription>
            {blockerCount === 0
              ? "No unresolved items. Ready to move forward."
              : "Before you continue, you still have unresolved items. Time will pass and stakeholders will react."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">Checking readiness…</div>
        ) : data ? (
          <ul className="space-y-2 text-sm">
            <BlockerRow icon={Mail} label="Unread stakeholder messages" count={data.unreadInbox.length} to="/app/inbox" onClose={() => onOpenChange(false)} />
            <BlockerRow icon={ListChecks} label="Open tasks" count={data.openTasks.length} to="/app/tasks" onClose={() => onOpenChange(false)} />
            <BlockerRow icon={FileText} label="Unsubmitted documents" count={data.unsubmittedDocs.length} to="/app/documents" onClose={() => onOpenChange(false)} />
            <BlockerRow icon={ClipboardList} label="Meeting minutes not sent" count={data.meetingsMissingMinutes.length} to="/app/meetings" onClose={() => onOpenChange(false)} />
            <BlockerRow icon={ShieldAlert} label="Open high-severity risks" count={data.openHighRisks.length} to="/app/risk" onClose={() => onOpenChange(false)} />
            <BlockerRow icon={Frown} label="Frustrated stakeholders" count={data.frustratedStakeholders.length} to="/app/stakeholders" onClose={() => onOpenChange(false)} />
          </ul>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={advancing}>
            Review Issues
          </Button>
          <Button onClick={() => doAdvance(true)} disabled={advancing || loading}>
            {advancing ? "Advancing…" : blockerCount === 0 ? `Continue to ${MODE_LABEL[mode]}` : "Continue Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlockerRow({
  icon: Icon,
  label,
  count,
  to,
  onClose,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  to: string;
  onClose: () => void;
}) {
  const active = count > 0;
  return (
    <li
      className={`flex items-center justify-between rounded-md border px-3 py-2 ${
        active ? "border-amber-500/40 bg-amber-500/5" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${active ? "text-amber-600" : "text-muted-foreground"}`} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-mono text-sm ${active ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
          {count}
        </span>
        {active ? (
          <Link to={to} onClick={onClose} className="text-xs font-medium text-primary hover:underline">
            View →
          </Link>
        ) : null}
      </div>
    </li>
  );
}