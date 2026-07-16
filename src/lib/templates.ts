// Reusable submission templates + rules-based readiness engine.
// The engine runs client-side on every keystroke; the AI check server
// function complements it for contextual quality. Both feed the same
// { score, status, checks } shape so the UI is unchanged either way.

export type TemplateKind =
  | "raid_log"
  | "project_charter"
  | "status_report"
  | "resource_plan"
  | "change_request"
  | "stakeholder_register"
  | "meeting_agenda"
  | "lessons_learned";

export type FieldSpec = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date" | "select" | "rag";
  placeholder?: string;
  guidance?: string;
  options?: string[];
  required?: boolean;
  minChars?: number;
};

export type TemplateDef = {
  kind: TemplateKind;
  label: string;
  intro: string;
  fields: FieldSpec[];
};

export const TEMPLATES: Record<TemplateKind, TemplateDef> = {
  project_charter: {
    kind: "project_charter",
    label: "Project Charter",
    intro:
      "Capture why this project exists, what it will deliver, who owns it, and how success will be judged. Keep it specific to the current scenario — the sponsor will read this.",
    fields: [
      {
        key: "purpose",
        label: "Purpose & business case",
        kind: "textarea",
        required: true,
        minChars: 80,
        placeholder: "What problem is this project solving, and what value does it create?",
        guidance: "Reference the actual business driver from the brief — don't paraphrase a template.",
      },
      {
        key: "objectives",
        label: "Objectives",
        kind: "textarea",
        required: true,
        minChars: 60,
        placeholder: "3–5 measurable objectives. Include what, how much, by when.",
      },
      {
        key: "scope_in",
        label: "In scope",
        kind: "textarea",
        required: true,
        minChars: 40,
      },
      {
        key: "scope_out",
        label: "Out of scope",
        kind: "textarea",
        minChars: 20,
        guidance: "Explicitly naming what is out of scope prevents scope creep later.",
      },
      {
        key: "success_criteria",
        label: "Success criteria",
        kind: "textarea",
        required: true,
        minChars: 40,
        placeholder: "How will you know the project succeeded? Quantify where possible.",
      },
      {
        key: "sponsor",
        label: "Sponsor (named)",
        kind: "text",
        required: true,
        placeholder: "Full name and role",
      },
      {
        key: "governance",
        label: "Governance & decision rights",
        kind: "textarea",
        required: true,
        minChars: 40,
        placeholder: "Steering committee, escalation path, change control.",
      },
      {
        key: "milestones",
        label: "Key milestones & dates",
        kind: "textarea",
        required: true,
        minChars: 30,
        placeholder: "e.g. Discovery complete 12 Sep · Go-live 15 Dec",
      },
      {
        key: "assumptions",
        label: "Assumptions & constraints",
        kind: "textarea",
        minChars: 20,
      },
    ],
  },
  status_report: {
    kind: "status_report",
    label: "Status Report",
    intro:
      "Weekly status update for the sponsor and steering committee. Be honest about the RAG — a green report that hides risks is worse than an amber one that explains them.",
    fields: [
      { key: "period", label: "Reporting period", kind: "text", required: true, placeholder: "e.g. Week ending 21 March" },
      { key: "rag", label: "Overall RAG", kind: "rag", required: true, options: ["green", "amber", "red"] },
      {
        key: "achievements",
        label: "Achievements this week",
        kind: "textarea",
        required: true,
        minChars: 60,
        placeholder: "Concrete, dated outcomes. Name the people who delivered them.",
      },
      {
        key: "next_week",
        label: "Focus for next week",
        kind: "textarea",
        required: true,
        minChars: 40,
      },
      {
        key: "risks_blockers",
        label: "Risks & blockers",
        kind: "textarea",
        required: true,
        minChars: 40,
        placeholder: "Name each risk, its owner, and current mitigation status.",
        guidance: "Include a named owner for each risk — 'the team' is not an owner.",
      },
      {
        key: "decisions_needed",
        label: "Decisions needed from sponsor",
        kind: "textarea",
        minChars: 20,
        guidance: "If RAG is amber or red, decisions requested is usually required.",
      },
      {
        key: "budget_note",
        label: "Budget / schedule note",
        kind: "textarea",
        minChars: 20,
        placeholder: "Actuals vs plan, forecast at completion, schedule slippage.",
      },
    ],
  },
  raid_log: {
    kind: "raid_log",
    label: "RAID Log",
    intro:
      "The RAID Log tracks live Risks, Assumptions, Issues and Dependencies. Add and manage entries in the RAID module — this task closes when the log has meaningful coverage across all four kinds.",
    // RAID readiness derives from actual raid_items rows, not from these
    // fields. We keep a single optional narrative field for the submission
    // note itself.
    fields: [
      {
        key: "narrative",
        label: "Submission note (optional)",
        kind: "textarea",
        minChars: 20,
        placeholder: "Anything you want the reviewer to know about how you built the log?",
      },
    ],
  },
};

