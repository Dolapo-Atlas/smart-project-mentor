/**
 * Inbox triage — decides which unread stakeholder messages represent a genuine
 * unresolved learner obligation, and which are historical / informational /
 * system-generated notifications.
 *
 * Why this exists: readiness (and therefore phase-exit blockers) used to treat
 * every unread inbox row equally. Atlas itself generates a large volume of
 * acknowledgements ("Approved: Lessons Learned v1", "Review: Closure Report
 * 96/100", "Received: CR — ...", "Re: Week 9 status"). Those are records of work
 * the learner has ALREADY done; counting them as blockers made Closure
 * impossible to clear without mass-clicking, which teaches nothing.
 *
 * Only messages that ask the learner for something still outstanding count.
 */

export type InboxTriageKind = "actionable" | "informational";

export type TriageInput = {
  subject?: string | null;
  sender_role?: string | null;
  tone?: string | null;
  escalated_at?: string | null;
  body?: string | null;
};

/**
 * System-generated records of work the learner already submitted — approvals,
 * scored reviews, assurance feedback, logged change requests, minutes.
 * Where such feedback requires rework, Atlas raises a task or moves the
 * artifact to "changes_requested"; those are counted as blockers in their own
 * right, so the email itself must not double-count.
 */
const SYSTEM_SUBJECT = [
  /^\s*(approved|received|reviewed|noted|fyi|recorded|logged|closed)\b/i,
  /^\s*(changes requested|feedback|update)\b/i,
  /\breview(ed)?\s*:/i,
  /\bassurance\b/i,
  /\bfeedback\b/i,
  /\b\d{1,3}\s*\/\s*100\b/i,
  /\bminutes\b/i,
  /\bdigest\b/i,
  /\bconfirmation\b/i,
];

/** A reply on a thread the learner started — informational unless escalated. */
const REPLY_SUBJECT = /^\s*re\s*:/i;

/** Explicit asks that always require the learner to act. */
const ASK_SUBJECT = [
  /\baction required\b/i,
  /\bplease (confirm|approve|respond|review|provide|send)\b/i,
  /\bcan you\b/i,
  /\bneed(ed)? (from you|your)\b/i,
  /\brequest\b/i,
  /\bescalation\b/i,
  /\bdecision needed\b/i,
  /\?\s*$/,
];

const PRESSURE_TONES = new Set(["urgent", "frustrated", "angry", "concerned", "pressuring"]);

export function classifyInboxMessage(m: TriageInput): InboxTriageKind {
  const subject = (m.subject ?? "").trim();
  const tone = (m.tone ?? "").toLowerCase();
  const escalated = Boolean(m.escalated_at);
  const pressured = escalated || PRESSURE_TONES.has(tone);

  // Approvals and scored reviews are records, even when flagged urgent.
  const isSystemRecord = SYSTEM_SUBJECT.some((r) => r.test(subject));
  if (isSystemRecord && !escalated) return "informational";

  if (pressured) return "actionable";
  if (ASK_SUBJECT.some((r) => r.test(subject))) return "actionable";
  if (REPLY_SUBJECT.test(subject)) return "informational";

  // Default: an unsolicited stakeholder message with no acknowledgement marker
  // is treated as something the learner still owes a response to.
  return "actionable";
}

export function isActionableInboxMessage(m: TriageInput): boolean {
  return classifyInboxMessage(m) === "actionable";
}
