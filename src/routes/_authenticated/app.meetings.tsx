import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMeetings,
  createMeeting,
  holdMeeting,
  startMeeting,
  speakInMeeting,
  noteInMeeting,
  advanceMeeting,
  listAttendeeRoster,
  addMeetingAttendee,
  removeMeetingAttendee,
  autoMinutes,
} from "@/lib/pm.functions";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, CheckCircle2, Sparkles, Mic, MessageSquare, NotebookPen, PlayCircle, UserPlus, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { TimeControls } from "@/components/time-controls";

export const Route = createFileRoute("/_authenticated/app/meetings")({
  component: Meetings,
});

function PostMeetingActions({
  hasMinutes,
  hasDecisions,
}: {
  hasMinutes: boolean;
  hasDecisions: boolean;
}) {
  const items = [
    { label: "Capture minutes", done: hasMinutes },
    { label: "Record decisions", done: hasDecisions },
    { label: "Assign actions", done: hasDecisions },
    { label: "Update RAID log", done: false },
  ];
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-primary">
        Wrap up & advance
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                i.done ? "bg-emerald-500" : "bg-muted-foreground/40"
              }`}
            />
            <span className={i.done ? "text-foreground" : "text-muted-foreground"}>
              {i.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <TimeControls compact />
      </div>
    </div>
  );
}

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

type Attendee = { role_key: string; name: string; role: string; persona?: string };
type Turn = {
  at: string;
  kind: "speaker" | "user" | "system";
  speaker_name: string;
  speaker_role: string;
  role_key: string;
  body: string;
};

function Meetings() {
  const qc = useQueryClient();
  const fetchM = useServerFn(listMeetings);
  const createFn = useServerFn(createMeeting);
  const holdFn = useServerFn(holdMeeting);
  const startFn = useServerFn(startMeeting);
  const speakFn = useServerFn(speakInMeeting);
  const noteFn = useServerFn(noteInMeeting);
  const advanceFn = useServerFn(advanceMeeting);
  const rosterFn = useServerFn(listAttendeeRoster);
  const addAttFn = useServerFn(addMeetingAttendee);
  const removeAttFn = useServerFn(removeMeetingAttendee);
  const autoMinutesFn = useServerFn(autoMinutes);
  const { data: meetings } = useQuery({ queryKey: ["meetings"], queryFn: () => fetchM() });
  const { data: roster } = useQuery({ queryKey: ["attendee-roster"], queryFn: () => rosterFn() });

  const [form, setForm] = useState({ kind: "standup" as Kind, title: "", agenda: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = meetings?.find((m) => m.id === selectedId) ?? meetings?.[0];

  const [decisions, setDecisions] = useState("");
  const [minutes, setMinutes] = useState("");
  const [autoSummary, setAutoSummary] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMode, setChatMode] = useState<"speak" | "note">("speak");
  const [showAdd, setShowAdd] = useState(false);
  const [customAtt, setCustomAtt] = useState({ name: "", role: "", persona: "" });
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

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

  const start = useMutation({
    mutationFn: () => startFn({ data: { id: selected!.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const speak = useMutation({
    mutationFn: (body: string) => speakFn({ data: { id: selected!.id, body } }),
    onSuccess: () => { setChatInput(""); qc.invalidateQueries({ queryKey: ["meetings"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const note = useMutation({
    mutationFn: (body: string) => noteFn({ data: { id: selected!.id, body } }),
    onSuccess: () => { setChatInput(""); qc.invalidateQueries({ queryKey: ["meetings"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const advance = useMutation({
    mutationFn: (role_key?: string) => advanceFn({ data: { id: selected!.id, role_key } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const addAtt = useMutation({
    mutationFn: (vars: { role_key?: string; custom?: { name: string; role: string; persona?: string } }) =>
      addAttFn({ data: { id: selected!.id, ...vars } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setCustomAtt({ name: "", role: "", persona: "" });
      toast.success("Added to the room.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const removeAtt = useMutation({
    mutationFn: (role_key: string) => removeAttFn({ data: { id: selected!.id, role_key } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const auto = useMutation({
    mutationFn: () => autoMinutesFn({ data: { id: selected!.id } }),
    onSuccess: (res) => {
      if (res.decisions) setDecisions((prev) => (prev.trim() ? prev : res.decisions!));
      if (res.minutes) setMinutes((prev) => (prev.trim() ? prev : res.minutes!));
      setAutoSummary(res.summary ?? null);
      toast.success("Minutes captured from the discussion.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const transcript: Turn[] = Array.isArray((selected as any)?.transcript)
    ? ((selected as any).transcript as Turn[])
    : [];
  const attendees: Attendee[] = Array.isArray((selected as any)?.attendees)
    ? ((selected as any).attendees as Attendee[])
    : [];

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, selected?.id]);

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
                <div className="mt-5 space-y-5">
                  {/* Live discussion */}
                  <div className="rounded-md border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> In the room
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {attendees.map((a) => (
                          <span key={a.role_key} className="group inline-flex items-center gap-1 rounded-full border border-border bg-background pl-2 pr-1 text-[11px]">
                            <button
                              onClick={() => advance.mutate(a.role_key)}
                              disabled={advance.isPending}
                              title={`Let ${a.name} speak`}
                              className="py-0.5 hover:underline"
                            >
                              {a.name}
                            </button>
                            <button
                              onClick={() => removeAtt.mutate(a.role_key)}
                              disabled={removeAtt.isPending}
                              title="Remove from room"
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => setShowAdd((v) => !v)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
                        >
                          <UserPlus className="h-3 w-3" /> Add
                        </button>
                      </div>
                    </div>

                    {showAdd && (
                      <div className="border-b border-border bg-muted/30 p-4 space-y-3">
                        <div>
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">From the roster</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(roster ?? [])
                              .filter((r) => !attendees.some((a) => a.role_key === r.role_key))
                              .map((r) => (
                                <button
                                  key={r.role_key}
                                  onClick={() => addAtt.mutate({ role_key: r.role_key })}
                                  disabled={addAtt.isPending}
                                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
                                  title={r.role}
                                >
                                  + {r.name} <span className="text-muted-foreground">· {r.role}</span>
                                </button>
                              ))}
                            {(roster ?? []).filter((r) => !attendees.some((a) => a.role_key === r.role_key)).length === 0 && (
                              <span className="text-[11px] text-muted-foreground">Everyone from the roster is already in the room.</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Or invite someone custom</div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input placeholder="Name" value={customAtt.name} onChange={(e) => setCustomAtt({ ...customAtt, name: e.target.value })} />
                            <Input placeholder="Role / title" value={customAtt.role} onChange={(e) => setCustomAtt({ ...customAtt, role: e.target.value })} />
                          </div>
                          <Textarea
                            placeholder="Persona (optional) — how they speak, what they care about, what they push back on"
                            value={customAtt.persona}
                            onChange={(e) => setCustomAtt({ ...customAtt, persona: e.target.value })}
                            className="mt-2 min-h-[60px]"
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() =>
                                addAtt.mutate({
                                  custom: {
                                    name: customAtt.name.trim(),
                                    role: customAtt.role.trim(),
                                    persona: customAtt.persona.trim() || undefined,
                                  },
                                })
                              }
                              disabled={addAtt.isPending || !customAtt.name.trim() || !customAtt.role.trim()}
                            >
                              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add to room
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
                      {transcript.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
                          <p>The room is gathered. Kick things off.</p>
                          <Button onClick={() => start.mutate()} disabled={start.isPending}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            {start.isPending ? "Starting…" : "Start meeting"}
                          </Button>
                        </div>
                      ) : (
                        transcript.map((t, i) => {
                          if (t.kind === "system") {
                            return (
                              <div key={i} className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
                                <span className="font-semibold">Minutes:</span> {t.body}
                              </div>
                            );
                          }
                          const mine = t.kind === "user";
                          return (
                            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                <div className={`mb-1 text-[11px] uppercase tracking-wider ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  {t.speaker_name} · {t.speaker_role}
                                </div>
                                <div className="whitespace-pre-wrap leading-relaxed">{t.body}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={transcriptEndRef} />
                    </div>

                    {transcript.length > 0 && (
                      <div className="border-t border-border p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex rounded-md border border-border p-0.5 text-xs">
                            <button
                              onClick={() => setChatMode("speak")}
                              className={`flex items-center gap-1 rounded px-2 py-1 ${chatMode === "speak" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                            >
                              <MessageSquare className="h-3 w-3" /> Speak
                            </button>
                            <button
                              onClick={() => setChatMode("note")}
                              className={`flex items-center gap-1 rounded px-2 py-1 ${chatMode === "note" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                            >
                              <NotebookPen className="h-3 w-3" /> Take minutes
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => advance.mutate(undefined)}
                            disabled={advance.isPending}
                          >
                            <Mic className="mr-1.5 h-3.5 w-3.5" />
                            {advance.isPending ? "Listening…" : "Let them respond"}
                          </Button>
                        </div>
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={
                            chatMode === "speak"
                              ? "Say something to the room as the coordinator…"
                              : "Capture a minute / decision (won't be spoken aloud)…"
                          }
                          className="min-h-[70px]"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => {
                              const body = chatInput.trim();
                              if (!body) return;
                              if (chatMode === "speak") speak.mutate(body);
                              else note.mutate(body);
                            }}
                            disabled={speak.isPending || note.isPending || chatInput.trim().length < 1}
                          >
                            {chatMode === "speak" ? "Send" : "Add minute"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Decisions made</div>
                    <Textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} placeholder="What was decided? Who owns what?" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minutes / notes</div>
                    <Textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Discussion notes." className="min-h-[120px]" />
                  </div>
                  {autoSummary && (
                    <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> Auto summary
                      </div>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{autoSummary}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => auto.mutate()}
                      disabled={auto.isPending || transcript.length === 0}
                      title={transcript.length === 0 ? "Start the meeting first" : "Capture minutes from the live discussion"}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {auto.isPending ? "Capturing…" : "Auto-capture minutes"}
                    </Button>
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
                  {selected.held && (
                    <PostMeetingActions
                      hasMinutes={!!selected.minutes}
                      hasDecisions={!!selected.decisions}
                    />
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