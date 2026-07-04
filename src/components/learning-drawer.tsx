import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { mentorBrief, mentorChat } from "@/lib/mentor.functions";
import { Lightbulb, X, Send, Sparkles, ListChecks, BookOpen, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Tab = "task" | "learn" | "hints" | "ask";
type ChatTurn = { role: "learner" | "mentor"; content: string };
type Brief = {
  ctx: { area: string; what: string; concept: string };
  brief: { task: string; learn: string; hints: string[] };
  answer?: string;
};

export function LearningDrawer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("task");
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<Brief | null>(null);
  const [lastRoute, setLastRoute] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const askFn = useServerFn(mentorBrief);
  const chatFn = useServerFn(mentorChat);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchBrief = useMutation({
    mutationFn: (v: { question?: string }) =>
      askFn({ data: { route: pathname, question: v.question } }) as Promise<Brief>,
    onSuccess: (res) => {
      setData(res);
      setLastRoute(pathname);
    },
  });

  const chatMutation = useMutation({
    mutationFn: (v: { question: string; history: ChatTurn[] }) =>
      chatFn({
        data: { route: pathname, question: v.question, history: v.history },
      }) as Promise<{ answer: string }>,
    onSuccess: (res) => {
      setChat((prev) => [...prev, { role: "mentor", content: res.answer }]);
    },
    onError: () => {
      setChat((prev) => [
        ...prev,
        {
          role: "mentor",
          content:
            "I couldn't reach the mentor service just now. Try again in a moment — meanwhile the Task and Hints tabs still work.",
        },
      ]);
    },
  });

  useEffect(() => {
    if (tab === "ask" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, chatMutation.isPending, tab]);

  function ensureLoaded() {
    if (!data || lastRoute !== pathname) fetchBrief.mutate({});
  }

  function openDrawer(initial: Tab = "task") {
    setTab(initial);
    setOpen(true);
    ensureLoaded();
  }

  function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || chatMutation.isPending) return;
    const priorHistory = chat;
    setChat((prev) => [...prev, { role: "learner", content: q }]);
    setQuestion("");
    chatMutation.mutate({ question: q, history: priorHistory });
  }

  const loading = fetchBrief.isPending;

  return (
    <>
      {!open && (
        <button
          onClick={() => openDrawer("task")}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg transition hover:scale-[1.02] hover:bg-foreground/90"
          aria-label="Ask Atlas Mentor"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Ask Atlas
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Atlas Mentor
                </div>
                <div className="mt-0.5 font-display text-lg">
                  {data?.ctx.area ?? "Loading…"}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <nav className="grid grid-cols-4 border-b border-border bg-background/50 text-xs">
              {(
                [
                  { id: "task", label: "Task", icon: ListChecks },
                  { id: "learn", label: "Learn", icon: BookOpen },
                  { id: "hints", label: "Hints", icon: Lightbulb },
                  { id: "ask", label: "Ask AI", icon: MessageCircle },
                ] as { id: Tab; label: string; icon: typeof ListChecks }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    ensureLoaded();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-3 transition ${
                    tab === id
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading && !data && (
                <div className="space-y-3">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="h-16 w-full animate-pulse rounded-md bg-muted/60" />
                </div>
              )}
              {fetchBrief.isError && !loading && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  <div className="font-medium text-destructive">Mentor is offline</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Couldn't reach the AI gateway. Check your connection or try again.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => fetchBrief.mutate({})}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {data && tab === "task" && (
                <section className="space-y-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Right now
                  </div>
                  <p className="text-base leading-relaxed">{data.brief.task}</p>
                  <div className="rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                    Screen purpose · {data.ctx.what}
                  </div>
                </section>
              )}

              {data && tab === "learn" && (
                <section className="space-y-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    The concept
                  </div>
                  <p className="text-sm leading-relaxed">{data.brief.learn}</p>
                  <div className="rounded-md border border-border bg-background/60 p-3 text-xs">
                    <span className="font-medium">Why it matters: </span>
                    <span className="text-muted-foreground">{data.ctx.concept}</span>
                  </div>
                </section>
              )}

              {data && tab === "hints" && (
                <section className="space-y-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Try this
                  </div>
                  <ul className="space-y-2">
                    {data.brief.hints.map((h, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-md border border-border bg-background/60 p-3 text-sm"
                      >
                        <span className="font-display text-primary">{i + 1}.</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {tab === "ask" && (
                <section className="flex h-full flex-col">
                  <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {chat.length === 0 && (
                      <div className="rounded-md border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                        <div className="mb-1 font-medium text-foreground">Ask Atlas anything.</div>
                        The mentor sees your current screen, project phase, stakeholders,
                        RAID, open tasks and recent conversations — and coaches you
                        rather than writing your work.
                      </div>
                    )}
                    {chat.map((t, i) => (
                      <div
                        key={i}
                        className={
                          t.role === "learner"
                            ? "ml-auto max-w-[85%] rounded-md bg-primary/10 px-3 py-2 text-sm"
                            : "mr-auto max-w-[92%] rounded-md border border-border bg-background/60 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                        }
                      >
                        {t.content}
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="mr-auto flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                      </div>
                    )}
                  </div>
                  <form onSubmit={submitQuestion} className="mt-3 space-y-2 border-t border-border pt-3">
                    <Textarea
                      placeholder="e.g. How should I handle David's pushback on the timeline?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitQuestion(e as unknown as React.FormEvent);
                        }
                      }}
                      rows={2}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        Coaches — never writes your deliverables.
                      </p>
                      <Button
                        type="submit"
                        disabled={chatMutation.isPending || !question.trim()}
                        size="sm"
                      >
                        {chatMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Ask
                      </Button>
                    </div>
                  </form>
                </section>
              )}
            </div>

            <footer className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
              Mentor is contextual — switching screens refreshes the brief.
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}