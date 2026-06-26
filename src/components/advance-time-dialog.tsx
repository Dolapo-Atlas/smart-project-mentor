import { useState, useRef } from "react";
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
import { ReadAloudButton } from "@/components/read-aloud-button";
import { useVoiceSettings, useSpeech, voiceForStakeholder } from "@/lib/voice";
import { useEffect, useMemo } from "react";

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
  const { settings } = useVoiceSettings();
  const { play, stop } = useSpeech();
  const playedRef = useRef(false);

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

  const briefingText = useMemo(() => {
    if (!data) return "";
    const items: string[] = [];
    if (data.unreadInbox.length) items.push(`${data.unreadInbox.length} unread stakeholder messages`);
    if (data.openTasks.length) items.push(`${data.openTasks.length} open tasks`);
    if (data.unsubmittedDocs.length) items.push(`${data.unsubmittedDocs.length} unsubmitted documents`);
    if (data.meetingsMissingMinutes.length) items.push(`${data.meetingsMissingMinutes.length} meetings missing minutes`);
    if (data.openHighRisks.length) items.push(`${data.openHighRisks.length} open high-severity risks`);
    if (data.frustratedStakeholders.length) items.push(`${data.frustratedStakeholders.length} frustrated stakeholders`);
    if (items.length === 0) {
      return `All clear. No unresolved items before moving to ${MODE_LABEL[mode]}.`;
    }
    const list = items.length === 1
      ? items[0]
      : items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
    return `Before we continue to ${MODE_LABEL[mode]}, you still have ${list}. What would you like to do — resolve these actions, or continue anyway?`;
  }, [data, mode]);

  // Reset the "already played" guard whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      playedRef.current = false;
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-play briefing once per open, when enabled and blockers exist.
  useEffect(() => {
    if (!open || !data || !briefingText) return;
    if (!settings.enabled || !settings.readBriefings) return;
    if (blockerCount === 0) return;
    if (playedRef.current) return;
    playedRef.current = true;
    play(briefingText, {
      voice: voiceForStakeholder("Project Update"),
      volume: settings.volume,
      speed: settings.speed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data, briefingText, settings.enabled, settings.readBriefings]);

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
            <BlockerRow icon={ShieldAlert} label="Open high-severity risks" count={data.openHighRisks.length} to="/app/raid" onClose={() => onOpenChange(false)} />
            <BlockerRow icon={Frown} label="Frustrated stakeholders" count={data.frustratedStakeholders.length} to="/app/stakeholders" onClose={() => onOpenChange(false)} />
          </ul>
        ) : null}

        <DialogFooter className="gap-2">
          {briefingText && blockerCount > 0 ? (
            <ReadAloudButton
              text={briefingText}
              stakeholder="Project Update"
              label="Read briefing"
              variant="ghost"
            />
          ) : null}
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