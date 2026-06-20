import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listComms, listAttachables, sendComm, STAKEHOLDERS } from "@/lib/comms.functions";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Paperclip, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/comms")({
  component: Comms,
});

type MsgType = "Update" | "Escalation" | "Request" | "FYI";
const MSG_TYPES: MsgType[] = ["Update", "Escalation", "Request", "FYI"];

const sentimentClass: Record<string, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  pushback: "text-orange-600 dark:text-orange-400",
  concerned: "text-amber-600 dark:text-amber-400",
  ignored: "text-muted-foreground italic",
};

function Comms() {
  const qc = useQueryClient();
  const fetchComms = useServerFn(listComms);
  const fetchAttach = useServerFn(listAttachables);
  const send = useServerFn(sendComm);

  const { data: messages } = useQuery({ queryKey: ["comms"], queryFn: () => fetchComms() });
  const { data: attach } = useQuery({ queryKey: ["comms_attach"], queryFn: () => fetchAttach() });

  const [toRoles, setToRoles] = useState<string[]>(["sponsor"]);
  const [msgType, setMsgType] = useState<MsgType>("Update");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachKind, setAttachKind] = useState<string>("none");
  const [attachRef, setAttachRef] = useState<string>("");

  const attachOptions = useMemo(() => {
    if (!attach) return [] as { id: string; label: string }[];
    switch (attachKind) {
      case "document": return attach.documents.map((d: any) => ({ id: d.id, label: `${d.title} (${d.status})` }));
      case "status_report": return attach.status_reports.map((r: any) => ({ id: r.id, label: `Week of ${r.week_start} — ${r.rag_summary?.toUpperCase()}` }));
      case "raid": return attach.raid_items.map((r: any) => ({ id: r.id, label: `${r.kind?.toUpperCase()}: ${r.title}` }));
      case "change_request": return attach.change_requests.map((c: any) => ({ id: c.id, label: `${c.title} (${c.status})` }));
      case "gate": return attach.phase_gates.map((g: any) => ({ id: g.id, label: `${g.phase} gate — ${g.status}` }));
      default: return [];
    }
  }, [attach, attachKind]);

  const submit = useMutation({
    mutationFn: () => {
      const label = attachOptions.find((o) => o.id === attachRef)?.label;
      return send({
        data: {
          to_roles: toRoles,
          msg_type: msgType,
          subject,
          body,
          attachment_kind: attachKind as any,
          attachment_ref: attachRef || undefined,
          attachment_label: label,
        },
      });
    },
    onSuccess: (r: any) => {
      toast.success(`Sent. ${r.replies} stakeholder(s) will reply.`);
      qc.invalidateQueries({ queryKey: ["comms"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setSubject(""); setBody(""); setAttachKind("none"); setAttachRef("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send"),
  });

  const toggleRole = (role: string) => {
    setToRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  };

  // Group messages by thread
  const threads = useMemo(() => {
    const map = new Map<string, any[]>();
    (messages ?? []).forEach((m: any) => {
      if (!map.has(m.thread_id)) map.set(m.thread_id, []);
      map.get(m.thread_id)!.push(m);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
    );
  }, [messages]);

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Communications</div>
        <h1 className="font-display text-4xl font-medium">Stakeholder comms</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Send updates, escalations, requests, and FYIs to stakeholders. They'll reply in character — and won't always agree.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">To</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAKEHOLDERS.map((s) => (
            <button
              key={s.role}
              onClick={() => toggleRole(s.role)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                toRoles.includes(s.role)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.name} <span className="opacity-60">· {s.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-2">Type</div>
          {MSG_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setMsgType(t)}
              className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
                msgType === t ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subject</div>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short, clear subject line" maxLength={200} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Message</div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Be specific. Reference dates, owners, numbers." className="min-h-[140px]" maxLength={5000} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attachment</div>
              <select
                value={attachKind}
                onChange={(e) => { setAttachKind(e.target.value); setAttachRef(""); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="none">None</option>
                <option value="document">Document</option>
                <option value="status_report">Status report</option>
                <option value="raid">RAID item</option>
                <option value="change_request">Change request</option>
                <option value="gate">Phase gate</option>
              </select>
            </div>
            {attachKind !== "none" && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Select</div>
                <select
                  value={attachRef}
                  onChange={(e) => setAttachRef(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— choose —</option>
                  {attachOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !subject.trim() || !body.trim() || toRoles.length === 0}
          >
            <Send className="mr-2 h-4 w-4" /> {submit.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Threads</h2>
        {threads.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No messages yet. Send one above.
          </div>
        )}
        <ul className="space-y-3">
          {threads.map((thread) => {
            const outbound = thread.find((m) => m.direction === "outbound") ?? thread[0];
            const replies = thread.filter((m) => m.direction === "inbound");
            return (
              <li key={outbound.thread_id} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{outbound.msg_type} → {outbound.to_roles?.join(", ")}</div>
                    <div className="font-medium">{outbound.subject}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(outbound.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{outbound.body}</div>
                {outbound.attachment_label && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" /> {outbound.attachment_kind}: {outbound.attachment_label}
                  </div>
                )}
                {replies.length > 0 && (
                  <div className="mt-4 space-y-2 border-l-2 border-border pl-4">
                    {replies.map((r) => (
                      <div key={r.id}>
                        <div className="flex items-center gap-2 text-xs">
                          <ChevronRight className="h-3 w-3" />
                          <span className="font-medium">{STAKEHOLDERS.find((s) => s.role === r.from_role)?.name ?? r.from_role}</span>
                          <span className={sentimentClass[r.sentiment ?? "neutral"]}>· {r.sentiment}</span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm">{r.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
