/**
 * Per-template scenario content.
 *
 * The simulation engine (phases, gates, documents, RAID, scoring) is generic.
 * Everything that makes a simulation *feel* like a different workplace —
 * the story, the first email, the Initiation Pack, the budget baseline and
 * the language stakeholders use — lives here, keyed by `project_templates.slug`.
 *
 * Digital Care Records keeps its original hand-written Initiation Pack JSX, so
 * a missing entry here simply means "use the legacy content".
 */

export type ScenarioTask = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  linked_area: string;
  linked_module_route: string;
  completion_action: string;
};

export type ScenarioBudgetLine = {
  category: string;
  description: string;
  amount: number;
};

export type ScenarioPack = {
  slug: string;
  /** Employer the learner works for inside this scenario. */
  organisation: string;
  /** Delivery approach label shown in the pack, e.g. "Waterfall / stage-gated". */
  methodLabel: string;
  methodBlurb: string[];

  overview: {
    why: string[];
    challengesLabel: string;
    challenges: string[];
    position: string[];
  };
  objectives: {
    objective: string[];
    aimsLabel: string;
    aims: string[];
    successIntro: string[];
    expectations: string[];
    caution?: string;
  };
  scope: {
    includes: string[];
    excludes: string[];
    changeNote: string;
  };
  timeline: {
    windowLabel: string;
    windowValue: string;
    budgetValue: string;
    budgetNote: string;
    milestones: { label: string; when: string; detail: string }[];
    constraints: string[];
  };
  risks: { risks: string[]; assumptions: string[] };
  issues: string[];
  roleNote: string[];

  welcome: {
    subject: string;
    tone: string;
    /** Body builder — receives learner first name and their chosen role title. */
    body: (args: { firstName: string; roleTitle: string; pmName: string; pmRole: string }) => string;
  };
  firstTasks: ScenarioTask[];
  budget: ScenarioBudgetLine[];

  /** Domain language injected into every AI prompt for this scenario. */
  jargon: string;
  /** How stakeholders should sound — keeps each simulation distinct. */
  toneGuide: string;
};

