// Reusable AI Mentor service powered by Gemini.
// Isolated from Atlas' existing coaching flows so it can be extended by
// future sprints without touching the mentor server function or UI.
//
// Contract: `generateMentorAnswer` throws on any failure. Callers must
// catch and fall back to their static/gateway logic so the simulation
// never breaks when Gemini is unavailable.
import { generateGeminiText, isGeminiAvailable } from "./gemini.server";

export type MentorScreen = {
  route: string;
  area: string;
  purpose: string;
  concept: string;
};

export type MentorStakeholder = {
  name: string;
  role: string;
  sentiment: number;
  concerns: string[];
};

export type MentorTask = {
  title: string;
  status: string;
  priority: string;
  due_at?: string | null;
};

export type MentorRaid = {
  kind: string;
  title: string;
  severity: string;
  status: string;
  owner?: string | null;
};

export type MentorComm = {
  direction: "in" | "out";
  from: string;
  subject: string;
  snippet: string;
};

export type MentorContext = {
  learnerName?: string;
  screen: MentorScreen;
  project: {
    name: string;
    phase?: string | null;
    progressPct?: number | null;
    status?: string | null;
  };
  counts: { openTasks: number; unreadInbox: number };
  stakeholders: MentorStakeholder[];
  tasks: MentorTask[];
  raid: MentorRaid[];
  recentComms: MentorComm[];
  recentDecisions: string[];
  recentEvidence: string[];
};

export type MentorTurn = { role: "learner" | "mentor"; content: string };

export function isMentorAIAvailable(): boolean {
  return isGeminiAvailable();
}

const SYSTEM_INSTRUCTION = `You are "Atlas Mentor", a calm, senior project-management coach embedded inside a workplace simulation for learners.

ROLE
- Coach, do NOT complete the learner's work.
- Explain concepts in plain English, suggest approaches, flag risks, and ask sharp questions that build critical thinking.
- Be specific to the learner's current screen and project state — never generic PM theory.

HARD RULES
- Never draft the learner's deliverables end-to-end: no full emails to stakeholders, no full status reports, no full RAID entries, no full change requests, no full charters.
- If asked "write the email/report/document for me", refuse briefly, then coach: name the audience, the outcome, the 3-4 things the learner should include, and one pitfall to avoid.
- Prefer 1-2 short paragraphs OR a compact list of up to 5 bullets. No headings, no preamble, no "as an AI".
- Grounded honesty: if a risk, missing evidence, or weak sentiment appears in the context, name it.
- Never invent stakeholders, tasks, RAID items or evidence that aren't in the provided context.
- Never mention Gemini, models, prompts, or that this is a simulation.`;

function formatContext(ctx: MentorContext): string {
  const s = ctx.stakeholders.slice(0, 8).map(
    (x) =>
      `- ${x.name} (${x.role}) · sentiment ${x.sentiment}/100${
        x.concerns.length ? ` · concerns: ${x.concerns.slice(0, 3).join("; ")}` : ""
      }`,
  ).join("\n") || "(none recorded)";

  const t = ctx.tasks.slice(0, 8).map(
    (x) => `- [${x.status}${x.priority ? `/${x.priority}` : ""}] ${x.title}${x.due_at ? ` · due ${x.due_at.slice(0, 10)}` : ""}`,
  ).join("\n") || "(no open tasks)";

  const r = ctx.raid.slice(0, 8).map(
    (x) => `- ${x.kind.toUpperCase()} [${x.severity}/${x.status}] ${x.title}${x.owner ? ` · owner ${x.owner}` : ""}`,
  ).join("\n") || "(RAID log empty)";

  const c = ctx.recentComms.slice(0, 6).map(
    (m) => `- ${m.direction === "in" ? "IN " : "OUT"} ${m.from}: "${m.subject}" — ${m.snippet}`,
  ).join("\n") || "(no recent emails)";

  const d = ctx.recentDecisions.length ? ctx.recentDecisions.slice(0, 5).map((x) => `- ${x}`).join("\n") : "(none logged)";
  const e = ctx.recentEvidence.length ? ctx.recentEvidence.slice(0, 5).map((x) => `- ${x}`).join("\n") : "(none submitted)";

  return `LEARNER: ${ctx.learnerName ?? "the coordinator"}
SCREEN: ${ctx.screen.area} (${ctx.screen.route})
Screen purpose: ${ctx.screen.purpose}
Underlying concept: ${ctx.screen.concept}

PROJECT: ${ctx.project.name}${ctx.project.phase ? ` · phase ${ctx.project.phase}` : ""}${
    typeof ctx.project.progressPct === "number" ? ` · progress ${ctx.project.progressPct}%` : ""
  }${ctx.project.status ? ` · status ${ctx.project.status}` : ""}
Open tasks: ${ctx.counts.openTasks} · Unread inbox: ${ctx.counts.unreadInbox}

STAKEHOLDERS:
${s}

OPEN / RECENT TASKS:
${t}

RAID LOG:
${r}

RECENT CONVERSATIONS:
${c}

RECENT LEARNER DECISIONS:
${d}

RECENT SUBMITTED EVIDENCE:
${e}`;
}

function formatHistory(history: MentorTurn[]): string {
  if (!history.length) return "";
  return (
    "\n\nCONVERSATION SO FAR:\n" +
    history
      .slice(-8)
      .map((t) => `${t.role === "learner" ? "Learner" : "Mentor"}: ${t.content}`)
      .join("\n")
  );
}

/**
 * One-shot mentor answer. Use for the initial brief on a screen and for
 * multi-turn chat (pass prior turns via `history`).
 */
export async function generateMentorAnswer(input: {
  context: MentorContext;
  question: string;
  history?: MentorTurn[];
}): Promise<string> {
  const prompt = `${formatContext(input.context)}${formatHistory(input.history ?? [])}

Learner asks: ${input.question.trim()}

Coach them. Stay concrete to the context above.`;
  const text = await generateGeminiText(prompt, {
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  const clean = text.trim();
  if (!clean) throw new Error("Mentor returned empty response");
  return clean;
}