// ---------- Additional MVP+ templates (reuse renderer + generic evaluator) ----------

const EXTRA_TEMPLATES: Record<
  Exclude<TemplateKind, "raid_log" | "project_charter" | "status_report">,
  TemplateDef
> = {
  resource_plan: {
    kind: "resource_plan",
    label: "Resource Plan",
    intro:
      "Lay out the people, skills and time you need to deliver this phase. Be specific — name roles, allocations and dates rather than generic teams.",
    fields: [
      { key: "objectives", label: "What this plan must enable", kind: "textarea", required: true, minChars: 60, placeholder: "Which outcomes or milestones does this resourcing support?" },
      { key: "roles", label: "Roles & named people", kind: "textarea", required: true, minChars: 80, placeholder: "e.g. Sarah Williams — Delivery Lead (0.6 FTE, Sep–Dec)" },
      { key: "skills", label: "Critical skills / gaps", kind: "textarea", required: true, minChars: 40, guidance: "Call out where you are short and how you'll close the gap." },
      { key: "allocation", label: "Time allocation & timeline", kind: "textarea", required: true, minChars: 40, placeholder: "FTE %, start/end dates, ramp-up." },
      { key: "dependencies", label: "External dependencies", kind: "textarea", minChars: 30, placeholder: "Vendors, shared services, procurement lead times." },
      { key: "cost", label: "Cost impact", kind: "textarea", minChars: 30, placeholder: "Rough £ impact vs. budget line." },
      { key: "risks", label: "Resource risks", kind: "textarea", minChars: 30, placeholder: "Key-person risk, holidays, competing priorities." },
    ],
  },
  change_request: {
    kind: "change_request",
    label: "Change Request",
    intro:
      "Formal request to change scope, schedule or budget. The change board needs enough context to decide — no vague 'improvements'.",
    fields: [
      { key: "summary", label: "Change summary", kind: "textarea", required: true, minChars: 60, placeholder: "One paragraph: what is changing and why now." },
      { key: "reason", label: "Reason / trigger", kind: "textarea", required: true, minChars: 60, placeholder: "What event, risk or finding triggered this?" },
      { key: "impact_scope", label: "Impact on scope", kind: "textarea", required: true, minChars: 40 },
      { key: "impact_schedule", label: "Impact on schedule", kind: "textarea", required: true, minChars: 30, placeholder: "New dates or slippage in days/weeks." },
      { key: "impact_cost", label: "Impact on cost", kind: "textarea", required: true, minChars: 30, placeholder: "Quantify £ / effort delta." },
      { key: "options", label: "Options considered", kind: "textarea", required: true, minChars: 60, guidance: "At least two options with pros/cons — never single-option asks." },
      { key: "recommendation", label: "Recommendation", kind: "textarea", required: true, minChars: 40 },
      { key: "requester", label: "Requested by (named)", kind: "text", required: true, placeholder: "Full name and role" },
      { key: "decision_by", label: "Decision needed by", kind: "text", required: true, placeholder: "e.g. 24 Oct — before sprint planning" },
    ],
  },
  stakeholder_register: {
    kind: "stakeholder_register",
    label: "Stakeholder Register",
    intro:
      "Map the people who can make or break this project. Every entry needs a name, interest, influence and an engagement plan — not job titles alone.",
    fields: [
      { key: "sponsor", label: "Sponsor (named)", kind: "text", required: true, placeholder: "Full name and role" },
      { key: "key_stakeholders", label: "Key stakeholders", kind: "textarea", required: true, minChars: 120, placeholder: "Name · Role · Interest · Influence (H/M/L) · Attitude", guidance: "One person per line. Cover at least 4–6 people." },
      { key: "engagement_plan", label: "Engagement plan", kind: "textarea", required: true, minChars: 80, placeholder: "Who is briefed how often, by which channel, by whom." },
      { key: "communications", label: "Communication cadence", kind: "textarea", required: true, minChars: 40, placeholder: "Weekly digest, monthly steerco, ad-hoc 1:1s…" },
      { key: "resistance", label: "Resistance & mitigations", kind: "textarea", minChars: 40, guidance: "Name likely blockers and how you will handle them." },
      { key: "owner", label: "Register owner", kind: "text", required: true, placeholder: "Who keeps this register current?" },
    ],
  },
  meeting_agenda: {
    kind: "meeting_agenda",
    label: "Meeting Agenda",
    intro:
      "A working agenda that respects attendees' time. Every item needs a purpose, owner and time-box — decisions, not status theatre.",
    fields: [
      { key: "meeting_title", label: "Meeting title", kind: "text", required: true, placeholder: "e.g. Steering Committee — October" },
      { key: "datetime", label: "Date & time", kind: "text", required: true, placeholder: "e.g. Tue 15 Oct · 14:00–15:00 BST" },
      { key: "attendees", label: "Attendees (named)", kind: "textarea", required: true, minChars: 40, placeholder: "Name · Role · Required or Optional" },
      { key: "objectives", label: "Meeting objectives", kind: "textarea", required: true, minChars: 60, placeholder: "What must be true when this meeting ends?" },
      { key: "agenda_items", label: "Agenda items (owner, time-box)", kind: "textarea", required: true, minChars: 120, placeholder: "1. Portfolio update — Sarah — 10 min\n2. RAID review — James — 15 min\n3. Decision: budget uplift — Sponsor — 10 min", guidance: "At least 3 items with owners and durations." },
      { key: "decisions_needed", label: "Decisions requested", kind: "textarea", required: true, minChars: 40 },
      { key: "prereads", label: "Pre-reads", kind: "textarea", minChars: 20, placeholder: "Links or documents attendees should read first." },
    ],
  },
  lessons_learned: {
    kind: "lessons_learned",
    label: "Lessons Learned",
    intro:
      "Honest retrospective. Capture what worked, what didn't, and — most important — concrete actions the next project will inherit.",
    fields: [
      { key: "context", label: "Project / phase context", kind: "textarea", required: true, minChars: 60, placeholder: "What was delivered, over what period, with which team." },
      { key: "went_well", label: "What went well", kind: "textarea", required: true, minChars: 80, placeholder: "Practices, tools, people to repeat. Be specific." },
      { key: "went_poorly", label: "What did not go well", kind: "textarea", required: true, minChars: 80, guidance: "No blame — describe the pattern, not the person." },
      { key: "root_causes", label: "Root causes", kind: "textarea", required: true, minChars: 60, placeholder: "Ask 'why' at least twice per issue." },
      { key: "actions", label: "Recommended actions (owner + date)", kind: "textarea", required: true, minChars: 80, placeholder: "Action · Owner · Target date", guidance: "Actions without an owner and a date will not land." },
      { key: "reusable_assets", label: "Reusable assets / knowledge", kind: "textarea", minChars: 30 },
      { key: "facilitator", label: "Facilitator (named)", kind: "text", required: true, placeholder: "Who ran the retro?" },
    ],
  },
};

