import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { mentorBrief } from "@/lib/mentor.functions";
import { useRouterState } from "@tanstack/react-router";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lightbulb,
  X,
  Send,
  Sparkles,
  BookOpen,
  MessageCircle,
  FileText,
  Loader2,
} from "lucide-react";

export type MentorTaskContext = {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  category?: string | null;
  stakeholder?: string | null;
};

// ---------- Trigger ----------
export function MentorTriggerButton({
  task,
  className = "",
}: {
  task: MentorTaskContext;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              aria-label="Open AI Mentor"
              className={`group inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-600 transition hover:bg-orange-500/20 hover:scale-105 dark:text-orange-400 ${className}`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Need help understanding this task?</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <MentorDrawer task={task} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ---------- Drawer ----------
export function MentorDrawer({
  task,
  open,
  onOpenChange,
}: {
  task: MentorTaskContext;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-orange-500/15 bg-[hsl(36,33%,97%)] p-0 sm:max-w-[420px] dark:bg-card [&>button.absolute]:hidden"
      >
        <header className="flex items-start justify-between border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">
              <Sparkles className="h-3 w-3" /> AI Mentor
            </div>
            <div className="mt-1 truncate font-display text-lg leading-tight">{task.title}</div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {task.category && <span>{task.category}</span>}
              {task.priority && <span>· {task.priority}</span>}
              {task.stakeholder && <span>· for {task.stakeholder}</span>}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <MentorTabs task={task} />
      </SheetContent>
    </Sheet>
  );
}

// ---------- Tabs container ----------
export function MentorTabs({ task }: { task: MentorTaskContext }) {
  return (
    <Tabs defaultValue="learn" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="m-3 grid grid-cols-4 rounded-lg bg-orange-500/5 p-1">
        <TabsTrigger value="learn" className="text-xs data-[state=active]:bg-background">
          <BookOpen className="mr-1 h-3 w-3" /> Learn
        </TabsTrigger>
        <TabsTrigger value="hints" className="text-xs data-[state=active]:bg-background">
          <Lightbulb className="mr-1 h-3 w-3" /> Hints
        </TabsTrigger>
        <TabsTrigger value="ask" className="text-xs data-[state=active]:bg-background">
          <MessageCircle className="mr-1 h-3 w-3" /> Ask AI
        </TabsTrigger>
        <TabsTrigger value="resources" className="text-xs data-[state=active]:bg-background">
          <FileText className="mr-1 h-3 w-3" /> Files
        </TabsTrigger>
      </TabsList>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <TabsContent value="learn" className="mt-0">
          <LearnPanel task={task} />
        </TabsContent>
        <TabsContent value="hints" className="mt-0">
          <HintsPanel task={task} />
        </TabsContent>
        <TabsContent value="ask" className="mt-0">
          <AskMentorPanel task={task} />
        </TabsContent>
        <TabsContent value="resources" className="mt-0">
          <ResourcesPanel task={task} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

// ---------- Concept inference ----------
function inferConcept(task: MentorTaskContext): {
  name: string;
  whatIs: string;
  whenUsed: string;
  thisTask: string;
  hints: string[];
} {
  const t = (task.title + " " + (task.description ?? "")).toLowerCase();
  const who = task.stakeholder ?? "your stakeholder";

  if (t.includes("cost") && t.includes("benefit")) {
    return {
      name: "Cost-Benefit Analysis",
      whatIs:
        "A Cost-Benefit Analysis compares the expected costs of a project or change against the expected benefits to decide whether it is worth doing.",
      whenUsed:
        "Project teams use it when asking for budget approval, reviewing scope changes, choosing between options, or justifying a recommendation.",
      thisTask: `In this task, you need to revise the numbers, check the assumptions, and prepare a clearer recommendation for ${who}.`,
      hints: [
        "Review the latest budget or cost information first.",
        "Check whether the expected benefits have changed.",
        "Compare total costs against total benefits.",
        "Write your recommendation only after reviewing the evidence.",
      ],
    };
  }
  if (t.includes("raid") || t.includes("risk")) {
    return {
      name: "RAID / Risk Management",
      whatIs:
        "A RAID log tracks Risks, Assumptions, Issues, and Dependencies so the team has a single, current view of what could derail the project.",
      whenUsed:
        "Used continuously through delivery — updated whenever new uncertainty surfaces or an item is closed.",
      thisTask: `Capture or update the items for ${who}'s concern with clear owner, probability, impact, and mitigation.`,
      hints: [
        "State the risk as a cause → event → effect, not a vague worry.",
        "Assign a real owner — risks without owners go stale.",
        "Score probability and impact honestly, not politically.",
        "Define the mitigation before you close the entry.",
      ],
    };
  }
  if (t.includes("status") || t.includes("report")) {
    return {
      name: "Status Report",
      whatIs:
        "A weekly status report summarises progress, RAG health, key risks, and next steps so sponsors can act without reading every detail.",
      whenUsed:
        "Used in steering committees and sponsor reviews to keep decisions informed and surface help needed.",
      thisTask: `Consolidate progress for ${who} with a clear RAG, the top 2-3 risks, and what you need from them.`,
      hints: [
        "Lead with RAG and the one sentence that explains it.",
        "Keep risks to the few that need a decision.",
        "Be explicit about asks — vague reports get vague support.",
        "Use numbers over adjectives where possible.",
      ],
    };
  }
  if (t.includes("change") || t.includes("scope")) {
    return {
      name: "Change Request",
      whatIs:
        "A change request formally proposes an adjustment to scope, schedule, or budget so the impact can be assessed before approval.",
      whenUsed:
        "Raised whenever a new requirement, constraint, or stakeholder ask would alter the agreed baseline.",
      thisTask: `Draft the change so ${who} can decide quickly — describe what, why, impact, and recommended option.`,
      hints: [
        "Separate the ask from your recommendation.",
        "Quantify the impact on cost, time, and quality.",
        "Offer at least one alternative.",
        "Note the consequence of doing nothing.",
      ],
    };
  }
  if (t.includes("stakeholder") || t.includes("email") || t.includes("reply") || t.includes("respond")) {
    return {
      name: "Stakeholder Communication",
      whatIs:
        "Stakeholder communication is the deliberate exchange of information to keep people aligned, manage expectations, and protect trust.",
      whenUsed:
        "Used continuously — especially when sentiment shifts, deadlines slip, or scope changes.",
      thisTask: `Craft a response to ${who} that acknowledges the concern, explains your position, and proposes a clear next step.`,
      hints: [
        "Acknowledge their concern before defending anything.",
        "Be specific about what you will do and by when.",
        "Avoid jargon — match their tone and seniority.",
        "Close with a clear ask or next step.",
      ],
    };
  }
  if (t.includes("meeting") || t.includes("minutes") || t.includes("agenda")) {
    return {
      name: "Meeting Facilitation",
      whatIs:
        "Good meeting facilitation turns a conversation into decisions, owners, and dated actions captured in minutes.",
      whenUsed:
        "Used for steering committees, working sessions, and any meeting where alignment must be recorded.",
      thisTask: `Prepare and run the session so ${who} leaves with clear decisions and next actions.`,
      hints: [
        "Send an agenda with desired outcomes, not just topics.",
        "Capture decisions and owners as you go, not after.",
        "Distinguish discussion from decision in the minutes.",
        "Circulate minutes within 24 hours.",
      ],
    };
  }

  return {
    name: task.title,
    whatIs:
      "This task is part of how the project moves forward. Treat it as a small, deliberate piece of work with a clear output.",
    whenUsed:
      "Tasks like this come up whenever a stakeholder concern, deliverable, or decision needs coordinated action.",
    thisTask: `Focus on producing something concrete for ${who} — a document, message, decision, or update that closes the loop.`,
    hints: [
      "Re-read the task description before you start.",
      "Identify the single decision or output expected.",
      "Check what evidence or data you need first.",
      "Submit when the output is good enough — not perfect.",
    ],
  };
}

// ---------- Learn ----------
export function LearnPanel({ task }: { task: MentorTaskContext }) {
  const c = inferConcept(task);
  return (
    <section className="space-y-4 pt-1">
      <h3 className="font-display text-xl leading-snug">What is a {c.name}?</h3>
      <p className="text-sm leading-relaxed text-foreground/90">{c.whatIs}</p>
      <p className="text-sm leading-relaxed text-foreground/90">{c.whenUsed}</p>
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm leading-relaxed">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          In this task
        </div>
        {c.thisTask}
      </div>
    </section>
  );
}

// ---------- Hints ----------
export function HintsPanel({ task }: { task: MentorTaskContext }) {
  const c = inferConcept(task);
  return (
    <section className="space-y-2 pt-1">
      <p className="mb-2 text-xs text-muted-foreground">
        Small nudges — not the answer. Use what helps, ignore what doesn't.
      </p>
      {c.hints.map((h, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-border/60 bg-background/70 p-3 text-sm shadow-sm"
        >
          <span className="font-display text-base text-orange-500">{i + 1}.</span>
          <span className="leading-relaxed">{h}</span>
        </div>
      ))}
    </section>
  );
}

// ---------- Ask AI ----------
type ChatMsg = { role: "user" | "mentor"; text: string };

function mockMentorReply(task: MentorTaskContext, q: string): string {
  const c = inferConcept(task);
  const lower = q.toLowerCase();
  if (lower.includes("how") && (lower.includes("start") || lower.includes("begin"))) {
    return `Start by re-reading the task: "${task.title}". Ask yourself — what is the single output ${task.stakeholder ?? "the stakeholder"} actually needs? Once that's clear, the first hint above usually unlocks the rest.`;
  }
  if (lower.includes("template") || lower.includes("example")) {
    return `I won't give you a finished template — that would short-circuit your learning. But the Files tab lists the right reference for a ${c.name}. Skim it, then sketch your own structure.`;
  }
  if (lower.includes("priya") || lower.includes("david") || lower.includes("stakeholder")) {
    return `Think about what they're really worried about, not just what they wrote. A short acknowledgement plus one concrete next step usually lowers tension more than a long defence.`;
  }
  if (lower.includes("why")) {
    return `Good question to ask. In a ${c.name}, the "why" usually traces back to a decision someone needs to make. Figure out the decision first; the content follows.`;
  }
  return `Good question. For "${task.title}", I'd think about it this way: ${c.thisTask} Try the first hint and tell me what you find — I can react to your draft, but I won't write it for you.`;
}

export function AskMentorPanel({ task }: { task: MentorTaskContext }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "mentor",
      text: `I'm your mentor for "${task.title}". Ask me anything about the concept, the approach, or how to handle the stakeholder. I'll help you think — not do it for you.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "mentor", text: mockMentorReply(task, q) }]);
      setThinking(false);
    }, 600);
  }

  return (
    <section className="flex h-full flex-col">
      <div className="flex-1 space-y-3 pb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-orange-500/15 text-foreground"
                : "mr-auto bg-background/80 text-foreground/90 shadow-sm border border-border/60"
            }`}
          >
            {m.text}
          </div>
        ))}
        {thinking && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-3.5 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mentor is thinking…
          </div>
        )}
      </div>
      <form onSubmit={send} className="sticky bottom-0 mt-2 flex gap-2 bg-gradient-to-t from-[hsl(36,33%,97%)] to-transparent pb-1 pt-2 dark:from-card">
        <Input
          placeholder="Ask Atlas Mentor anything about this task..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="rounded-full border-border/70 bg-background"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || thinking}
          className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}

// ---------- Resources ----------
export function ResourcesPanel({ task }: { task: MentorTaskContext }) {
  const c = inferConcept(task);
  const items = [
    { title: `${c.name} — example template`, kind: "Template", desc: "A starter structure you can adapt." },
    { title: "Related project document", kind: "Document", desc: "Most recent artefact linked to this work." },
    { title: `${c.name} — PM concept guide`, kind: "Guide", desc: "Short read on the underlying method." },
    { title: `Previous email from ${task.stakeholder ?? "stakeholder"}`, kind: "Email", desc: "Context on what they've already said." },
    { title: "Project budget file", kind: "File", desc: "Current numbers you may need to reference." },
  ];
  return (
    <section className="space-y-2 pt-1">
      <p className="mb-2 text-xs text-muted-foreground">
        Resources are placeholders until the document and comms modules link real files for this task.
      </p>
      {items.map((r, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm"
        >
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium leading-tight">{r.title}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.kind}</div>
            <div className="mt-1 text-xs text-muted-foreground">{r.desc}</div>
          </div>
        </div>
      ))}
    </section>
  );
}