/**
 * Static, learner-safe context for each stakeholder role.
 *
 * This is presentation metadata only — it describes who a person is, what they
 * care about and why a coordinator might contact them. It deliberately holds
 * NO hidden simulation logic, no behavioural scores and no future project
 * events. Live state (sentiment, concerns, interactions) still comes from the
 * existing `stakeholder_relationships` data.
 */
export type ChipTone = "lilac" | "green" | "cream" | "orange" | "navy" | "neutral";

export type StakeholderProfileMeta = {
  /** One-line "who is this person" summary. */
  summary: string;
  /** Short role/status badge. */
  badge: string;
  /** Tags — what they care about. */
  tags: string[];
  /** Relationship to the project. */
  relationship: string;
  /** Key interests / responsibilities. */
  interests: string[];
  /** When it's sensible to contact them. */
  contactFor: string;
  tone: ChipTone;
};

const FALLBACK: StakeholderProfileMeta = {
  summary: "A project participant with their own priorities and pressures.",
  badge: "Stakeholder",
  tags: ["Project"],
  relationship: "Involved in delivery and affected by the outcome.",
  interests: ["How the project affects their area of responsibility"],
  contactFor: "Questions that sit inside their area of responsibility.",
  tone: "neutral",
};

export const STAKEHOLDER_PROFILES: Record<string, StakeholderProfileMeta> = {
  sponsor: {
    summary:
      "Senior sponsor responsible for strategic oversight, major escalation and funding decisions.",
    badge: "Executive",
    tags: ["Sponsor", "Governance"],
    relationship:
      "Owns the business case and accountability for the project. Chairs the steering committee and holds the mandate to release funding or stop work.",
    interests: [
      "Whether the project still delivers the promised benefit",
      "Decisions that need executive authority",
      "Risks with reputational or financial exposure",
      "Concise, decision-ready information — not detail",
    ],
    contactFor:
      "Decisions above your authority, funding or scope trade-offs, and escalations that cannot be resolved at delivery level.",
    tone: "navy",
  },
  pm: {
    summary:
      "Your direct manager. Sets priorities, reviews your work and represents delivery in governance.",
    badge: "Delivery lead",
    tags: ["Delivery", "Line manager"],
    relationship:
      "Accountable for day-to-day delivery and for the quality of what you produce. Your first port of call when you're unsure how to proceed.",
    interests: [
      "Plan, milestones, RAID discipline and clear owners",
      "Whether your deliverables are governance-ready",
      "Early warning of slippage rather than late surprises",
    ],
    contactFor:
      "Process questions, prioritisation, clarification on a deliverable, or agreeing how to handle a problem before it escalates.",
    tone: "lilac",
  },
  clinical: {
    summary:
      "Clinical governance lead protecting resident safety, records quality and regulatory compliance.",
    badge: "Governance",
    tags: ["Clinical safety", "Compliance"],
    relationship:
      "Must be satisfied that any change to care records is safe and defensible before it reaches residents. Can block go-live on safety grounds.",
    interests: [
      "Patient / resident safety impact of any change",
      "Data quality, consent and record-keeping standards",
      "Clear escalation triggers and approval routes",
      "Evidence that clinical staff were consulted",
    ],
    contactFor:
      "Anything touching resident safety, clinical records, consent, or the governance approval route.",
    tone: "green",
  },
  care_home: {
    summary:
      "Care home manager running a live site — protects staff time, rotas and day-to-day care delivery.",
    badge: "Operations",
    tags: ["Frontline", "Readiness"],
    relationship:
      "Represents the reality on the floor. Her site has to absorb training, new processes and any disruption the project creates.",
    interests: [
      "Staff availability, rotas and training time",
      "Whether the new way of working is realistic on a busy shift",
      "What happens if her site isn't ready in time",
      "Being told early, not on the day",
    ],
    contactFor:
      "Site readiness, training logistics, staffing impact, and how frontline teams will actually use the system.",
    tone: "cream",
  },
  tech: {
    summary:
      "Technical lead owning integration, data migration, environments and technical acceptance.",
    badge: "Technical",
    tags: ["Integration", "Data"],
    relationship:
      "Responsible for making the solution work technically and for saying whether a technical dependency is realistic within the plan.",
    interests: [
      "Integration points, interfaces and data migration",
      "Environments, downtime windows and cutover",
      "Acceptance criteria and testing evidence",
      "Realistic technical effort estimates",
    ],
    contactFor:
      "Technical feasibility, migration and integration questions, environment or downtime planning, and test evidence.",
    tone: "navy",
  },
  finance: {
    summary:
      "Finance lead protecting the budget, forecast accuracy and the approval route for spend.",
    badge: "Finance",
    tags: ["Budget", "Approvals"],
    relationship:
      "Controls how money is committed and reported. Any cost movement or contract change needs to be visible and approved through her.",
    interests: [
      "Forecast versus actuals and cost exposure",
      "Value for money and benefit realisation",
      "Approval thresholds and who can commit spend",
      "Numbers with a source, not estimates",
    ],
    contactFor:
      "Budget position, cost of a change, approval routes, and anything with a financial consequence.",
    tone: "orange",
  },
  vendor: {
    summary:
      "Solution partner and support advocate — delivers the product and defends the agreed contract scope.",
    badge: "Supplier",
    tags: ["Vendor", "Scope"],
    relationship:
      "Supplies and configures the solution under a commercial agreement. Helpful within scope, firm about anything beyond it.",
    interests: [
      "What is in the contracted scope",
      "Clear, consolidated requirements and decisions",
      "Change requests raised formally rather than informally",
      "Their own delivery timeline and dependencies",
    ],
    contactFor:
      "Product capability, configuration and support questions, and confirming whether something is in scope or a change request.",
    tone: "lilac",
  },
  operations: {
    summary:
      "Operations lead concerned with staffing, process change and business readiness.",
    badge: "Operations",
    tags: ["Readiness", "Process"],
    relationship:
      "Owns the operating process the project is changing and the readiness of the teams who have to run it.",
    interests: [
      "Process change and business readiness",
      "Staffing and capacity impact",
      "Training and support after go-live",
    ],
    contactFor:
      "Process impact, readiness planning and how teams will be supported through the change.",
    tone: "cream",
  },
  admin: {
    summary: "Business support and compliance — keeps the audit trail clean.",
    badge: "Compliance",
    tags: ["Audit", "Process"],
    relationship:
      "Maintains records, approvals and the paper trail the project will be audited against.",
    interests: [
      "Complete documentation and approvals",
      "Version control and audit evidence",
    ],
    contactFor: "Documentation, approvals and audit-trail questions.",
    tone: "neutral",
  },
};

export function stakeholderProfile(role?: string | null): StakeholderProfileMeta {
  if (!role) return FALLBACK;
  return STAKEHOLDER_PROFILES[role] ?? FALLBACK;
}
