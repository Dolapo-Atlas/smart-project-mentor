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
  | "lessons_learned"
  | "project_schedule"
  | "communication_plan"
  | "risk_response_plan"
  | "handover_note"
  | "closure_report"
  | "uat_plan"
  | "cutover_plan"
  | "training_plan"
  | "benefits_tracker"
  | "raci_matrix";

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

/**
 * Per-template "Why you're on this page" content — shown as a WhyThisMatters
 * panel on the generic template fill route, matching the Charter/RAID pattern.
 */
export const TEMPLATE_WHY: Record<TemplateKind, { title: string; body: string[]; tip?: string }> = {
  project_charter: {
    title: "Why you're writing a Charter",
    body: [
      "The Charter is the one-page contract with your sponsor: why this project exists, what 'done' looks like, who owns it, and what could go wrong.",
      "Without it, scope drifts and risks arrive as surprises. Keep it specific to this scenario — not generic.",
    ],
    tip: "Fill in the fields in order. Each one builds on the last.",
  },
  raid_log: {
    title: "Why you're keeping a RAID Log",
    body: [
      "RAID is how a project stays honest. Risks, Assumptions, Issues and Dependencies live in one place so nothing important is 'in someone's head'.",
      "Governance will challenge this log — every high risk needs a named owner and a mitigation.",
    ],
  },
  status_report: {
    title: "Why you're writing a Status Report",
    body: [
      "The weekly status is how the sponsor stays confident (or gets a chance to help). A truthful amber is more useful than a hopeful green.",
      "Concrete, dated achievements and named risk owners — no status theatre.",
    ],
    tip: "If RAG is amber or red, always name the decisions you need from the sponsor.",
  },
  resource_plan: {
    title: "Why you're writing a Resource Plan",
    body: [
      "Delivery lives or dies on who is available, when, and for how long. This plan turns 'the team will do it' into named people, FTEs and dates.",
      "It also surfaces gaps early — before they become slippage.",
    ],
  },
  change_request: {
    title: "Why you're raising a Change Request",
    body: [
      "Anything that moves scope, schedule or budget needs a written decision trail. A CR gives the change board enough context to say yes, no, or 'not yet'.",
      "Always offer at least two options — never a single-option ask.",
    ],
  },
  stakeholder_register: {
    title: "Why you're building a Stakeholder Register",
    body: [
      "Projects fail on people more than on plans. The register maps who can make or break delivery — with interest, influence and how you'll engage each one.",
      "Job titles aren't enough — name real people.",
    ],
  },
  meeting_agenda: {
    title: "Why you're writing a Meeting Agenda",
    body: [
      "A working agenda respects attendees' time and forces you to know what a good meeting outcome looks like before it starts.",
      "Every item gets a purpose, an owner and a time-box — decisions, not status theatre.",
    ],
  },
  lessons_learned: {
    title: "Why you're capturing Lessons Learned",
    body: [
      "Retrospectives are how the next project inherits your scars. Honest patterns, root causes, and — critically — owned actions with dates.",
      "Describe the pattern, not the person.",
    ],
  },
  project_schedule: {
    title: "Why you're building the Schedule",
    body: [
      "The schedule turns objectives into a sequence: phases, milestones, dependencies and a critical path anyone can point to.",
      "It's also your early-warning system — if the critical path slips, go-live slips.",
    ],
    tip: "Anchor at least four milestones to specific dates.",
  },
  communication_plan: {
    title: "Why you're writing a Comms Plan",
    body: [
      "People resist what they don't understand. A comms plan says who hears what, from whom, how often and through which channel — so nobody is surprised.",
      "Cover governance, sponsor and frontline separately — one message doesn't fit all.",
    ],
  },
  risk_response_plan: {
    title: "Why you're writing a Risk Response Plan",
    body: [
      "Naming a risk isn't managing it. This plan pairs each significant risk with a strategy (avoid, mitigate, transfer, accept), a trigger, an owner and a fallback.",
      "Governance can then challenge the plan — not just the list.",
    ],
  },
  handover_note: {
    title: "Why you're writing a Handover Note",
    body: [
      "The receiving team inherits the solution — including its quirks. A good handover means they can run it on day one without you.",
      "Ownership, support routes, open items and where the knowledge lives — no hidden bus-factor.",
    ],
  },
  closure_report: {
    title: "Why you're writing a Closure Report",
    body: [
      "The Closure Report is the formal record of what was delivered — for the sponsor today, and for auditors and future teams tomorrow.",
      "Objective, evidenced, honest: objectives vs. outcome, schedule vs. plan, cost vs. plan, benefits realised or tracked.",
    ],
  },
  uat_plan: {
    title: "Why you're writing a UAT Plan",
    body: [
      "User Acceptance Testing is the last chance for the people who actually use the system to say 'this works for our job'.",
      "A weak UAT ships defects into hypercare. Clear entry/exit criteria, named testers, real scenarios and a defect triage route make the difference.",
    ],
    tip: "Exit criteria must include a named sign-off owner — no 'the business signed off'.",
  },
  cutover_plan: {
    title: "Why you're writing a Cutover Plan",
    body: [
      "Go-live weekend is not the time to improvise. The cutover plan is a timed runbook — every step owned, every rollback rehearsed.",
      "If something breaks at 03:00, the answer lives in this document, not in someone's memory.",
    ],
    tip: "Write rollback triggers before you write the go steps. If you can't roll back, don't go.",
  },
  training_plan: {
    title: "Why you're writing a Training Plan",
    body: [
      "The system doesn't deliver benefits — trained people using it do. The plan turns 'we'll train them' into audiences, formats, waves, materials and competence checks.",
      "Measure competence, not attendance. A signed register isn't the same as capability.",
    ],
  },
  benefits_tracker: {
    title: "Why you're building a Benefits Tracker",
    body: [
      "The sponsor didn't fund a system — they funded the outcomes it enables. The tracker keeps those outcomes visible after go-live, when the project team has moved on.",
      "Every benefit gets a measure, a baseline, a target, an owner and a realisation date. If it doesn't, it won't happen.",
    ],
    tip: "Baselines have to exist before go-live — or you can't prove any benefit later.",
  },
  raci_matrix: {
    title: "Why you're building a RACI Matrix",
    body: [
      "RACI answers the question that quietly kills projects: 'who actually does this, and who signs it off?' One row per deliverable, one column per stakeholder, and exactly one Accountable in every row.",
      "It turns the Stakeholder Register from a list of people into a map of decision rights — so nothing important falls between two chairs.",
    ],
    tip: "Only one Accountable per row. Multiple A's mean nobody is really accountable.",
  },
};

