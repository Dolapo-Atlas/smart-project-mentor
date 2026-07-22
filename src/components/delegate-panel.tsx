import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Users, ShieldAlert, CalendarPlus, UserCog } from "lucide-react";
import { delegateInboxMessage } from "@/lib/delegate.functions";
import { createMeeting } from "@/lib/pm.functions";
import { useRoster, rosterByName, rosterByRole } from "@/lib/roster";
import { insightToast } from "@/lib/insight-toast";
import { RationaleChip } from "@/components/insights/rationale-chip";
import type { InsightKey } from "@/lib/pm-insights";

type Mode = "ask_pm" | "escalate_sponsor" | "assign_lead";

export function DelegatePanel({
  inboxId,
  senderName,
  subject,
}: {
  inboxId: string;
  senderName: string;
  subject: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const delegateFn = useServerFn(delegateInboxMessage);
  const meetingFn = useServerFn(createMeeting);
  const [pendingMode, setPendingMode] = useState<Mode | "meeting" | null>(null);
  const roster = useRoster();
  const byRole = rosterByRole(roster);
  const byName = rosterByName(roster);
  const senderMember = byName[senderName];
  const pm = byRole.pm;
  const sponsor = byRole.sponsor;
  // The "functional lead" for this thread is whoever owns the sender's
  // domain — for finance senders that's the finance lead, etc. Skip if the
  // sender IS the lead (would be a no-op).
  const lead =
    senderMember && senderMember.role !== "pm" && senderMember.role !== "sponsor"
      ? senderMember
      : null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inbox"] });
    qc.invalidateQueries({ queryKey: ["comms"] });
    qc.invalidateQueries({ queryKey: ["stakeholders"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
    qc.invalidateQueries({ queryKey: ["next-action"] });
  };

  const delegate = useMutation({
    mutationFn: (mode: Mode) => delegateFn({ data: { inbox_id: inboxId, mode } }),
    onMutate: (mode) => setPendingMode(mode),
    onSuccess: (res, mode) => {
      invalidate();
      const key: InsightKey =
        mode === "ask_pm"
          ? "delegate.ask_pm"
          : mode === "assign_lead"
            ? "delegate.assign_lead"
            : "delegate.escalate_sponsor";
      insightToast(key, res.system_note);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setPendingMode(null),
  });

  const meeting = useMutation({
    mutationFn: () =>
      meetingFn({
        data: {
          kind:
            senderMember?.role === "finance"
              ? "steering"
              : senderMember?.role === "vendor"
                ? "vendor"
                : "standup",
          title: `Review with ${senderName}: ${subject.replace(/^re:\s*/i, "")}`,
          agenda: `Triggered from inbox message "${subject}" from ${senderName}. Walk through their concern, agree owners, capture decisions.`,
        },
      }),
    onMutate: () => setPendingMode("meeting"),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["meetings"] });
      insightToast("delegate.meeting", `Meeting drafted with ${senderName}.`);
      navigate({ to: "/app/meetings" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setPendingMode(null),
  });

  const showLead = !!lead;
  const busy = delegate.isPending || meeting.isPending;

  const Card = ({
    icon, title, hint, action, mode, disabled, insight,
  }: {
    icon: React.ReactNode;
    title: string;
    hint: string;
    action: () => void;
    mode: Mode | "meeting";
    disabled?: boolean;
    insight?: InsightKey;
  }) => (
    <div className="rounded-md border border-border bg-card/60 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
          {insight ? <RationaleChip insight={insight} className="mt-1.5" /> : null}
        </div>
        <Button size="sm" variant="outline" disabled={busy || disabled} onClick={action}>
          {pendingMode === mode ? "…" : "Do it"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mt-6 rounded-lg border border-dashed border-border p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Delegate or escalate
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        You don't have to answer every specialist question yourself. Pick who should own this.
      </p>
      <div className="mt-3 grid gap-2">
        <Card
          icon={<Users className="h-4 w-4" />}
          title={`Ask ${pm?.name ?? "the PM"} (${pm?.title ?? "Project Manager"}) to take it`}
          hint={`${pm?.name?.split(" ")[0] ?? "The PM"} owns the reply. They'll quietly resent it if you over-delegate.`}
          action={() => delegate.mutate("ask_pm")}
          mode="ask_pm"
          insight="delegate.ask_pm"
        />
        {showLead && (
          <Card
            icon={<UserCog className="h-4 w-4" />}
            title={`Assign to ${lead.name} (${lead.title})`}
            hint="The right specialist responds directly — usually the best move for technical or governance questions."
            action={() => delegate.mutate("assign_lead")}
            mode="assign_lead"
            insight="delegate.assign_lead"
          />
        )}
        <Card
          icon={<CalendarPlus className="h-4 w-4" />}
          title="Schedule a review meeting"
          hint="Drafts a meeting with the sender. Send minutes afterwards to close the loop."
          action={() => meeting.mutate()}
          mode="meeting"
          insight="delegate.meeting"
        />
        <Card
          icon={<ShieldAlert className="h-4 w-4" />}
          title={`Escalate to ${sponsor?.name ?? "the Sponsor"} (${sponsor?.title ?? "Executive Sponsor"})`}
          hint="Reserve this for budget, scope or governance. Sponsors lose patience with trivial escalations."
          action={() => delegate.mutate("escalate_sponsor")}
          mode="escalate_sponsor"
          insight="delegate.escalate_sponsor"
        />
      </div>
    </div>
  );
}