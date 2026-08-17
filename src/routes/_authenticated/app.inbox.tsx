import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInbox, markRead, generateStakeholderMessage } from "@/lib/sim.functions";
import { summonConflict } from "@/lib/pm.functions";
import { sendComm } from "@/lib/comms.functions";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Mail, Flame, Reply, Send } from "lucide-react";
import { BookOpen } from "lucide-react";
import { ProjectInitiationPack } from "@/components/dashboard/project-initiation-pack";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import inboxEmpty from "@/assets/illustrations/inbox-empty.png.asset.json";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { DelegatePanel } from "@/components/delegate-panel";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { useVoiceSettings } from "@/lib/voice";
import { Link } from "@tanstack/react-router";
import { useServerFn as useServerFn2 } from "@tanstack/react-start";
import { listTasksRich, submitTaskWithWork } from "@/lib/tasks.functions";
import { markFreePreviewComplete } from "@/lib/access.functions";
import { trackLearner } from "@/lib/learner-events";
import { useRoster, rosterByName } from "@/lib/roster";
import { useFirstEmailGate } from "@/lib/use-first-email-gate";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  validateSearch: (search: Record<string, unknown>) =>
    z
      .object({ onboarding: z.coerce.number().optional() })
      .parse(search) as { onboarding?: number },
  component: Inbox,
});

const toneStyles: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  frustrated: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  supportive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  curious: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  neutral: "bg-muted text-muted-foreground",
};

// Static fallback for legacy DCR names. Live role lookup uses the active
// project's roster (see `useRoster()` below) so dynamic stakeholder names
// from any project_template can still be replied to.
const LEGACY_SENDER_ROLE_MAP: Record<string, string> = {
  "Sarah Williams": "pm",
  "David Okafor": "sponsor",
  "Priya Anand": "finance",
  "James Lin": "tech",
  "CareSoft Ltd": "vendor",
  "Margaret Hollis": "care_home",
  "Rachel Stone": "clinical",
};

/** Sarah's first welcome email carries the pack pointer inside ─── rules. */
const PACK_BLOCK = /─{5,}\s*\nBEFORE YOU RESPOND\n([\s\S]*?)\n─{5,}\s*\n?/;