const CORE_TEMPLATES = {
  project_charter: {
    kind: "project_charter",
    label: "Project Charter",
    intro:
      "Capture why this project exists, what it will deliver, who owns it, and how success will be judged. Keep it specific to the current scenario — the sponsor will read this.",
    fields: [
      {
        key: "title",
        label: "Project title",
        kind: "text",
        required: true,
        placeholder: "The official name of the project as the sponsor would recognise it.",
      },
      {
        key: "purpose",
        label: "Why this project (purpose & business case)",
        kind: "textarea",
        required: true,
        minChars: 80,
        placeholder: "What problem is this project solving, and what value does it create? Reference the actual business driver from the brief.",
        guidance: "Two or three sentences. The sponsor should recognise their own words back.",
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
        key: "success_criteria",
        label: "Success criteria",
        kind: "textarea",
        required: true,
        minChars: 40,
        placeholder: "How will you know the project succeeded? Quantify where possible.",
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
        key: "milestones",
        label: "High-level milestones & dates",
        kind: "textarea",
        required: true,
        minChars: 30,
        placeholder: "e.g. Discovery complete 12 Sep · Go-live 15 Dec",
      },
      {
        key: "key_stakeholders",
        label: "Key stakeholders",
        kind: "textarea",
        required: true,
        minChars: 60,
        placeholder: "Name · Role · Interest — one per line.",
      },
      {
        key: "sponsor",
        label: "Sponsor (named)",
        kind: "text",
        required: true,
        placeholder: "Full name and role",
      },
      {
        key: "initial_risks",
        label: "Initial risks",
        kind: "textarea",
        required: true,
        minChars: 60,
        placeholder: "Top 3–5 risks known today, with a first-pass owner.",
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
  project_schedule: {
    kind: "project_schedule",
    label: "Project Schedule",
    intro:
      "Lay out the project timeline in-app — no upload needed. Cover phases, milestones, dependencies and the critical path. Be specific to this scenario.",
    fields: [
      { key: "period", label: "Schedule period", kind: "text", required: true, placeholder: "e.g. 3 Sep 2025 – 15 Dec 2025" },
      { key: "phases", label: "Phases & durations", kind: "textarea", required: true, minChars: 80, placeholder: "Discovery (3 wks) · Design (4 wks) · Build (6 wks) · UAT (2 wks) · Go-Live (1 wk)" },
      { key: "milestones", label: "Key milestones & dates", kind: "textarea", required: true, minChars: 80, placeholder: "Charter approved — 12 Sep\nDesign sign-off — 10 Oct\nUAT complete — 28 Nov\nGo-Live — 15 Dec", guidance: "At least 4 dated milestones." },
      { key: "dependencies", label: "Dependencies & sequencing", kind: "textarea", required: true, minChars: 60, placeholder: "What must finish before what? Which items block the critical path?" },
      { key: "critical_path", label: "Critical path", kind: "textarea", required: true, minChars: 40, placeholder: "Name the tasks that if slipped, slip go-live." },
      { key: "assumptions", label: "Scheduling assumptions", kind: "textarea", minChars: 30, placeholder: "Vendor availability, team FTEs, environments ready, etc." },
      { key: "buffer", label: "Buffer / contingency", kind: "textarea", minChars: 20, placeholder: "How much float have you built in and where?" },
      { key: "owner", label: "Schedule owner (named)", kind: "text", required: true, placeholder: "Full name and role" },
    ],
  },
  communication_plan: {
    kind: "communication_plan",
    label: "Communication Plan",
    intro:
      "Who hears what, from whom, how often, through which channel. A good plan pre-empts surprise — governance, sponsor and frontline all covered.",
    fields: [
      { key: "objectives", label: "Communication objectives", kind: "textarea", required: true, minChars: 60, placeholder: "What behaviours or awareness are you driving?" },
      { key: "audiences", label: "Audiences", kind: "textarea", required: true, minChars: 80, placeholder: "Sponsor · SteerCo · Frontline · Vendor · IT — one per line with what they need." },
      { key: "messages", label: "Key messages", kind: "textarea", required: true, minChars: 60, placeholder: "The 3–5 core messages you'll repeat across channels." },
      { key: "channels_cadence", label: "Channels & cadence", kind: "textarea", required: true, minChars: 80, placeholder: "Weekly digest (email) · Monthly SteerCo (in-person) · Slack #project — with dates." },
      { key: "owners", label: "Responsibilities (named)", kind: "textarea", required: true, minChars: 60, placeholder: "Who drafts, who approves, who sends — by name." },
      { key: "feedback", label: "Feedback loops", kind: "textarea", minChars: 30, placeholder: "How do you know the message landed? Surveys, retros, drop-ins…" },
      { key: "escalation", label: "Escalation path", kind: "textarea", minChars: 30, placeholder: "When comms fails or resistance appears, who steps in?" },
    ],
  },
  risk_response_plan: {
    kind: "risk_response_plan",
    label: "Risk Response Plan",
    intro:
      "For each significant risk, name the response strategy (avoid, mitigate, transfer, accept), the trigger, the owner and the fallback. This complements the RAID Log.",
    fields: [
      { key: "scope", label: "Scope of this plan", kind: "textarea", required: true, minChars: 40, placeholder: "Which risks does this plan cover — all high/critical, or a subset?" },
      { key: "top_risks", label: "Top risks & responses", kind: "textarea", required: true, minChars: 160, placeholder: "Risk 1 — Description\n  Strategy: Mitigate\n  Owner: Sarah Williams\n  Actions: …\n  Trigger: …\n  Fallback: …\n\nRisk 2 — …", guidance: "Cover at least 3 risks with strategy, owner, actions and trigger." },
      { key: "monitoring", label: "Monitoring cadence", kind: "textarea", required: true, minChars: 40, placeholder: "How often are risks reviewed and by whom." },
      { key: "escalation", label: "Escalation thresholds", kind: "textarea", required: true, minChars: 40, placeholder: "What conditions escalate a risk to the sponsor or steering committee?" },
      { key: "residual", label: "Residual risk statement", kind: "textarea", minChars: 30, placeholder: "After mitigations, what risk remains that leadership must accept?" },
      { key: "owner", label: "Plan owner (named)", kind: "text", required: true, placeholder: "Full name and role" },
    ],
  },
  handover_note: {
    kind: "handover_note",
    label: "Handover Note",
    intro:
      "Transition the solution to the receiving team. Cover ownership, support routes, open items and knowledge sources — no hidden bus-factor.",
    fields: [
      { key: "receiving_team", label: "Receiving team", kind: "textarea", required: true, minChars: 40, placeholder: "Team name, lead, and how they will operate the solution day-to-day." },
      { key: "scope_transferred", label: "What is being handed over", kind: "textarea", required: true, minChars: 60, placeholder: "System, processes, documentation, licences, contracts…" },
      { key: "support_model", label: "Support model", kind: "textarea", required: true, minChars: 60, placeholder: "L1/L2/L3 routes, SLAs, on-call, escalation contacts." },
      { key: "open_items", label: "Open items & known issues", kind: "textarea", required: true, minChars: 40, placeholder: "Anything the receiving team must inherit with eyes open." },
      { key: "knowledge", label: "Knowledge sources", kind: "textarea", required: true, minChars: 40, placeholder: "Runbooks, wiki links, recordings, key contacts." },
      { key: "signoff", label: "Sign-off (named)", kind: "text", required: true, placeholder: "Who from the receiving team accepts handover?" },
    ],
  },
  closure_report: {
    kind: "closure_report",
    label: "Closure Report",
    intro:
      "The formal end-of-project record for the sponsor. Objective, evidenced, honest — this is what future teams and audits will read.",
    fields: [
      { key: "summary", label: "Executive summary", kind: "textarea", required: true, minChars: 80, placeholder: "One paragraph: what was delivered, over what period, against which objectives." },
      { key: "objectives_status", label: "Objectives vs. outcome", kind: "textarea", required: true, minChars: 80, placeholder: "For each original objective — met / partially met / not met, with evidence." },
      { key: "scope_delivered", label: "Scope delivered", kind: "textarea", required: true, minChars: 60, placeholder: "What was built, plus any scope changes accepted along the way." },
      { key: "schedule_cost", label: "Schedule & cost performance", kind: "textarea", required: true, minChars: 60, placeholder: "Planned vs. actual dates and £ — quantify variance." },
      { key: "benefits", label: "Benefits realised (or plan)", kind: "textarea", required: true, minChars: 60, placeholder: "Which benefits are already realised, which are tracked post-project and by whom." },
      { key: "open_risks", label: "Residual risks & open items", kind: "textarea", required: true, minChars: 40 },
      { key: "recommendations", label: "Recommendations", kind: "textarea", required: true, minChars: 40 },
      { key: "sponsor_signoff", label: "Sponsor sign-off (named)", kind: "text", required: true, placeholder: "Full name and role" },
    ],
  },
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
  uat_plan: {
    kind: "uat_plan",
    label: "UAT Test Plan",
    intro:
      "Plan how the solution will be tested with real users before go-live. Cover scope, entry/exit criteria, roles, scripts and how defects are triaged.",
    fields: [
      { key: "scope", label: "In-scope functionality", kind: "textarea", required: true, minChars: 80, placeholder: "Which flows/modules will be tested by users, and which are excluded?" },
      { key: "objectives", label: "Test objectives", kind: "textarea", required: true, minChars: 60, placeholder: "What must be true for UAT to be judged a pass?" },
      { key: "entry_criteria", label: "Entry criteria", kind: "textarea", required: true, minChars: 40, placeholder: "e.g. system-test complete, data loaded, users trained." },
      { key: "exit_criteria", label: "Exit criteria", kind: "textarea", required: true, minChars: 40, placeholder: "Pass rate, no open Sev-1/2 defects, sign-off owner." },
      { key: "participants", label: "Testers & roles (named)", kind: "textarea", required: true, minChars: 60, placeholder: "Frontline nurse, admin, ward manager — named where possible." },
      { key: "scenarios", label: "Key scenarios / scripts", kind: "textarea", required: true, minChars: 120, placeholder: "1. Admit patient · 2. Record vitals · 3. Handover shift — with expected results.", guidance: "At least 5 numbered scenarios." },
      { key: "defect_triage", label: "Defect logging & triage", kind: "textarea", required: true, minChars: 40, placeholder: "Where are defects logged, who triages, SLA per severity." },
      { key: "schedule", label: "UAT dates", kind: "textarea", required: true, minChars: 30, placeholder: "Start / end dates and daily rhythm." },
      { key: "signoff", label: "Sign-off owner (named)", kind: "text", required: true, placeholder: "Who accepts UAT as complete?" },
    ],
  },
  cutover_plan: {
    kind: "cutover_plan",
    label: "Cutover & Go-Live Plan",
    intro:
      "Runbook for the go-live weekend. Every task timed, named and reversible — if something breaks, the rollback is not invented on the day.",
    fields: [
      { key: "window", label: "Cutover window", kind: "text", required: true, placeholder: "e.g. Fri 12 Dec 18:00 – Mon 15 Dec 06:00" },
      { key: "runbook", label: "Runbook (timed steps)", kind: "textarea", required: true, minChars: 160, placeholder: "T-24h · Freeze changes — James\nT-4h · Data migration — Priya\nT-0 · Cutover switch — Sarah\nT+2h · Smoke test — QA lead", guidance: "At least 6 timed steps with owners." },
      { key: "roles", label: "War-room roles (named)", kind: "textarea", required: true, minChars: 60, placeholder: "Incident lead, comms lead, tech lead, business lead, vendor rep — by name." },
      { key: "comms", label: "Comms plan on the day", kind: "textarea", required: true, minChars: 60, placeholder: "Who tells whom, on which channel, at which checkpoints." },
      { key: "rollback", label: "Rollback triggers & steps", kind: "textarea", required: true, minChars: 80, placeholder: "Conditions that trigger rollback and the exact steps to revert." },
      { key: "hypercare", label: "Hypercare model", kind: "textarea", required: true, minChars: 40, placeholder: "Support cover for first 2 weeks — hours, contacts, escalation." },
      { key: "gono_criteria", label: "Go / no-go criteria", kind: "textarea", required: true, minChars: 40, placeholder: "The checks the sponsor calls at the go/no-go meeting." },
      { key: "owner", label: "Cutover lead (named)", kind: "text", required: true, placeholder: "Full name and role" },
    ],
  },
  training_plan: {
    kind: "training_plan",
    label: "Training & Rollout Plan",
    intro:
      "How the workforce becomes confident with the new solution. Cover audiences, formats, materials, dates and how you'll measure competence — not just attendance.",
    fields: [
      { key: "audiences", label: "Audiences & numbers", kind: "textarea", required: true, minChars: 60, placeholder: "e.g. 40 nurses · 12 admins · 6 managers — with sites/wards." },
      { key: "objectives", label: "Learning objectives", kind: "textarea", required: true, minChars: 60, placeholder: "By the end, staff can do X, Y, Z unaided." },
      { key: "formats", label: "Formats & materials", kind: "textarea", required: true, minChars: 60, placeholder: "Classroom · floor-walking · quick-reference guides · e-learning." },
      { key: "schedule", label: "Schedule & waves", kind: "textarea", required: true, minChars: 60, placeholder: "Cohort dates, coverage plan, backfill/cover arrangements." },
      { key: "trainers", label: "Trainers & super-users (named)", kind: "textarea", required: true, minChars: 40, placeholder: "Who delivers, who champions on the floor — by name." },
      { key: "assessment", label: "Competence check", kind: "textarea", required: true, minChars: 40, placeholder: "How you confirm each learner is ready — observation, quick task, sign-off." },
      { key: "support", label: "Post-training support", kind: "textarea", required: true, minChars: 30, placeholder: "Hypercare, floor-walkers, quick help channel." },
      { key: "risks", label: "Training risks", kind: "textarea", minChars: 30, placeholder: "Coverage gaps, shift patterns, digital confidence — and how you mitigate." },
    ],
  },
  benefits_tracker: {
    kind: "benefits_tracker",
    label: "Benefits Tracker",
    intro:
      "Track the benefits this project must realise, who owns each one, how it is measured and when it lands. This is what the sponsor cares about after go-live.",
    fields: [
      { key: "benefits", label: "Benefits list", kind: "textarea", required: true, minChars: 160, placeholder: "Benefit 1 — Description\n  Measure: …\n  Baseline: …\n  Target: …\n  Owner: …\n  Realisation date: …\n\nBenefit 2 — …", guidance: "At least 3 benefits with measure, baseline, target, owner and date." },
      { key: "baseline", label: "Current baseline evidence", kind: "textarea", required: true, minChars: 40, placeholder: "How is today's performance measured — source, date, method." },
      { key: "measurement", label: "Measurement approach", kind: "textarea", required: true, minChars: 40, placeholder: "Reports, dashboards, sample audits — cadence and owner." },
      { key: "governance", label: "Benefits governance", kind: "textarea", required: true, minChars: 40, placeholder: "Who reviews progress, how often, what triggers escalation." },
      { key: "risks", label: "Risks to realisation", kind: "textarea", minChars: 30, placeholder: "Adoption, data quality, external dependencies." },
      { key: "owner", label: "Overall benefits owner (named)", kind: "text", required: true, placeholder: "Usually the sponsor or a nominated senior lead." },
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

export const TEMPLATES: Record<TemplateKind, TemplateDef> = {
  ...(CORE_TEMPLATES as Record<"project_charter" | "status_report" | "raid_log", TemplateDef>),
  ...EXTRA_TEMPLATES,
};

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
  if (/project schedule|schedule\b|gantt|timeline/.test(s)) return "project_schedule";
  if (/communication plan|comms plan|communications plan/.test(s)) return "communication_plan";
  if (/risk response|risk mitigation plan|risk plan/.test(s)) return "risk_response_plan";
  if (/handover|hand[- ]?over|transition (note|plan)/.test(s)) return "handover_note";
  if (/closure report|close.?out report|final report|project closure/.test(s)) return "closure_report";
  if (/\buat\b|user acceptance|test plan|test script/.test(s)) return "uat_plan";
  if (/cutover|go.?live plan|runbook|deployment plan/.test(s)) return "cutover_plan";
  if (/training plan|rollout plan|training & rollout|super.?user/.test(s)) return "training_plan";
  if (/benefits (tracker|realisation|realization|register)|benefit tracking/.test(s)) return "benefits_tracker";
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
  // (see below)
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

/**
 * Generic evaluator for field-based templates without bespoke rules.
 * Awards weighted credit for required + min-char fields, plus small
 * bonuses for project references, named people and dated milestones.
 */
export function evaluateGenericTemplate(
  kind: TemplateKind,
  values: Record<string, string>,
  ctx: ProjectContext = {},
): Readiness {
  const spec = TEMPLATES[kind].fields;
  const checks: ReadinessCheck[] = [];
  const totalWeight = spec.reduce((s, f) => s + (f.required ? 2 : 1), 0) || 1;
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
        hint: ok
          ? undefined
          : raw.length === 0
          ? "Add content for this section."
          : `Add more detail — at least ${min} characters of specifics.`,
      });
    }
  }
  let score = Math.round((earned / totalWeight) * 75);

  const blob = Object.values(values).join(" ");
  const projectMentioned = ctx.projectName ? blob.toLowerCase().includes(ctx.projectName.toLowerCase()) : true;
  checks.push({
    label: "References the current project scenario",
    ok: projectMentioned,
    hint: projectMentioned ? undefined : `Mention "${ctx.projectName}" or a specific detail from the brief.`,
  });
  if (projectMentioned) score += 10;

  const hasDate = DATE_RX.test(blob);
  checks.push({
    label: "Includes at least one concrete date",
    ok: hasDate,
    hint: hasDate ? undefined : "Anchor commitments to specific dates.",
  });
  if (hasDate) score += 8;

  const hasNamedPerson = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(blob);
  checks.push({
    label: "Names at least one person (first + last)",
    ok: hasNamedPerson,
    hint: hasNamedPerson ? undefined : "Assign owners by name, not by team.",
  });
  if (hasNamedPerson) score += 7;

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