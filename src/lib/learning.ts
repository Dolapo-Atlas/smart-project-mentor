// Atlas Learning Journey — phase roadmap + helpers (framework-free).
// Safe to import from both client components and server functions.

export type Competency = { id: string; label: string };
export type Phase = {
  phase: number;
  title: string;
  unlock_hint: string;
  competencies: Competency[];
};

function c(prefix: string, label: string): Competency {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return { id: `${prefix}.${slug}`, label };
}

const P = (n: number, title: string, unlock_hint: string, labels: string[]): Phase => ({
  phase: n,
  title,
  unlock_hint,
  competencies: labels.map((l) => c(`p${n}`, l)),
});

export const PHASES: Phase[] = [
  P(1, "Project Initiation", "Visible from day 1", [
    "Project Lifecycle Fundamentals",
    "Business Case Basics",
    "Project Objectives",
    "Scope Definition",
    "In Scope vs Out of Scope",
    "Success Criteria",
    "Project Charter Creation",
    "Project Sponsor Role",
    "Project Manager Role",
    "Project Coordinator Role",
    "Governance Structures",
    "Stage Gates",
    "Project Kick-off",
  ]),
  P(2, "Stakeholder Management", "Unlock: Stakeholder Register accepted", [
    "Stakeholder Identification",
    "Stakeholder Register",
    "Power Interest Matrix",
    "Stakeholder Analysis",
    "Engagement Strategies",
    "Escalation Routes",
    "Managing Difficult Stakeholders",
    "Executive Sponsors",
    "Governance Boards",
    "Vendor Management",
  ]),
  P(3, "Planning", "Unlock: Project Plan accepted", [
    "Project Planning",
    "Work Breakdown Structure",
    "Milestones",
    "Deliverables",
    "Dependencies",
    "Assumptions",
    "Constraints",
    "Schedule Management",
    "Critical Path Awareness",
    "Resource Planning",
    "Budget Awareness",
  ]),
  P(4, "Risk & Governance", "Unlock: RAID Log accepted", [
    "Risk Management",
    "RAID Log",
    "Risks",
    "Assumptions Tracking",
    "Issues",
    "Dependencies Tracking",
    "Risk Ownership",
    "Mitigation Plans",
    "Escalation Triggers",
    "Governance Reviews",
    "RAG Status Reporting",
  ]),
  P(5, "Communication", "Unlock: Communication Plan accepted", [
    "Status Reporting",
    "Project Updates",
    "Executive Briefings",
    "Stakeholder Emails",
    "Meeting Preparation",
    "Meeting Minutes",
    "Action Tracking",
    "Decision Logs",
    "Communication Planning",
  ]),
  P(6, "Delivery & Execution", "Unlock: Delivery phase begins", [
    "Managing Workstreams",
    "Tracking Progress",
    "Managing Delays",
    "Change Requests",
    "Issue Resolution",
    "Vendor Coordination",
    "Training Rollout",
    "User Adoption",
    "Benefits Tracking",
  ]),
  P(7, "Project Controls", "Unlock: First Status Report accepted", [
    "Budget Tracking",
    "Forecasting",
    "Variance Analysis",
    "Resource Monitoring",
    "Schedule Monitoring",
    "KPI Tracking",
    "Governance Reporting",
  ]),
  P(8, "Project Closure", "Unlock: Closure phase starts", [
    "Lessons Learned",
    "Handover Planning",
    "Benefits Realisation",
    "Project Closure Report",
    "Final Governance Review",
    "Project Archive",
    "Closure Sign-off",
  ]),
];

export function allCompetencyIds(): string[] {
  return PHASES.flatMap((p) => p.competencies.map((c) => c.id));
}

export function phaseOf(competencyId: string): number | null {
  const m = /^p(\d+)\./.exec(competencyId);
  return m ? Number(m[1]) : null;
}

/** Map a document title to the phase whose competencies it covers. */
export function phaseFromDocTitle(title: string): number | null {
  const t = title.toLowerCase();
  if (/\bcommunicat/.test(t) && /\bplan\b/.test(t)) return 5;
  if (/\braid\b/.test(t)) return 4;
  if (/\bstakeholder\b/.test(t) && /\bregister\b/.test(t)) return 2;
  if (/\bproject\s+plan\b/.test(t) || /\bwbs\b/.test(t) || /\bschedule\b/.test(t))
    return 3;
  if (/\bcharter\b/.test(t)) return 1;
  if (/\bstakeholder\b/.test(t)) return 2;
  return null;
}

export function competencyIdsForPhase(phase: number): string[] {
  return PHASES.find((p) => p.phase === phase)?.competencies.map((c) => c.id) ?? [];
}

/**
 * Decide which phases are unlocked given a set of mastered competency ids.
 * Phase 1 always unlocked. Phase N>=2 unlocked when 80% of phase N-1 mastered.
 */
export function unlockedPhases(masteredIds: Set<string>): Set<number> {
  const unlocked = new Set<number>([1]);
  for (let n = 2; n <= 8; n++) {
    const prev = competencyIdsForPhase(n - 1);
    const masteredPrev = prev.filter((id) => masteredIds.has(id)).length;
    if (prev.length > 0 && masteredPrev / prev.length >= 0.8) unlocked.add(n);
    else break;
  }
  return unlocked;
}

/** Phase-specific reflection prompt. */
export function reflectionPromptFor(phase: number): string {
  const map: Record<number, string> = {
    1: "In one sentence, what makes a Project Charter different from a Business Case?",
    2: "In one sentence, why do you place stakeholders on a Power/Interest matrix before drafting an engagement plan?",
    3: "In one sentence, what is the difference between a milestone and a deliverable?",
    4: "In one sentence, what is the difference between a Risk and an Issue?",
    5: "In one sentence, why does a Communication Plan matter more than ad-hoc emails?",
    6: "In one sentence, when does a delay become a change request rather than a risk?",
    7: "In one sentence, what is the point of variance analysis if the budget is fixed?",
    8: "In one sentence, what is the difference between project handover and project closure?",
  };
  return map[phase] ?? "What did you learn from this phase?";
}