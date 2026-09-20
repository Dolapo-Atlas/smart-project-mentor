/**
 * Public, free project-management guides.
 *
 * These pages exist to be found in search. Each one answers a question people
 * actually type into Google, shows a worked example from the Atlas Digital Care
 * Records project, and offers a blank template they can copy without signing up.
 *
 * Copy lives here so it can be edited in one place.
 */

export type GuideSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type ExampleTable = {
  caption: string;
  columns: string[];
  rows: string[][];
};

export type TemplateField = {
  label: string;
  hint: string;
};

export type Faq = { q: string; a: string };

export type Guide = {
  slug: string;
  /** Short label used in the index and navigation. */
  nav: string;
  /** Page <title>. Written around the search phrase. */
  title: string;
  metaDescription: string;
  h1: string;
  standFirst: string;
  readMinutes: number;
  sections: GuideSection[];
  example: ExampleTable;
  template: { heading: string; intro: string; fields: TemplateField[] };
  faqs: Faq[];
  cta: { heading: string; body: string; label: string; utm: string };
};

export const GUIDES: Guide[] = [
  {
    slug: "raid-log",
    nav: "RAID log",
    title: "What Is a RAID Log? Meaning, Example and Free Template | Atlas",
    metaDescription:
      "A RAID log tracks risks, assumptions, issues and dependencies on a project. Plain-English explanation, a worked example and a free RAID log template you can copy.",
    h1: "What is a RAID log?",
    standFirst:
      "RAID stands for Risks, Assumptions, Issues and Dependencies. A RAID log is the single place a project keeps all four, so nothing quietly turns into a crisis.",
    readMinutes: 6,
    sections: [
      {
        heading: "What each letter means",
        body: [
          "The four categories look similar on paper and behave very differently in a real project. Getting them in the right column is most of the skill.",
        ],
        bullets: [
          "Risk — something that has not happened yet but would hurt the project if it did. It has a likelihood and an impact, and it needs an owner and a mitigation.",
          "Assumption — something you are treating as true because you cannot confirm it yet. Assumptions are dangerous precisely because they feel like facts.",
          "Issue — something that has already happened and is affecting the project now. Issues need action and a date, not analysis.",
          "Dependency — something outside your control that your work waits on: another team, a supplier, a sign-off, a system.",
        ],
      },
      {
        heading: "The difference between a risk and an issue",
        body: [
          "A risk is in the future and conditional. An issue is in the present and real. \"The supplier may miss the data migration date\" is a risk. \"The supplier missed the data migration date\" is an issue.",
          "Coordinators most often get marked down for logging issues as risks. It reads as though the project has not noticed the problem yet, which erodes a sponsor's confidence quickly.",
        ],
      },
      {
        heading: "How often to update it",
        body: [
          "A RAID log that is updated before a steering committee and ignored in between is theatre. Update it when something changes: after a stakeholder conversation, when a date moves, when an assumption is confirmed or broken.",
          "Every entry needs an owner and a next date. An entry with neither is a note, not a control.",
        ],
      },
      {
        heading: "What good entries look like",
        body: [
          "Write entries a sponsor can act on without asking you a follow-up question. Name the thing, the effect, the owner and what happens next.",
        ],
        bullets: [
          "Weak: \"Staff training risk.\"",
          "Strong: \"Ward staff may not complete training before go-live, which would slow triage in week one. Owner: Margaret Hughes. Mitigation: two extra evening sessions booked, attendance reviewed 14 March.\"",
        ],
      },
    ],
    example: {
      caption: "Worked example — entries from a hospital records rollout",
      columns: ["Type", "Entry", "Owner", "Severity", "Next step"],
      rows: [
        [
          "Risk",
          "Ward staff may not finish training before go-live, slowing triage in week one",
          "Margaret Hughes",
          "High",
          "Two evening sessions booked; attendance reviewed 14 March",
        ],
        [
          "Assumption",
          "The supplier will provide a test environment by the end of the planning phase",
          "James Okoro",
          "Medium",
          "Confirm in writing at the next supplier call",
        ],
        [
          "Issue",
          "Data migration test returned 4% record mismatch, above the 1% tolerance",
          "James Okoro",
          "High",
          "Root-cause review this week; re-test before the stage gate",
        ],
        [
          "Dependency",
          "Clinical sign-off on the new triage form must come from the clinical lead",
          "Rachel Adeyemi",
          "Medium",
          "Slot requested in the clinical governance meeting",
        ],
      ],
    },
    template: {
      heading: "Free RAID log template",
      intro:
        "Copy this into a spreadsheet or document. One row per entry, one entry per real thing — never a row that covers three problems at once.",
      fields: [
        { label: "ID", hint: "R1, A1, I1, D1 — so people can refer to an entry in a meeting" },
        { label: "Type", hint: "Risk, Assumption, Issue or Dependency" },
        { label: "Description", hint: "What it is and what it would do to the project" },
        { label: "Owner", hint: "One named person, never a team" },
        { label: "Likelihood / Severity", hint: "High, medium or low — be consistent" },
        { label: "Mitigation or action", hint: "What is being done about it" },
        { label: "Next review date", hint: "A real date, not \"ongoing\"" },
        { label: "Status", hint: "Open, being managed, closed" },
      ],
    },
    faqs: [
      {
        q: "What does RAID stand for in project management?",
        a: "Risks, Assumptions, Issues and Dependencies. A RAID log is a single register holding all four for one project.",
      },
      {
        q: "Is a RAID log the same as a risk register?",
        a: "No. A risk register covers risks only. A RAID log is wider: it also tracks the assumptions you are relying on, the problems already happening, and the things you are waiting on from other people.",
      },
      {
        q: "Who owns the RAID log?",
        a: "The project coordinator or project manager keeps it, but every individual entry has its own named owner. A log where everything is owned by the coordinator is a warning sign.",
      },
    ],
    cta: {
      heading: "Practise keeping a RAID log on a live project",
      body:
        "In the Atlas simulation you run a hospital records rollout. Risks arrive by email, assumptions break, and your steering committee asks about entries you logged. You keep the RAID log yourself and get feedback on it.",
      label: "Try the simulation free",
      utm: "raid-log",
    },
  },

  {
    slug: "project-charter",
    nav: "Project charter",
    title: "Project Charter Template: What to Write in Each Section | Atlas",
    metaDescription:
      "A project charter sets out why a project exists, what is in scope and who decides. Free project charter template, a filled example, and what each section must say.",
    h1: "Project charter template",
    standFirst:
      "A project charter is the document that authorises a project. It says why the work exists, what it will and will not cover, who sponsors it, and how everyone will know it worked.",
    readMinutes: 7,
    sections: [
      {
        heading: "What a charter is for",
        body: [
          "A charter exists so that three months in, when someone asks for \"one small extra thing\", there is a written answer about whether that is in scope and who can change it.",
          "It is short by design. If your charter runs to fifteen pages, it has become a plan. A charter should be readable by a sponsor in five minutes.",
        ],
      },
      {
        heading: "What each section must actually say",
        body: [
          "Most weak charters fail in the same places: a purpose that describes the solution instead of the problem, objectives nobody could measure, and scope with no exclusions.",
        ],
        bullets: [
          "Purpose and problem — the problem in the organisation, not the system you plan to buy. \"Paper records take 20 minutes to retrieve\" is a problem. \"Implement a records system\" is not.",
          "Objectives — measurable, with a number and a date wherever possible.",
          "Scope — two lists. What is included, and explicitly what is excluded. The exclusions do the real work.",
          "Sponsor and stakeholders — who authorises the project, who must be consulted, who is affected.",
          "Milestones — the handful of dates that matter, not a task list.",
          "Success criteria — how you will know afterwards that it worked, agreed in advance.",
          "Risks and assumptions — the top few, not everything. The full set belongs in the RAID log.",
        ],
      },
      {
        heading: "The exclusions test",
        body: [
          "Read your scope section and ask: could a reasonable colleague argue that something you did not intend is included? If yes, add it to the exclusions.",
          "Every piece of scope creep that ever ruined a project began as something both sides assumed was obvious, in opposite directions.",
        ],
      },
      {
        heading: "Getting it approved",
        body: [
          "A charter is not finished when you have filled in the boxes. It is finished when the sponsor has read it and agreed to it. Send it with a short note naming the two or three decisions you want confirmed, rather than asking for general comments.",
        ],
      },
    ],
    example: {
      caption: "Worked example — objectives and scope from a records rollout charter",
      columns: ["Section", "Written as"],
      rows: [
        [
          "Purpose",
          "Retrieving a patient record currently takes an average of 20 minutes and depends on paper files held in three locations, delaying triage and creating avoidable clinical risk.",
        ],
        [
          "Objective",
          "Reduce average record retrieval time from 20 minutes to under 2 minutes for all inpatient wards by the end of the rollout.",
        ],
        [
          "In scope",
          "Inpatient wards A to F, records from 2019 onwards, staff training for ward and reception teams.",
        ],
        [
          "Out of scope",
          "Outpatient clinics, archived records before 2019, replacement of the appointment booking system, changes to clinical triage policy.",
        ],
        [
          "Success criterion",
          "90% of ward staff retrieving records unaided within two weeks of go-live, measured by system logs and a staff survey.",
        ],
      ],
    },
    template: {
      heading: "Free project charter template",
      intro:
        "Work through the sections in order. Write the problem before you write anything about a solution — it changes what the rest of the charter says.",
      fields: [
        { label: "Project name and date", hint: "Plus the version, so people know which charter they are reading" },
        { label: "Purpose and problem", hint: "The business problem, in the organisation's own terms" },
        { label: "Objectives", hint: "Three to five, each with a number and a date" },
        { label: "In scope", hint: "What this project will deliver" },
        { label: "Out of scope", hint: "What it explicitly will not — the most useful section in the document" },
        { label: "Sponsor", hint: "The named person who authorises the project and its budget" },
        { label: "Key stakeholders", hint: "Who must be consulted, who is affected, and what each one cares about" },
        { label: "Milestones", hint: "The few dates a sponsor would ask about" },
        { label: "Budget", hint: "The authorised figure and what it covers" },
        { label: "Success criteria", hint: "How you will know afterwards that it worked" },
        { label: "Key risks and assumptions", hint: "The top few only" },
        { label: "Approval", hint: "Who signs, and on what date" },
      ],
    },
    faqs: [
      {
        q: "What is a project charter?",
        a: "A short document that authorises a project. It records the problem being solved, the objectives, the scope and exclusions, the sponsor, the milestones and how success will be measured.",
      },
      {
        q: "What is the difference between a project charter and a project plan?",
        a: "The charter says why the project exists and what it covers. The plan says how and when the work will be done. The charter comes first and is usually two or three pages; the plan is much longer.",
      },
      {
        q: "Who signs off a project charter?",
        a: "The project sponsor — the person accountable for the budget and the benefits. Other stakeholders may review it, but the sponsor authorises it.",
      },
    ],
    cta: {
      heading: "Write a charter that a sponsor actually reviews",
      body:
        "In the Atlas simulation you draft the charter for a live hospital rollout, submit it to a sponsor who reads it, and get specific feedback on your scope, objectives and success measures.",
      label: "Try the simulation free",
      utm: "project-charter",
    },
  },

  {
    slug: "project-schedule",
    nav: "Schedule & WBS",
    title: "Project Schedule and Work Breakdown Structure: Template and Example | Atlas",
    metaDescription:
      "How to break project work down into a schedule that survives review. Work breakdown structure explained, a worked example and a free project schedule template.",
    h1: "Project schedule and work breakdown structure",
    standFirst:
      "A schedule made of five big bars gets rejected. A schedule built from a proper work breakdown structure can be challenged, resourced and tracked.",
    readMinutes: 7,
    sections: [
      {
        heading: "Why schedules get sent back",
        body: [
          "The most common review comment on a first schedule is that it has no task-level detail. \"Build phase — 8 weeks\" tells a reviewer nothing: it cannot be resourced, its dependencies are invisible, and nobody can tell in week three whether it is late.",
          "The fix is a work breakdown structure: break the deliverables down until each piece of work has a clear owner, a clear finish, and an estimate you could defend.",
        ],
      },
      {
        heading: "What a work breakdown structure is",
        body: [
          "A WBS decomposes the project into deliverables, then into the work packages needed to produce them. It describes outputs, not activity for its own sake.",
        ],
        bullets: [
          "Level 1 — the project.",
          "Level 2 — major deliverables or phases.",
          "Level 3 — work packages: a piece of work one owner can finish and hand over.",
          "Stop when you can estimate the work package and name who does it. Going further produces a to-do list, not a plan.",
        ],
      },
      {
        heading: "Turning the breakdown into a schedule",
        body: [
          "Once you have work packages, sequence them. For each one, record the owner, the duration, and what must finish before it can start.",
          "Then look for the chain of dependent work that determines the end date. That chain is where slippage costs you the project, and it is what you report on.",
        ],
      },
      {
        heading: "The detail test before you submit",
        body: [
          "Before sending a schedule for review, check each line: does it have one owner, a duration you could justify, and at least one named predecessor or a reason it can start independently? If a line fails that test, it is a phase heading, not a task.",
        ],
      },
    ],
    example: {
      caption: "Worked example — breakdown of one deliverable",
      columns: ["Level", "Item", "Owner", "Duration", "Depends on"],
      rows: [
        ["2", "Data migration", "James Okoro", "6 weeks", "Charter approved"],
        ["3", "Agree field mapping with clinical lead", "Rachel Adeyemi", "5 days", "Charter approved"],
        ["3", "Build extract from legacy records", "Supplier", "10 days", "Field mapping agreed"],
        ["3", "Run test migration on 2019 records", "James Okoro", "5 days", "Extract built"],
        ["3", "Reconcile mismatches and re-test", "James Okoro", "8 days", "Test migration complete"],
        ["3", "Clinical sign-off on migrated sample", "Rachel Adeyemi", "3 days", "Reconciliation complete"],
      ],
    },
    template: {
      heading: "Free project schedule template",
      intro:
        "One row per work package. Fill the owner and predecessor columns before you fill the dates — the dates fall out of the sequence, not the other way around.",
      fields: [
        { label: "WBS reference", hint: "2.3, 2.4 — so a reviewer can follow the breakdown" },
        { label: "Deliverable", hint: "Which level-2 item this work belongs to" },
        { label: "Work package", hint: "A piece of work one owner can finish and hand over" },
        { label: "Owner", hint: "One named person" },
        { label: "Duration", hint: "In working days, with the basis of the estimate" },
        { label: "Predecessor", hint: "What must finish first" },
        { label: "Start / finish", hint: "Derived from the sequence" },
        { label: "Milestone", hint: "Mark the few lines a sponsor will ask about" },
        { label: "Status", hint: "Not started, in progress, complete, blocked" },
      ],
    },
    faqs: [
      {
        q: "What is a work breakdown structure?",
        a: "A breakdown of a project into its deliverables and then into work packages — pieces of work small enough that one owner can finish and hand each one over.",
      },
      {
        q: "How detailed should a project schedule be?",
        a: "Detailed enough that every line has one owner, a duration you could justify, and a stated predecessor. If a line cannot meet that test, it is a phase heading rather than a task.",
      },
      {
        q: "Do I need a WBS before a schedule?",
        a: "In practice yes. A schedule written without a breakdown tends to be a handful of long bars that cannot be resourced or tracked, which is why reviewers send it back.",
      },
    ],
    cta: {
      heading: "Build a schedule that gets through a review",
      body:
        "In the Atlas simulation you plan a hospital records rollout, submit your schedule, and a reviewer challenges it the way a real programme office would — including asking for a proper breakdown when the detail is thin.",
      label: "Try the simulation free",
      utm: "project-schedule",
    },
  },
];

export function guideBySlug(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}

export const TOOLKIT_BASE = "https://atlassim.co";
