import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMeetings, createMeeting, holdMeeting } from "@/lib/pm.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/meetings")({
  component: Meetings,
});

type Kind = "standup" | "steering" | "vendor" | "retro";

const kindLabel: Record<Kind, string> = {
  standup: "Stand-up",
  steering: "Steering committee",
  vendor: "Vendor call",
  retro: "Retrospective",
};
const kindStyle: Record<Kind, string> = {
  standup: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  steering: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  vendor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  retro: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function Meetings() {
  const qc = useQueryClient();
  const fetchM = useServerFn(listMeetings);
  const createFn = useServerFn(createMeeting);
  const holdFn = useServerFn(holdMeeting);
  const { data: meetings } = useQuery({ queryKey: ["meetings"], queryFn: () => fetchM() });

  const [form, setForm] = useState({ kind: "standup" as Kind, title: "", agenda: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = meetings?.find((m) => m.id === selectedId) ?? meetings?.[0];

  const [decisions, setDecisions] = useState("");
  const [minutes, setMinutes] = useState("");

  const add = useMutation({
    mutationFn: () => createFn({ data: { kind: form.kind, title: form.title, agenda: form.agenda || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setForm({ ...form, title: "", agenda: "" });
      toast.success("Scheduled.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const hold = useMutation({
    mutationFn: () => holdFn({ data: { id: selected!.id, decisions: decisions || undefined, minutes: minutes || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setDecisions(""); setMinutes("");
      toast.success("Meeting closed. AI summary generated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cadence</div>
        <h1 className="font-display text-4xl font-medium">Meetings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Schedule stand-ups, steering committees, vendor calls, and retros. Capture decisions and minutes — AI generates a sharp summary you can paste into governance reports.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-xl">Schedule a meeting</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="standup">Stand-up</option>
            <option value="steering">Steering committee</option>
            <option value="vendor">Vendor call</option>
            <option value="retro">Retrospective</option>
          </select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="sm:col-span-2" />
        </div>
        <Textarea placeholder="Agenda (optional)" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="mt-3" />
        <div className="mt-3 flex justify-end">
          <Button onClick={() => add.mutate()} disabled={!form.title.trim() || add.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Schedule
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ul className="space-y-2">
          {(meetings ?? []).length === 0 && (
            <li className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No meetings yet.
            </li>
          )}
          {meetings?.map((m) => {
            const active = selected?.id === m.id;
            return (
              <li key={m.id}>
                <button
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full rounded-md border p-4 text-left ${active ? "border-foreground bg-card" : "border-border bg-card/60 hover:bg-card"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${kindStyle[m.kind as Kind]}`}>{kindLabel[m.kind as Kind]}</span>
                    {m.held && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  </div>
                  <div className="mt-1 text-sm font-medium">{m.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(m.scheduled_at), { addSuffix: true })}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <article className="min-h-[400px] rounded-lg border border-border bg-card p-6">
          {selected ? (
            <>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {kindLabel[selected.kind as Kind]}
              </div>
              <h2 className="mt-1 font-display text-2xl font-medium">{selected.title}</h2>

              {selected.agenda && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Agenda</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{selected.agenda}</p>
                </div>
              )}

              {!selected.held ? (
                <div className="mt-5 space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decisions made</div>
                    <Textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} placeholder="What was decided? Who owns what?" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minutes / notes</div>
                    <Textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Discussion notes." className="min-h-[120px]" />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => hold.mutate()} disabled={hold.isPending}>
                      <Sparkles className="mr-2 h-4 w-4" /> Close meeting & summarise
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4 text-sm">
                  {selected.ai_summary && (
                    <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> AI summary
                      </div>
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{selected.ai_summary}</p>
                    </div>
                  )}
                  {selected.decisions && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decisions</div>
                      <p className="mt-1 whitespace-pre-wrap">{selected.decisions}</p>
                    </div>
                  )}
                  {selected.minutes && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minutes</div>
                      <p className="mt-1 whitespace-pre-wrap">{selected.minutes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">Select a meeting</div>
          )}
        </article>
      </div>
    </div>
  );
}