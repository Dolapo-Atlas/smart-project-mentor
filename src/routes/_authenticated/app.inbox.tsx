import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInbox, markRead, generateStakeholderMessage } from "@/lib/sim.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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

function Inbox() {
  const qc = useQueryClient();
  const fetchInbox = useServerFn(listInbox);
  const markFn = useServerFn(markRead);
  const genFn = useServerFn(generateStakeholderMessage);
  const { data: messages } = useQuery({ queryKey: ["inbox"], queryFn: () => fetchInbox() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = messages?.find((m) => m.id === selectedId) ?? messages?.[0];

  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Correspondence</div>
          <h1 className="font-display text-4xl font-medium">Inbox</h1>
        </div>
        <Button onClick={() => summon.mutate()} disabled={summon.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {summon.isPending ? "Summoning…" : "Summon a stakeholder"}
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ul className="space-y-2">
          {(messages ?? []).length === 0 && (
            <li className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              The inbox is quiet. Summon a stakeholder to get started.
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{m.sender_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${toneStyles[m.tone] ?? toneStyles.neutral}`}>
                      {m.tone}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{m.sender_role}</div>
                  <div className={`mt-2 truncate text-sm ${!m.read ? "font-semibold" : ""}`}>{m.subject}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <article className="min-h-[400px] rounded-lg border border-border bg-card p-8">
          {selected ? (
            <>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {selected.sender_role} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
              </div>
              <h2 className="mt-2 font-display text-3xl font-medium">{selected.subject}</h2>
              <div className="mt-1 text-sm text-muted-foreground">From {selected.sender_name}</div>
              <div className="mt-6 whitespace-pre-wrap leading-relaxed">{selected.body}</div>
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