Object.assign(TEMPLATES, EXTRA_TEMPLATES);

/* ---------- Detection: pick the template for a task ---------- */

export function detectTemplateKind(task: {
  title?: string | null;
  category?: string | null;
  linked_area?: string | null;
}): TemplateKind | null {
  const s = `${task.title ?? ""} ${task.category ?? ""} ${task.linked_area ?? ""}`.toLowerCase();
  if (/\braid\b|risk log|risk register/.test(s)) return "raid_log";
  if (/charter/.test(s)) return "project_charter";
  if (/status report|weekly (status|report)|status update/.test(s)) return "status_report";
  if (/change request|change control|scope change|cr\b/.test(s)) return "change_request";
  if (/stakeholder (register|map|matrix|analysis)/.test(s)) return "stakeholder_register";
  if (/resource plan|resourcing|capacity plan|staffing plan/.test(s)) return "resource_plan";
  if (/meeting agenda|steerco agenda|kick[- ]?off (agenda|prep)|agenda\b/.test(s)) return "meeting_agenda";
  if (/lessons learned|retrospective|retro\b|post[- ]?mortem/.test(s)) return "lessons_learned";
  return null;
}

/* ---------- Rules-based readiness ---------- */

export type ReadinessStatus = "not_ready" | "needs_improvement" | "ready";