const OFFICE_RELOCATION: ScenarioPack = {
  slug: "office-relocation",
  organisation: "Ridgeway Group",
  methodLabel: "Waterfall — stage-gated delivery",
  methodBlurb: [
    "This programme is run as a classic waterfall: each phase is completed, reviewed and formally signed off before the next one begins.",
    "The move date is fixed by the lease, so the plan is baselined early and protected through change control. You cannot 'iterate later' — a decision missed in Planning becomes an issue on move weekend.",
    "Expect formal artefacts, sequential dependencies, physical logistics and sign-off discipline rather than sprints and backlogs.",
  ],

  overview: {
    why: [
      "Ridgeway Group's lease on Meridian House expires at the end of the delivery window and will not be renewed. The landlord has confirmed the building is being redeveloped.",
      "The business has committed to relocating 480 staff, two data comms rooms and a client-facing ground floor into Kingsgate Quarter, a fitted-out floorplate across three levels.",
      "The relocation must happen once, on a fixed weekend, with the business trading normally on the Monday.",
    ],
    challengesLabel: "What makes this hard",
    challenges: [
      "The end date is immovable — dilapidations and double rent begin the day after lease expiry.",
      "Staff are spread across four departments with very different working patterns and desk needs.",
      "Network, telephony and print services have to be live in the new building before anyone arrives.",
      "Fit-out, furniture, cabling and removals are delivered by different suppliers with hard dependencies on each other.",
      "Departments expect to be consulted on seating, and several have already made informal promises to their teams.",
      "Access to the new building is controlled by the landlord and building management, not by Ridgeway.",
    ],
    position: [
      "The programme is in Initiation. The lease position and budget envelope are agreed; almost nothing else is.",
      "There is no baselined plan, no signed floorplan, no confirmed removals window and no agreed communications approach.",
      "Your job in this phase is to establish the foundations — scope, governance, stakeholders, risks and dependencies — so Planning can produce a plan the business can actually be held to.",
    ],
  },

  objectives: {
    objective: [
      "Relocate Ridgeway Group's head office operation from Meridian House to Kingsgate Quarter within the approved window and budget, with the business fully operational on the first working day after the move.",
    ],
    aimsLabel: "The programme aims to",
    aims: [
      "Vacate Meridian House before lease expiry with dilapidations obligations met.",
      "Deliver a signed, department-agreed floorplan and seating allocation.",
      "Have network, telephony, print and building access tested and live before staff arrive.",
      "Move staff, furniture and equipment across a single planned weekend.",
      "Keep client-facing services running with no visible interruption.",
      "Leave a clean handover: asset register, snag list and lessons learned.",
    ],
    successIntro: [
      "Success is judged on a working Monday, not on activity. The programme is successful if staff arrive, sit down and work.",
    ],
    expectations: [
      "Meridian House vacated and keys returned on schedule.",
      "Zero unplanned downtime for client-facing services.",
      "All staff allocated a desk, with equipment in place and tested.",
      "Approved budget of £1,650,000 not exceeded.",
      "Every stage gate formally signed off before the next stage starts.",
      "Snags closed or owned at closure — nothing left undocumented.",
    ],
    caution:
      "Several details — final seating numbers, storage volumes and the exact removals window — are not yet confirmed. Do not assume them; record them as assumptions and chase confirmation.",
  },

  scope: {
    includes: [
      "Relocation of 480 staff across three floors at Kingsgate Quarter.",
      "Floorplan design, seating allocation and departmental adjacency decisions.",
      "IT infrastructure move: comms rooms, network, Wi-Fi, telephony, print and AV.",
      "Furniture procurement, delivery and installation.",
      "Physical removals, crate logistics, secure document transfer and archiving.",
      "Building access, passes, parking and security arrangements.",
      "Staff communications, move packs, induction and floor walks.",
      "Decommissioning and dilapidations at Meridian House.",
      "Programme governance, stage gates and reporting.",
    ],
    excludes: [
      "Any change to the Kingsgate base building or landlord-owned services.",
      "New IT systems, upgrades or device refresh not required to move.",
      "Departmental restructures, headcount changes or new ways of working.",
      "Additional fit-out, branding or furniture requested after floorplan sign-off.",
      "Satellite or regional offices — this is the head office move only.",
    ],
    changeNote:
      "Because the plan is baselined, anything that affects the floorplan, removals window, cost or the move date must go through formal change control with the sponsor. Verbal agreements in corridors are not changes.",
  },

  timeline: {
    windowLabel: "Planned delivery window",
    windowValue: "12 weeks",
    budgetValue: "£1,650,000",
    budgetNote:
      "Funded from the Property & Workplace capital budget. Finance Lead Priya Anand requires committed spend to be reported against the baseline every week.",
    milestones: [
      { label: "Initiation gate", when: "Week 2", detail: "Charter, stakeholder register and initial RAID approved by the sponsor." },
      { label: "Floorplan sign-off", when: "Week 4", detail: "Seating and adjacency agreed by every department head. Hard dependency for furniture and cabling orders." },
      { label: "Plan baselined", when: "Week 5", detail: "Schedule, WBS, resource plan and communications plan approved at the Planning gate." },
      { label: "Fit-out and cabling complete", when: "Week 8", detail: "Landlord access windows used; comms rooms ready for IT build." },
      { label: "IT readiness test", when: "Week 10", detail: "Network, telephony, print and access control proven in the new building." },
      { label: "Move weekend", when: "Week 11", detail: "Removals, crate delivery, desk setup and floor checks. Single attempt." },
      { label: "First working day", when: "Week 11 + 1", detail: "Floor walkers, hypercare desk, snag capture." },
      { label: "Closure and handover", when: "Week 12", detail: "Meridian House vacated, dilapidations settled, lessons learned signed off." },
    ],
    constraints: [
      "Lease expiry is fixed — the move date cannot slip.",
      "Landlord access to Kingsgate is limited to agreed windows.",
      "Removals contractors are booked months ahead; rebooking is not guaranteed.",
      "Trading must continue as normal throughout.",
    ],
  },

  risks: {
    risks: [
      "Floorplan sign-off slips, delaying furniture and cabling orders with long lead times.",
      "Comms room build overruns, leaving no contingency before the IT readiness test.",
      "Departments dispute seating late, forcing rework after orders are placed.",
      "Removals window is reduced by building management, compressing move weekend.",
      "Dilapidations assessment at Meridian House exceeds the allowance.",
      "Staff arrive on Monday to missing equipment, damaging confidence in the programme.",
    ],
    assumptions: [
      "Kingsgate Quarter is handed over fitted out and on schedule by the landlord.",
      "Existing desktop and telephony equipment is reused rather than replaced.",
      "Departments will nominate a single decision-maker for seating.",
      "The move weekend has no clashing client or building events.",
      "Archiving volumes are broadly as surveyed in the pre-project estimate.",
    ],
  },

  issues: [
    "No baselined plan exists yet, but suppliers are already asking for confirmed dates.",
    "Two departments have told their teams they will keep window seating — neither has been agreed.",
    "The IT comms room survey is outstanding, so the cabling order cannot be placed.",
    "Facilities and HR are working from different staff numbers (462 vs 480).",
    "Nobody has been named as the single point of contact for building management.",
  ],

  roleNote: [
    "You coordinate the relocation programme: you hold the plan together, chase decisions, keep the RAID log honest and make sure every gate is properly evidenced before it is signed.",
    "You are not the Facilities Manager and not the IT Lead — you do not move furniture or configure networks. You make sure the people who do have decisions, dates and information in time.",
    "In a waterfall programme your discipline is the control: an unrecorded dependency or an unsigned floorplan is your problem before it is anyone else's.",
  ],

  welcome: {
    subject: "Meridian House move — you're starting on the programme today",
    tone: "direct",
    body: ({ firstName, roleTitle, pmName, pmRole }) => `Hi ${firstName},

Welcome to Ridgeway Group. You're joining the Meridian House relocation programme as our ${roleTitle}, reporting to me.

Some context before anything else. Our lease on Meridian House expires and is not being renewed. 480 people, two comms rooms and our client floor have to be operating out of Kingsgate Quarter by then. The date is not negotiable — it's a lease, not a plan.

We run this the traditional way: stage by stage, each one signed off before the next starts. That's deliberate. You cannot re-run a move weekend, so the thinking has to be done up front and written down.

Right now we're in Initiation and we are light on paperwork. Before the sponsor, Daniel Reeve, will sign anything off, I need three things on file:

  1. A Project Charter — objectives, scope, constraints, governance and who signs what.
  2. A Stakeholder Register — every department head, the landlord, building management and our suppliers, with how we'll engage them.
  3. An initial RAID Log — specific to this move. "Project may be delayed" will be sent back.

Two things I'd flag from day one: Clara Voss in Facilities and Tom Becker in IT are working to different staff numbers, and two departments have already promised their teams window seats that nobody has agreed. Both will become issues if you leave them alone.

─────────────────────────────
BEFORE YOU RESPOND

Open the Project Initiation Pack. It has the lease position, budget, milestones, scope, known risks and the current issues list. Read it before you reply to me — I'd rather answer good questions than correct wrong assumptions.
─────────────────────────────

Welcome aboard. It's a good programme to learn on: unforgiving deadline, visible outcome.

${pmName}
${pmRole}
Ridgeway Group`,
  },

  firstTasks: [
    {
      title: "Draft the Project Charter",
      description:
        "No charter exists yet. Capture the objective, the fixed lease constraint, scope boundaries, the stage-gate governance and who signs off each gate. Submit it to Daniel Reeve for approval.",
      priority: "high",
      category: "Documentation",
      linked_area: "charter",
      linked_module_route: "/app/charter",
      completion_action: "Open Charter, complete each section, then submit for sponsor approval.",
    },
    {
      title: "Build the Stakeholder Register",
      description:
        "Department heads, HR, IT, Facilities, Finance, the landlord, building management and Hartwell Movers. Record interest, influence and how each will be engaged — seating decisions will live or die on this.",
      priority: "high",
      category: "Stakeholder",
      linked_area: "stakeholders",
      linked_module_route: "/app/stakeholders",
      completion_action: "Open Stakeholders, review each profile, then complete the register.",
    },
    {
      title: "Start the RAID Log for the move",
      description:
        "Be specific to this relocation: lead times, landlord access windows, the 462 vs 480 staff-number conflict, seating promises, dilapidations exposure. Every high risk needs an owner and a mitigation.",
      priority: "high",
      category: "Risk",
      linked_area: "raid",
      linked_module_route: "/app/raid",
      completion_action: "Open RAID and log risks, assumptions, issues and dependencies with named owners.",
    },
    {
      title: "Report the position to Emma Collins",
      description:
        "Write your first weekly status report. Be honest about what isn't agreed yet — an early amber is more useful to me than a hopeful green.",
      priority: "medium",
      category: "Reporting",
      linked_area: "reports",
      linked_module_route: "/app/reports",
      completion_action: "Open Reports → New status report and submit it.",
    },
  ],

  budget: [
    { category: "Fit-out & Cabling", description: "Kingsgate Quarter fit-out works, structured cabling and comms rooms", amount: 520000 },
    { category: "Furniture", description: "Desks, storage, meeting and collaboration furniture for 480 staff", amount: 385000 },
    { category: "Removals & Logistics", description: "Hartwell Movers — crates, removals, secure transfer and archiving", amount: 240000 },
    { category: "IT & Telephony", description: "Network build, telephony, print, AV and access control", amount: 215000 },
    { category: "Dilapidations", description: "Meridian House make-good, decommissioning and clearance", amount: 135000 },
    { category: "Internal Resources", description: "Programme coordination, Facilities, IT and HR time", amount: 90000 },
    { category: "Contingency", description: "Programme contingency held by the sponsor", amount: 65000 },
  ],

  jargon:
    "Use relocation / facilities / workplace-programme language: lease expiry, dilapidations, make-good, landlord and building management, fit-out, Cat A / Cat B, structured cabling, comms room, floorplate, floorplan, seating allocation, adjacency, desk count, crate logistics, removals window, move weekend, decant, snagging, punch list, hypercare, floor walkers, asset register, access passes, health & safety method statements, RAMS, long-lead items, baselined plan, stage gate, change control. Vendor = Hartwell Movers. Never use software-delivery language such as sprints, backlogs, releases, deployments, UAT environments, data migration or go-live cutover of systems — this is a physical move governed by waterfall stage gates.",

  toneGuide:
    "Tone for this programme: dry, practical, operational British workplace. People are busy, deadline-driven and slightly blunt. They talk in dates, lead times, floors, desks and suppliers — not in vision statements. Nobody is cruel, but nobody is soft either: a missed decision gets named. Formality rises with governance — the COO writes in short, decision-first paragraphs; Facilities and IT write in practical detail; HR writes carefully about people impact. Avoid healthcare or clinical warmth and avoid commercial sales energy.",
};

