// Modular stakeholder-reply service powered by Gemini.
// Any future feature that needs an in-character stakeholder message can
// call `generateStakeholderReply` — no duplication with comms.functions.ts.
//
// This module is deliberately isolated from Atlas' existing static reply
// system. Callers are expected to `try` this function and fall back to
// their own static logic on error, so the simulation never breaks when
// Gemini is unavailable.
import { generateGeminiJSON, isGeminiAvailable } from "./gemini.server";

export type StakeholderProfile = {
  role: string;
  name: string;
  title: string;
};

export type ThreadMessage = {
  direction: "inbound" | "outbound";
  from: string;
  subject: string;
  body: string;
};

export type ProjectContext = {
  projectName: string;
  phase?: string | null;
  health?: string | null;
  reputation?: number | null;
  progress?: number | null;
  evidenceSummary?: string;
  attachmentDetail?: string;
};

export type StakeholderReply = {
  sender_role: string;
  subject: string;
  body: string;
  sentiment: "positive" | "neutral" | "pushback" | "concerned" | "ignored";
};

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    sender_role: { type: "string" },
    subject: { type: "string" },
    body: { type: "string" },
    sentiment: {
      type: "string",
      enum: ["positive", "neutral", "pushback", "concerned", "ignored"],
    },
  },
  required: ["sender_role", "subject", "body", "sentiment"],
} as const;

const ROLE_CHARACTER: Record<string, string> = {
  pm: "checks process, RAID, deadlines, owners.",
  sponsor: "busy, expects clarity, can be impatient.",
  finance: "pushes back on cost/value, asks for forecasts and approval routes.",
  tech: "talks integrations, data, downtime, acceptance criteria.",
  vendor: "defends commercials and scope, references contract.",
  operations: "talks about staff, floor reality, readiness, training.",
  care_home: "talks about staff, floor reality, readiness, training.",
  admin: "process and compliance, what is owed for audit.",
  clinical: "patient safety, governance, escalation triggers.",
};

function formatHistory(history: ThreadMessage[]): string {
  if (!history.length) return "(this is the first message in the thread)";
  return history
    .slice(-10) // keep prompt bounded
    .map(
      (m, i) =>
        `[${i + 1}] ${m.direction === "outbound" ? "Coordinator" : m.from}\nSubject: ${m.subject}\n${m.body}`,
    )
    .join("\n---\n");
}

export function isStakeholderAIAvailable(): boolean {
  return isGeminiAvailable();
}

/**
 * Ask Gemini to write the stakeholder's next email in-character.
 * Throws on any failure — callers should catch and use their static fallback.
 */
export async function generateStakeholderReply(input: {
  stakeholder: StakeholderProfile;
  project: ProjectContext;
  learnerMessage: {
    subject: string;
    body: string;
    msgType: string;
    attachmentKind?: string | null;
    attachmentLabel?: string | null;
  };
  history: ThreadMessage[];
}): Promise<StakeholderReply> {
  const { stakeholder, project, learnerMessage, history } = input;
  const character = ROLE_CHARACTER[stakeholder.role] ?? "professional and direct.";

  const systemInstruction = `You role-play "${stakeholder.name}, ${stakeholder.title}" — a real stakeholder on a workplace project simulation used to train project coordinators.
Stay in character (${stakeholder.role}: ${character}). Never break the fourth wall, never mention AI, models, or that this is a simulation.
Write in first person as ${stakeholder.name}. Sign off with your name and title.
2–4 short paragraphs. Do not use generic placeholder wording like "Thanks for the note — I'll come back to you shortly".
Respond ONLY with a JSON object matching the required schema.`;

  const prompt = `Project: ${project.projectName}
Phase: ${project.phase ?? "unknown"} · Health: ${project.health ?? "unknown"} · Reputation: ${project.reputation ?? "?"}/100 · Progress: ${project.progress ?? "?"}/100

Workspace evidence you can see right now:
${project.evidenceSummary ?? "(none)"}

Prior conversation in this thread:
${formatHistory(history)}

The coordinator just sent you this ${learnerMessage.msgType.toLowerCase()} email:
Subject: ${learnerMessage.subject}
Body:
${learnerMessage.body}
${learnerMessage.attachmentLabel ? `Attached: ${learnerMessage.attachmentKind ?? "file"} — ${learnerMessage.attachmentLabel}` : "No attachment."}

Write your reply. Ground it in the evidence and the thread history above; if the coordinator says something is done/attached and the evidence supports it, acknowledge that — do not claim you cannot see the file.
Only push back or escalate when there is a specific unresolved gap.
Choose sentiment honestly: positive, neutral, pushback, concerned, or ignored (if ignored, body is a short auto-reply / out of office).
Set "sender_role" to "${stakeholder.title}" and start the subject with "Re: " unless the original already does.`;

  const raw = await generateGeminiJSON<StakeholderReply>(prompt, {
    schema: REPLY_SCHEMA,
    systemInstruction,
  });

  // Defensive normalization
  const subject = raw.subject?.trim() || `Re: ${learnerMessage.subject}`;
  return {
    sender_role: raw.sender_role?.trim() || stakeholder.title,
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    body: raw.body?.trim() || "",
    sentiment: raw.sentiment ?? "neutral",
  };
}