export type ReadinessCheck = {
  label: string;
  ok: boolean;
  hint?: string;
};

export type Readiness = {
  score: number; // 0–100
  status: ReadinessStatus;
  checks: ReadinessCheck[];
  source: "rules" | "ai";
};

const DATE_RX = /\b(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(\d{4}-\d{2}-\d{2})|(next\s+(week|month|quarter))|(q[1-4]\s*\d{2,4}))/i;
const OWNER_RX = /\b(owner|assigned to|lead|responsible)\s*[:\-–]\s*[A-Z][a-z]+/i;

function bucket(score: number): ReadinessStatus {
  if (score < 40) return "not_ready";
  if (score < 80) return "needs_improvement";
  return "ready";
}

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => t && lower.includes(t.toLowerCase()));
}

type CharterValues = Record<string, string>;
type StatusValues = Record<string, string>;

export type RaidCounts = {
  risk: number;
  assumption: number;
  issue: number;
  dependency: number;
  highOrCriticalRisks: number;
  risksWithOwnerAndMitigation: number;
};

export type ProjectContext = {
  projectName?: string | null;
  stakeholders?: string[];
};

export function evaluateCharter(values: CharterValues, ctx: ProjectContext = {}): Readiness {
  const spec = TEMPLATES.project_charter.fields;
  const checks: ReadinessCheck[] = [];
  let score = 0;
  const totalWeight = spec.reduce((s, f) => s + (f.required ? 2 : 1), 0);
  let earned = 0;

  for (const f of spec) {
    const raw = (values[f.key] ?? "").trim();
    const weight = f.required ? 2 : 1;
    const min = f.minChars ?? 0;
    const ok = raw.length >= min && (!f.required || raw.length > 0);
    if (ok) earned += weight;
    if (f.required || min > 0) {
      checks.push({
        label: f.label,
        ok,
        hint: ok ? undefined : raw.length === 0 ? "Add content for this section." : `Add more detail — at least ${min} characters of specifics.`,
      });
    }
  }

  score = Math.round((earned / totalWeight) * 70);

  // Bonus: named sponsor with role
  const sponsor = (values.sponsor ?? "").trim();
  const namedSponsor = /\S+\s+\S+/.test(sponsor);
  checks.push({
    label: "Sponsor is named (first + last name)",
    ok: namedSponsor,
    hint: namedSponsor ? undefined : "Add the sponsor's full name and role.",
  });
  if (namedSponsor) score += 5;

  // Bonus: milestones contain a date
  const milestones = values.milestones ?? "";
  const hasDate = DATE_RX.test(milestones);
  checks.push({
    label: "Milestones include a target date",
    ok: hasDate,
    hint: hasDate ? undefined : "Include at least one dated milestone.",
  });
  if (hasDate) score += 10;

  // Bonus: references the actual project
  const blob = Object.values(values).join(" ");
  const projectMentioned = ctx.projectName ? blob.toLowerCase().includes(ctx.projectName.toLowerCase()) : true;
  checks.push({
    label: "References the current project scenario",
    ok: projectMentioned,
    hint: projectMentioned ? undefined : `Mention "${ctx.projectName}" or a specific detail from the brief.`,
  });
  if (projectMentioned) score += 10;

  // Bonus: references at least one named stakeholder
  if (ctx.stakeholders && ctx.stakeholders.length > 0) {
    const namedStakeholder = containsAny(blob, ctx.stakeholders);
    checks.push({
      label: "Mentions a named stakeholder",
      ok: namedStakeholder,
      hint: namedStakeholder ? undefined : "Name at least one stakeholder from the brief.",
    });
    if (namedStakeholder) score += 5;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, status: bucket(score), checks, source: "rules" };
}