const CRM_IMPLEMENTATION: ScenarioPack = {
  slug: "crm-implementation",
  organisation: "Northwind Commercial",
  methodLabel: "Hybrid — stage gates with iterative configuration",
  methodBlurb: [
    "Governance runs through six stage gates, but Helio CRM configures the platform in short build cycles that Sales Operations reviews as they go.",
    "That means scope has to be pinned down early — pipeline stages, data fields, integrations — while the detail of screens and workflows is refined with users.",
    "Expect a commercial, numbers-led environment: adoption, data quality and pipeline visibility matter more than the software itself.",
  ],
  overview: {
    why: [
      "Northwind Commercial's 140-strong sales and account management team works across spreadsheets, a ten-year-old contact database and personal inboxes.",
      "Leadership cannot see a reliable pipeline, forecasts are assembled by hand every month, and customer history leaves the business whenever a rep does.",
      "The board has approved the implementation of Helio CRM as the single system for leads, opportunities, accounts and customer service cases.",
    ],
    challengesLabel: "What makes this hard",
    challenges: [
      "Customer data sits in at least four places, with duplicates and no agreed owner.",
      "Senior reps are sceptical — they have seen a CRM rollout fail here before.",
      "Pipeline stages and forecast rules differ between the three sales regions.",
      "The finance system and marketing platform must integrate with Helio on day one.",
      "Sales targets do not pause for the project: training time is fought over.",
    ],
    position: [
      "The programme is in Initiation. The budget and vendor are agreed; the charter, stakeholder map and risk log are not.",
      "Helio CRM is ready to start discovery workshops but needs a confirmed scope and named decision-makers first.",
      "Your job in this phase is to set the foundations so Planning can produce a realistic build, data migration and adoption plan.",
    ],
  },
  objectives: {
    objective: [
      "Implement Helio CRM as Northwind Commercial's single customer system within 12 weeks and the approved £850,000 budget, with the sales team actively using it after go-live.",
    ],
    aimsLabel: "The programme aims to",
    aims: [
      "Migrate clean, de-duplicated customer and pipeline data into Helio CRM.",
      "Standardise pipeline stages and forecasting across all three regions.",
      "Integrate Helio with the finance system and the marketing platform.",
      "Train every rep and manager before go-live.",
      "Give leadership a live, trusted pipeline dashboard.",
    ],
    successIntro: ["Success is measured by adoption and data quality, not by the system simply being switched on."],
    expectations: [
      "At least 90% of reps logging activity in Helio within four weeks of go-live.",
      "Duplicate customer records reduced to under 2% after migration.",
      "Monthly forecast produced from Helio, not spreadsheets.",
      "Approved budget of £850,000 not exceeded.",
      "Every stage gate formally signed off before the next stage starts.",
    ],
    caution:
      "Record volumes, integration effort and regional pipeline rules are not yet confirmed. Log them as assumptions and chase confirmation rather than guessing.",
  },
  scope: {
    includes: [
      "Helio CRM configuration for leads, opportunities, accounts, contacts and service cases.",
      "Migration of customer, contact and open pipeline data from existing sources.",
      "Integration with the finance system and the marketing automation platform.",
      "Standard pipeline stages, forecast categories and management dashboards.",
      "Training, user guides and floor-walking support for 140 users.",
      "Go-live, hypercare and handover to the CRM Administrator.",
    ],
    excludes: [
      "Changes to sales commission or compensation plans.",
      "A new website, e-commerce or customer portal.",
      "Migrating closed-lost opportunities older than three years.",
      "Custom mobile apps beyond Helio's standard app.",
      "Replacing the finance system itself.",
    ],
    changeNote:
      "New fields, integrations or reports requested after scope sign-off go through change control with Marcus Hale. A 'quick extra' from a sales manager is still a change.",
  },
  timeline: {
    windowLabel: "Planned delivery window",
    windowValue: "12 weeks",
    budgetValue: "£850,000",
    budgetNote: "Funded from the Commercial transformation budget. Finance Lead Priya Anand tracks committed spend against the baseline weekly.",
    milestones: [
      { label: "Initiation gate", when: "Week 2", detail: "Charter, stakeholder register and initial RAID approved by Marcus Hale." },
      { label: "Discovery complete", when: "Week 4", detail: "Pipeline stages, data model and integrations agreed with Helio CRM." },
      { label: "Plan baselined", when: "Week 5", detail: "Build, data migration, training and cutover plan approved." },
      { label: "Build and integrations", when: "Weeks 5–8", detail: "Iterative configuration reviewed with Sales Operations." },
      { label: "User acceptance testing", when: "Week 9", detail: "Reps and managers test real scenarios; defects triaged." },
      { label: "Pilot go-live", when: "Week 10", detail: "One region goes live first to prove adoption and data." },
      { label: "Full go-live", when: "Week 11", detail: "All regions switched over; spreadsheets retired." },
      { label: "Closure and handover", when: "Week 12", detail: "Handover to the CRM Administrator and lessons learned signed off." },
    ],
    constraints: [
      "Go-live must avoid the quarter-end sales close.",
      "Reps can be released for training for no more than half a day each.",
      "Helio CRM's consultants are booked for a fixed number of days.",
      "Customer data must meet UK GDPR requirements throughout migration.",
    ],
  },
  risks: {
    risks: [
      "Poor data quality delays migration and undermines trust in the new system.",
      "Low adoption by senior reps who keep working in spreadsheets.",
      "Finance integration is more complex than estimated.",
      "Regions cannot agree common pipeline stages, stalling configuration.",
      "Training clashes with quarter-end, reducing attendance.",
    ],
    assumptions: [
      "Helio's standard data model covers most requirements without custom build.",
      "Each region will nominate one decision-maker for pipeline rules.",
      "The finance system supplier will provide integration access in time.",
      "Existing customer data can be exported in a usable format.",
    ],
  },
  issues: [
    "Three different customer lists exist and nobody agrees which is the master.",
    "Hannah Briggs (Sales Ops) and Ravi Shah (Architect) disagree on how many custom fields are needed.",
    "The North region manager has told his team the CRM is 'optional for now'.",
    "Helio has asked for confirmed discovery workshop attendees by the end of week one.",
  ],
  roleNote: [
    "You coordinate the CRM programme: you keep the plan, RAID log, decisions and reporting accurate, and make sure every gate is properly evidenced.",
    "You are not the Solutions Architect or the CRM Administrator — you don't configure Helio. You make sure the people who do have decisions, data and dates on time.",
    "In a commercial programme your credibility comes from clear numbers and chasing decisions early.",
  ],
  welcome: {
    subject: "Welcome to the Helio CRM programme — first priorities",
    tone: "brisk",
    body: ({ firstName, roleTitle, pmName, pmRole }) => `Hi ${firstName},

Welcome to Northwind Commercial. You're joining the Helio CRM programme as our ${roleTitle}, working with me.

Quick context: our sales team runs on spreadsheets and an old contact database. Marcus Hale, our Chief Revenue Officer and sponsor, wants a single, trusted pipeline in Helio CRM within 12 weeks and inside £850,000.

We're in Initiation. Before Marcus signs off the first gate I need:

  1. A Project Charter — objectives, scope, constraints and governance.
  2. A Stakeholder Register — sales leadership, Sales Ops, Finance, IT and Helio.
  3. An initial RAID Log — specific to this rollout, especially data quality and adoption.

Heads-up: we have three competing customer lists, and one regional manager has told his team the CRM is optional. Both need handling early.

─────────────────────────────
BEFORE YOU RESPOND

Open the Project Initiation Pack. It covers the background, scope, budget, milestones, stakeholders and current issues. Read it before you reply.
─────────────────────────────

Glad to have you on board.

${pmName}
${pmRole}
Northwind Commercial`,
  },
  firstTasks: [
    { title: "Draft the Project Charter", description: "Capture the objective, scope boundaries, the £850,000 budget, 12-week timeline and stage-gate governance. Submit it to Marcus Hale for approval.", priority: "high", category: "Documentation", linked_area: "charter", linked_module_route: "/app/charter", completion_action: "Open Charter, complete each section, then submit for sponsor approval." },
    { title: "Build the Stakeholder Register", description: "Sales leadership, regional managers, Sales Ops, Finance, IT and Helio CRM. Record interest, influence and how each will be engaged — adoption depends on it.", priority: "high", category: "Stakeholder", linked_area: "stakeholders", linked_module_route: "/app/stakeholders", completion_action: "Open Stakeholders, review each profile, then complete the register." },
    { title: "Start the RAID Log for the rollout", description: "Be specific: data quality, duplicate customer lists, adoption resistance, finance integration, quarter-end clash. Every high risk needs an owner and a mitigation.", priority: "high", category: "Risk", linked_area: "raid", linked_module_route: "/app/raid", completion_action: "Open RAID and log risks, assumptions, issues and dependencies with named owners." },
    { title: "Report the position to Emma Collins", description: "Write your first weekly status report. Be honest about what isn't agreed yet.", priority: "medium", category: "Reporting", linked_area: "reports", linked_module_route: "/app/reports", completion_action: "Open Reports → New status report and submit it." },
  ],
  budget: [
    { category: "Helio Licences", description: "Helio CRM subscription for 140 users, year one", amount: 210000 },
    { category: "Implementation Partner", description: "Helio CRM consultants — discovery, configuration and build", amount: 260000 },
    { category: "Data Migration", description: "Cleansing, de-duplication and migration of customer data", amount: 120000 },
    { category: "Integrations", description: "Finance system and marketing platform integration", amount: 95000 },
    { category: "Training & Adoption", description: "Training sessions, guides and floor-walking support", amount: 70000 },
    { category: "Internal Resources", description: "Programme coordination, Sales Ops and IT time", amount: 50000 },
    { category: "Contingency", description: "Programme contingency held by the sponsor", amount: 45000 },
  ],
  jargon:
    "Use CRM / sales-operations language: pipeline, opportunity stages, forecast categories, leads, accounts, contacts, duplicates, data cleansing, data migration, field mapping, integration, UAT, pilot region, go-live, hypercare, adoption, activity logging, dashboards, quarter-end, win rate. Vendor = Helio CRM. Never use healthcare, care-home, clinical or office-move language.",
  toneGuide:
    "Tone for this programme: brisk, commercial British workplace. Sales leaders talk in targets and quarters and are impatient with process; Sales Ops is detail-focused; Finance is precise about numbers; the architect is technical but pragmatic. Friendly but results-driven — avoid clinical warmth.",
};

export const SCENARIOS: Record<string, ScenarioPack> = {
  "office-relocation": OFFICE_RELOCATION,
  "crm-implementation": CRM_IMPLEMENTATION,
};

export function scenarioFor(slug?: string | null): ScenarioPack | null {
  if (!slug) return null;
  return SCENARIOS[slug] ?? null;
}
