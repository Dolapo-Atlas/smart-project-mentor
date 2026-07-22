import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInbox, markRead, generateStakeholderMessage } from "@/lib/sim.functions";
import { summonConflict } from "@/lib/pm.functions";
import { sendComm } from "@/lib/comms.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Mail, Flame, Reply, Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { StakeholderHoverAvatar as StakeholderAvatar } from "@/components/stakeholder-card";
import { DelegatePanel } from "@/components/delegate-panel";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { useVoiceSettings } from "@/lib/voice";
import { Link } from "@tanstack/react-router";
import { useServerFn as useServerFn2 } from "@tanstack/react-start";
import { listTasksRich } from "@/lib/tasks.functions";
import { useRoster, rosterByName } from "@/lib/roster";

export const Route = createFileRoute("/_authenticated/app/inbox")({
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

function Inbox() {
  const qc = useQueryClient();
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
  const selected = messages?.find((m) => m.id === selectedId) ?? messages?.[0];
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
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["comms"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      qc.invalidateQueries({ queryKey: ["next-action"] });
      toast.success("Reply sent. Watch your inbox for their response.");
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

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ul className="space-y-2">
          {(messages ?? []).length === 0 && (
            <li>
              <EmptyState
                icon={Mail}
                title="Inbox zero."
                body="Rare in real projects. Savour it — or summon a stakeholder to get the conversation moving."
              />
            </li>
          )}
          {messages?.map((m) => {
            const active = selected?.id === m.id;
            return (
              <li key={m.id}>
                <button
                  className={`w-full rounded-md border p-4 text-left transition ${
                    active
                      ? "border-foreground bg-card shadow-sm"
                      : "border-border bg-card/60 hover:bg-card"
                  }`}
                  onClick={() => {
                    setSelectedId(m.id);
                    if (!m.read) mark.mutate(m.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <StakeholderAvatar name={m.sender_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{m.sender_name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${toneStyles[m.tone] ?? toneStyles.neutral}`}>
                          {m.tone}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{m.sender_role}</div>
                      <div className={`mt-2 truncate text-sm ${!m.read ? "font-semibold" : ""}`}>{m.subject}</div>
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
              <div className="mt-6 whitespace-pre-wrap leading-relaxed">{selected.body}</div>
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
                const role =
                  rosterMap[selected.sender_name]?.role ??
                  LEGACY_SENDER_ROLE_MAP[selected.sender_name];
                const isSystem = selected.sender_name === "Project Update";
                if (isSystem) return null;
                const subject = selected.subject.startsWith("Re:")
                  ? selected.subject
                  : `Re: ${selected.subject}`;
                if (!replyOpen) {
                  return (
                    <div className="mt-8 border-t border-border pt-6">
                      {role && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReplyOpen(true);
                            setReplyBody("");
                          }}
                        >
                          <Reply className="mr-2 h-4 w-4" /> Reply to {selected.sender_name}
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
                          role && reply.mutate({ to_role: role, subject, body: replyBody.trim() })
                        }
                        disabled={!role || reply.isPending || replyBody.trim().length < 5}
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
              <Mail className="mr-2 h-4 w-4" /> Select a message
            </div>
          )}
        </article>
      </div>
    </div>
  );
}