function Inbox() {
  const qc = useQueryClient();
  const { onboarding } = Route.useSearch();
  // Pack state is tracked per project instance, so a brand new simulation asks
  // the learner to read its own Initiation Pack again.
  const {
    packOpened: packSeen,
    markPackOpened,
    required: firstTaskRequired,
  } = useFirstEmailGate();
  // The guided first-email treatment applies whenever the day-one task is
  // still outstanding, not only when arriving via ?onboarding=1.
  const onboardingMode = onboarding === 1 || firstTaskRequired;
  const { settings: voice } = useVoiceSettings();
  const fetchInbox = useServerFn(listInbox);
  const markFn = useServerFn(markRead);
  const genFn = useServerFn(generateStakeholderMessage);
  const stirFn = useServerFn(summonConflict);
  const roster = useRoster();
  const rosterMap = rosterByName(roster);
  const { data: messages } = useQuery({ queryKey: ["inbox"], queryFn: () => fetchInbox() });
  const fetchTasks = useServerFn2(listTasksRich);
  const { data: allTasks } = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On day one nothing is auto-opened: the learner has to open the email
  // themselves, so it is only marked read once they have actually read it.
  const selected =
    messages?.find((m) => m.id === selectedId) ??
    (onboardingMode ? undefined : messages?.[0]);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const trackedOpenRef = useRef(false);
  useEffect(() => {
    if (!onboardingMode || trackedOpenRef.current) return;
    if ((messages ?? []).length === 0) return;
    trackedOpenRef.current = true;
    trackLearner("inbox_opened", { props: { onboarding: true } });
  }, [onboardingMode, messages]);
  const linkedTasks = (allTasks ?? []).filter(
    (t: any) => selected && t.source_ref === selected.id,
  );

  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["next-action"] });
    },
  });

  const summon = useMutation({
    mutationFn: () => genFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("New message");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const stir = useMutation({
    mutationFn: () => stirFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Someone is unhappy.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const sendFn = useServerFn(sendComm);
  const submitTask = useServerFn(submitTaskWithWork);
  const markPreviewFn = useServerFn(markFreePreviewComplete);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [packOpen, setPackOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const openPack = () => {
    setPackOpen(true);
    setRemindOpen(false);
    markPackOpened();
    trackLearner("brief_opened", { props: { from: "inbox_first_email" } });
  };
  const reply = useMutation({
    mutationFn: (input: { to_role: string; subject: string; body: string }) =>
      sendFn({
        data: {
          to_roles: [input.to_role],
          msg_type: "Update",
          subject: input.subject,
          body: input.body,
        },
      }),
    onSuccess: async (_res, input) => {
      // Onboarding: replying closes out the linked first task using the normal
      // submission path, so progress and consequences behave as usual.
      if (onboardingMode && linkedTasks.length > 0) {
        const first = linkedTasks.find(
          (t: any) => !["done", "approved", "submitted", "closed"].includes(t.status),
        );
        if (first) {
          try {
            await submitTask({ data: { id: first.id, submission: input.body } });
            trackLearner("first_task_completed", { props: { via: "inbox_reply" } });
          } catch {
            // Non-blocking: the reply itself already landed.
          }
        }
      }
      if (onboardingMode) {
        // The reply itself is the first finished piece of work, so it consumes
        // the free preview even when no task row was linked to the email.
        try {
          await markPreviewFn();
          qc.invalidateQueries({ queryKey: ["access"] });
          qc.invalidateQueries({ queryKey: ["my-access"] });
        } catch {
          // Non-blocking.
        }
      }
      trackLearner("first_reply_sent", { props: { onboarding: onboardingMode } });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["comms"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      qc.invalidateQueries({ queryKey: ["next-action"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["whats-next"] });
      qc.invalidateQueries({ queryKey: ["phase-progress"] });
      qc.invalidateQueries({ queryKey: ["first-email-gate"] });
      if (onboardingMode) {
        setOnboardingDone(true);
        toast.success(
          "First response sent. Your Project Manager will come back to you — head to Tasks for your next move.",
        );
      } else {
        toast.success("Reply sent. Watch your inbox for their response.");
      }
      setReplyOpen(false);
      setReplyBody("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Correspondence</div>
          <h1 className="font-display text-3xl font-medium sm:text-4xl">Inbox</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => stir.mutate()} disabled={stir.isPending}>
            <Flame className="mr-2 h-4 w-4" />
            {stir.isPending ? "Stirring…" : "Stir the pot"}
          </Button>
          <Button onClick={() => summon.mutate()} disabled={summon.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {summon.isPending ? "Summoning…" : "Summon a stakeholder"}
          </Button>
        </div>
      </header>

      {onboardingMode && onboardingDone && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            First task complete
          </div>
          <h2 className="mt-1 font-display text-xl font-medium">
            Response sent — you’re officially on the project.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Project Manager has your reply and will respond in the inbox.
            Next: pick up your Initiation deliverables.
          </p>
          <Button asChild className="mt-3">
            <Link to="/app/tasks">Go to my tasks</Link>
          </Button>
        </div>
      )}
      {onboardingMode && !onboardingDone && (
        <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent-orange">
            First workplace task
          </div>
          <h2 className="mt-1 font-display text-xl font-medium">
            Read and respond to your first email
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Project Manager is waiting on you. Open the highlighted email
            on the left, read it properly, then use{" "}
            <span className="font-medium text-foreground">Write Response</span> to
            reply. This closes out your first task.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ul className="space-y-2">
          {(messages ?? []).length === 0 && (
            <li>
              <EmptyState
                icon={Mail}
                illustration={inboxEmpty.url}
                title="Inbox zero."
                body="Rare in real projects. Savour it — or summon a stakeholder to get the conversation moving."
              />
            </li>
          )}
          {messages?.map((m) => {
            const active = selected?.id === m.id;
            const highlight = onboardingMode && !onboardingDone && !m.read;
            return (
              <li key={m.id}>
                <button
                  className={`relative w-full rounded-md border p-4 text-left transition ${
                    active
                      ? "border-foreground bg-card shadow-sm"
                      : "border-border bg-card/60 hover:bg-card"
                  } ${!m.read ? "bg-primary/5" : ""} ${
                    highlight
                      ? "ring-2 ring-accent-orange ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedId(m.id);
                    if (!m.read) mark.mutate(m.id);
                  }}
                >
                  {!m.read && (
                    <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary" aria-hidden="true" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <StakeholderAvatar name={m.sender_name} size="md" />
                      {!m.read && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{m.sender_name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${toneStyles[m.tone] ?? toneStyles.neutral}`}>
                          {m.tone}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{m.sender_role}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`truncate text-sm ${!m.read ? "font-semibold" : ""}`}>{m.subject}</span>
                        {!m.read && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                            Unread
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <article className="min-h-[400px] rounded-lg border border-border bg-card p-8">
          {selected ? (
            <>
              <div className="flex items-center gap-4">
                <StakeholderAvatar name={selected.sender_name} size="lg" />
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {selected.sender_role} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                  </div>
                  <div className="mt-1 text-sm font-medium">{selected.sender_name}</div>
                </div>
              </div>
              <h2 className="mt-4 font-display text-3xl font-medium">{selected.subject}</h2>
              {voice.enabled && voice.readEmails ? (
                <div className="mt-3">
                  <ReadAloudButton
                    text={`${selected.subject}. ${selected.body}`}
                    stakeholder={selected.sender_name}
                  />
                </div>
              ) : null}
              {(() => {
                const match = selected.body.match(PACK_BLOCK);
                const bodyText = match
                  ? selected.body.replace(PACK_BLOCK, "")
                  : selected.body;
                return (
                  <>
                    <div className="mt-6 whitespace-pre-wrap leading-relaxed">
                      {bodyText.trim()}
                    </div>
                    {match && (
                      <div className="mt-6 rounded-2xl border border-accent-orange/40 bg-accent-orange/5 p-5">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent-orange">
                          <BookOpen className="h-3.5 w-3.5" />
                          Before you respond
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {match[1]?.trim()}
                        </p>
                        <Button size="lg" className="mt-4" onClick={openPack}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Open Project Initiation Pack
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
              {linkedTasks.length > 0 && (
                <div className="mt-6 rounded-md border border-primary/40 bg-primary/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-primary/80">
                    Linked work · {linkedTasks.length} task{linkedTasks.length === 1 ? "" : "s"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Replying acknowledges {selected.sender_name}. Completing these tasks is what
                    actually resolves the issue.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {linkedTasks.map((t: any) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className={t.status === "approved" || t.status === "done" ? "line-through text-muted-foreground" : ""}>
                          {t.title}
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t.status.replace("_", " ")}
                          </span>
                        </span>
                        <Link
                          to="/app/tasks"
                          className="text-xs text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(() => {
                 // Unknown senders (e.g. governance reviewers like Emma Collins,
                 // who sit outside the project roster) used to render no Reply
                 // button at all. Because unanswered mail counts towards
                 // readiness, that produced an unanswerable blocker, so unknown
                 // senders now route their reply to the Project Manager.
                 const role =
                   rosterMap[selected.sender_name]?.role ??
                   LEGACY_SENDER_ROLE_MAP[selected.sender_name] ??
                   "pm";
                const isSystem = selected.sender_name === "Project Update";
                if (isSystem) return null;
                const hasPackSection = PACK_BLOCK.test(selected.body);
                // The day-one gate does not depend on the email body wording:
                // while the first task is outstanding the pack must be opened
                // before any reply can be drafted.
                const mustReadPack = (hasPackSection || firstTaskRequired) && !packSeen;
                const subject = selected.subject.startsWith("Re:")
                  ? selected.subject
                  : `Re: ${selected.subject}`;
                if (!replyOpen) {
                  return (
                    <div className="mt-8 border-t border-border pt-6">
                      {role && (
                        <Button
                          variant={onboardingMode && !onboardingDone ? "default" : "outline"}
                          size={onboardingMode && !onboardingDone ? "lg" : "default"}
                          onClick={() => {
                            if (mustReadPack) {
                              setRemindOpen(true);
                              return;
                            }
                            setReplyOpen(true);
                            setReplyBody("");
                          }}
                        >
                          <Reply className="mr-2 h-4 w-4" />
                          {onboardingMode && !onboardingDone
                            ? "Write Response"
                            : `Reply to ${selected.sender_name}`}
                        </Button>
                      )}
                      <DelegatePanel
                        inboxId={selected.id}
                        senderName={selected.sender_name}
                        subject={selected.subject}
                      />
                    </div>
                  );
                }
                return (
                  <div className="mt-8 border-t border-border pt-6">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Reply · To {selected.sender_name} · {subject}
                    </div>
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={`Write your reply to ${selected.sender_name}…`}
                      className="mt-2 min-h-[180px]"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setReplyOpen(false);
                          setReplyBody("");
                        }}
                        disabled={reply.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() =>
                          role &&
                          (mustReadPack
                            ? setRemindOpen(true)
                            : reply.mutate({ to_role: role, subject, body: replyBody.trim() }))
                        }
                        disabled={
                          !role || reply.isPending || replyBody.trim().length < 5 || mustReadPack
                        }
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {reply.isPending ? "Sending…" : "Send reply"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />{" "}
              {onboardingMode && !onboardingDone
                ? "Open the highlighted email to read it"
                : "Select a message"}
            </div>
          )}
        </article>
      </div>

      <ProjectInitiationPack open={packOpen} onOpenChange={setPackOpen} />

      <Dialog open={remindOpen} onOpenChange={setRemindOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="font-display text-xl font-medium">
            {firstTaskRequired
              ? "Read the Project Initiation Pack first"
              : "Have you reviewed the Project Initiation Pack?"}
          </DialogTitle>
          <DialogDescription>
            {firstTaskRequired
              ? "Your Project Manager pointed you to it in this email. Open it before you reply — your response is scored on how well it reflects the actual project."
              : "It contains important project context that may help you respond accurately."}
          </DialogDescription>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant={firstTaskRequired ? "default" : "outline"} onClick={openPack}>
              <BookOpen className="mr-2 h-4 w-4" />
              Open Project Initiation Pack
            </Button>
            {!firstTaskRequired && (
              <Button
                onClick={() => {
                  setRemindOpen(false);
                  setReplyOpen(true);
                  setReplyBody("");
                }}
              >
                Continue to Reply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}