export function evaluateStatusReport(values: StatusValues, ctx: ProjectContext = {}): Readiness {
  const spec = TEMPLATES.status_report.fields;
  const checks: ReadinessCheck[] = [];
  let earned = 0;
  const totalWeight = spec.reduce((s, f) => s + (f.required ? 2 : 1), 0);

  for (const f of spec) {
    const raw = (values[f.key] ?? "").trim();
    const weight = f.required ? 2 : 1;
    const min = f.minChars ?? 0;
    const ok = raw.length >= min && (!f.required || raw.length > 0);
    if (ok) earned += weight;
    if (f.required || min > 0) {
      checks.push({
        label: f.label,
        ok,
        hint: ok ? undefined : raw.length === 0 ? "Add content for this section." : `Add more detail — at least ${min} characters.`,
      });
    }
  }
  let score = Math.round((earned / totalWeight) * 60);

  const risks = values.risks_blockers ?? "";
  const hasOwner = OWNER_RX.test(risks) || /\bowner:\s*\S+/i.test(risks);
  checks.push({
    label: "Each risk has a named owner",
    ok: hasOwner,
    hint: hasOwner ? undefined : "Add a named owner for each risk (e.g. 'Owner: Sarah Williams').",
  });
  if (hasOwner) score += 10;

  const achievements = values.achievements ?? "";
  const hasDate = DATE_RX.test(achievements) || DATE_RX.test(values.next_week ?? "");
  checks.push({
    label: "Achievements or plan reference dates",
    ok: hasDate,
    hint: hasDate ? undefined : "Anchor achievements or next-week plan to specific dates.",
  });
  if (hasDate) score += 10;

  const rag = (values.rag ?? "").toLowerCase();
  const decisions = (values.decisions_needed ?? "").trim();
  const needsDecisions = rag === "amber" || rag === "red";
  const decisionsOk = needsDecisions ? decisions.length >= 20 : true;
  checks.push({
    label: needsDecisions ? "Decisions requested when RAG is amber/red" : "Decisions requested (optional if green)",
    ok: decisionsOk,
    hint: decisionsOk ? undefined : "Amber/red reports must ask the sponsor for specific decisions.",
  });
  if (decisionsOk) score += 10;

  const blob = Object.values(values).join(" ");
  const projectMentioned = ctx.projectName ? blob.toLowerCase().includes(ctx.projectName.toLowerCase()) : true;
  checks.push({
    label: "References the current project scenario",
    ok: projectMentioned,
    hint: projectMentioned ? undefined : `Mention "${ctx.projectName}" or a specific detail from this week.`,
  });
  if (projectMentioned) score += 10;

  score = Math.max(0, Math.min(100, score));
  return { score, status: bucket(score), checks, source: "rules" };
}

