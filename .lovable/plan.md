## Multi-simulation system — plan

Turn Atlas from a single fixed project into a picker of six simulations, each running as an isolated "sim room" with its own inbox, RAID, stakeholders, budget, reports and progress. Ship the picker + two fully playable sims (Digital Care Records and one more) in sprint one and two.

### What you get at the end

- A home screen ("Which project do you want to manage?") matching your mockup, with 6 project cards, RECOMMENDED badge, sort, and a sticky "See Atlas in action" CTA.
- Each user can start multiple sims, run them in parallel, switch between them from a "My Projects" list, and pause/resume any of them.
- Selecting a project drops you into a sim room where every existing module (Inbox, Tasks, RAID, Comms, Meetings, Reports, Budget, Changes, Gates, Stakeholders, Progress, Learning) is scoped to that project only.
- Two sims are fully authored with their own stakeholder cast, opening emails and task templates. The other four show on the picker as "Coming soon".

---

### Sprint 1 — Picker + isolation (the foundation)

**1. Database — add a `projects` concept**

New table `project_instances` (one row per user × simulation they've started). Each existing per-user table (`tasks`, `inbox_messages`, `comms_messages`, `raid_items`, `meetings`, `status_reports`, `change_requests`, `phase_gates`, `budget_lines`, `workstream_rag`, `stakeholder_relationships`, `documents`, `simulation_state`) gets a `project_instance_id` column. RLS scopes by `user_id` as today, plus the foreign key.

A second table `project_templates` holds the six catalog entries (slug, title, category, duration, difficulty, stakeholder count, key skills, description, recommended flag). Seeded by migration so the picker is data-driven, not hard-coded.

**2. Picker UI (`/app`)**

Rebuild `app.index.tsx` (or new `app.projects.tsx`) as the picker shown in your mockup:
- "Which project do you want to manage?" headline with the orange underline on "manage?".
- 6 cards laid out 3-up on desktop, 1-up on mobile.
- Each card: category-coloured icon, title, category chip, description, Duration / Difficulty / Stakeholders row, "Key skills you'll practice" chips, "Select Project →" button.
- RECOMMENDED badge on the first card.
- Sort dropdown (Recommended / Duration / Difficulty).
- "See Atlas in action — Watch Demo" tile in the left rail.

**3. My Projects + routing**

- New `/app/projects` route lists in-progress sims with progress %, current phase, last-active date, and Resume / Archive actions.
- Sim rooms move under a parameterised route: `/app/p/$projectId/inbox`, `/app/p/$projectId/tasks`, etc. The existing sidebar becomes project-scoped.
- A small project switcher in the top bar (project name + chevron) lets the user jump between active sims without going back to the picker.

**4. Engine refactor**

Server functions in `pm.functions.ts`, `tasks.functions.ts`, `comms.functions.ts`, `raid.functions.ts`, `time.functions.ts`, `learning.functions.ts` all take `projectInstanceId` and filter / write against it. Stakeholder list is loaded from the project template, not the global `STAKEHOLDERS` constant.

---

### Sprint 2 — Second playable sim + authoring layer

**5. Stakeholder + scenario authoring**

Per-project content lives in a typed file: `src/lib/sims/<slug>/index.ts` exporting `{ stakeholders, openingInbox, taskTemplates, phaseDeliverables, budgetSeed, voiceMap }`. The engine reads from there.

**6. Digital Care Records (already mostly authored)**

Refactor existing Margaret/David/Priya/Rachel cast and current opening flow into `src/lib/sims/digital-care-records/`. No new content; just relocate.

**7. Second sim — recommend CRM Implementation** (smallest authoring lift, reuses Vendor Mgmt + UAT + Change Requests which already exist)

New cast (e.g. Sales Director sponsor, CRM Vendor PM, IT Security Lead, Sales Ops Manager, Finance Controller, Change Manager). New opening inbox (data migration scope, UAT readiness, integration with finance). New task templates tied to vendor mgmt, UAT cycles, change requests. New phase deliverables (vendor contract → UAT sign-off → cutover plan → hypercare).

**8. Picker state**

The other four cards (Website Redesign, Office Relocation, New Product Launch, EV Charging) render with a "Coming soon" overlay and disabled Select button so the catalog still feels complete.

---

### Out of scope (call out now)

- Cross-project leaderboard / aggregated skills — keep current Learning page per-project for now.
- Multiplayer / shared sim rooms.
- AI-generated sims from a prompt.
- Authoring UI for admins (templates stay code-defined for now).

---

### Technical section

- Migration adds `project_templates` (seeded), `project_instances`, and `project_instance_id uuid` on the 13 per-user tables listed above. RLS policies updated to `user_id = auth.uid()` plus inner join check on `project_instances.user_id`. GRANTs follow the standard `authenticated` + `service_role` block.
- Backfill: existing rows get assigned to a single auto-created "Digital Care Records" instance per user so nothing is lost.
- Routes: introduce `_authenticated/app.p.$projectId.tsx` as a layout that loads the instance + template via `ensureQueryData` and exposes `{ project, template, stakeholders }` through router context to all children. Existing `app.inbox.tsx`, `app.tasks.tsx`, etc. move under it.
- Server fns take `projectInstanceId` as required input and validate it belongs to the caller; all queries filter on it.
- Stakeholder cast becomes `template.stakeholders` (typed array) instead of the global `STAKEHOLDERS` import. Voice mapping moves with it.
- Phase gating reads `template.phaseDeliverables`.
- One-time per-instance seeding (opening inbox, initial budget lines, stakeholder relationships at neutral sentiment) runs on first load of the sim room.
- Picker page is a public-shape protected route (under `_authenticated`) with a TanStack Query loader returning the templates + the user's instances.

### Build order recap

Sprint 1: schema + picker UI + routing refactor + engine takes `projectInstanceId` + Digital Care Records relocated.
Sprint 2: CRM Implementation authored end-to-end + project switcher + My Projects screen.