export function evaluateRaid(counts: RaidCounts): Readiness {
  const checks: ReadinessCheck[] = [];
  let score = 0;

  const kindsCovered = [counts.risk, counts.assumption, counts.issue, counts.dependency].filter((n) => n > 0).length;
  const allKinds = kindsCovered === 4;
  checks.push({
    label: "At least one entry in each of R, A, I, D",
    ok: allKinds,
    hint: allKinds ? undefined : `Missing ${4 - kindsCovered} kind(s). Add entries under the empty tabs.`,
  });
  score += kindsCovered * 15; // up to 60

  const risksControlled = counts.risksWithOwnerAndMitigation >= 2;
  checks.push({
    label: "At least 2 risks with a named owner and mitigation",
    ok: risksControlled,
    hint: risksControlled ? undefined : "Assign an owner and a mitigation action to your risks.",
  });
  if (risksControlled) score += 20;

  const highRiskCovered = counts.highOrCriticalRisks === 0 || counts.risksWithOwnerAndMitigation >= counts.highOrCriticalRisks;
  checks.push({
    label: "High/critical risks all have controls",
    ok: highRiskCovered,
    hint: highRiskCovered ? undefined : "Every high or critical risk needs an owner and a mitigation.",
  });
  if (highRiskCovered) score += 10;

  const depth = counts.risk + counts.assumption + counts.issue + counts.dependency >= 6;
  checks.push({
    label: "Log has meaningful coverage (≥6 entries total)",
    ok: depth,
    hint: depth ? undefined : "Add a few more entries so governance has something to challenge.",
  });
  if (depth) score += 10;

  score = Math.max(0, Math.min(100, score));
  return { score, status: bucket(score), checks, source: "rules" };
}

/* ---------- Submission payload (encoded into tasks.submission TEXT) ---------- */

export type SubmissionPayload =
  | {
      kind: "template";
      template: TemplateKind;
      values: Record<string, string>;
      readiness: Readiness;
      ai_readiness?: Readiness | null;
    }
  | {
      kind: "upload";
      template?: TemplateKind | null;
      document_id: string;
      document_title: string;
      note?: string;
      readiness: Readiness;
      ai_readiness?: Readiness | null;
    }
  | {
      kind: "free_text";
      text: string;
    };

const PAYLOAD_MARKER = "@@ATLAS_SUBMISSION_V1@@";

export function encodeSubmission(payload: SubmissionPayload): string {
  return `${PAYLOAD_MARKER}${JSON.stringify(payload)}`;
}

export function decodeSubmission(raw: string | null | undefined): SubmissionPayload | null {
  if (!raw) return null;
  if (!raw.startsWith(PAYLOAD_MARKER)) return null;
  try {
    return JSON.parse(raw.slice(PAYLOAD_MARKER.length)) as SubmissionPayload;
  } catch {
    return null;
  }
}

/* ---------- Human-readable narrative for AI feedback pipeline ---------- */

export function payloadToNarrative(payload: SubmissionPayload, templateLabel: string): string {
  if (payload.kind === "template") {
    const lines = [`Submission via Atlas template: ${templateLabel}.`];
    for (const [k, v] of Object.entries(payload.values)) {
      if (v && v.trim()) lines.push(`\n## ${k}\n${v.trim()}`);
    }
    lines.push(`\n(Rules readiness: ${payload.readiness.score}/100 — ${payload.readiness.status})`);
    return lines.join("\n");
  }
  if (payload.kind === "upload") {
    return `Submitted uploaded PDF document: "${payload.document_title}"${
      payload.note ? `\n\nSubmitter note: ${payload.note}` : ""
    }\n\n(Rules readiness: ${payload.readiness.score}/100 — ${payload.readiness.status})`;
  }
  return payload.text;
}