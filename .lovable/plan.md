# CRM Simulation — Milestone Plan

Build the CRM simulation as a standalone Atlas track, following the DCR template pattern (route under `_authenticated/`, chapters + progress, AI feedback, admin evals).

---

## Milestone 1 — Scaffolding & Data Model

**Goal:** Create the shell of the CRM simulation so a user can enter it, see chapters, and progress state persists.

- New route: `src/routes/_authenticated/simulations/crm.tsx` (+ chapter child routes)
- Register CRM as a `project_template` (kind = `crm`) with metadata (title, description, duration, competencies)
- Reuse existing tables: `project_instances`, `project_chapters`, `chapter_progress`, `simulation_state`
- Seed CRM chapter list (e.g. Discovery → Segmentation → Pipeline Setup → Outreach → Deal Management → Renewal/Retention)
- Landing card on `/simulations` linking into CRM
- Wire "Start CRM Simulation" → creates `project_instance` + initial `simulation_state`

**Deliverable:** User can launch CRM, sees chapters, progress saves.

---

## Milestone 2 — Core Simulation Mechanics

**Goal:** Interactive gameplay loop per chapter (the "real" simulation logic).

- Fake CRM UI: contacts, accounts, deals, pipeline stages (kanban), activity timeline
- Chapter scripts: scenario prompts, decisions, branching outcomes
- State machine: decisions update `simulation_state` (pipeline health, relationship scores, forecast accuracy)
- Scoring rubric per chapter (accuracy, prioritization, communication quality)
- Task/RAID/stakeholder integration reused from existing tables where relevant

**Deliverable:** User can complete all chapters end-to-end with meaningful state changes and a score.

---

## Milestone 3 — AI Coaching & Feedback

**Goal:** LLM-driven realism and per-decision coaching.

- Server function calling Lovable AI Gateway for:
  - Stakeholder replies (email/message simulation via `comms_messages`)
  - Chapter debrief + coaching (writes to `ai_feedback`)
  - Change-request / objection generation
- Prompt library per chapter, versioned
- Cost guardrails (token caps, model selection: `google/gemini-2.5-flash` default)

**Deliverable:** Every chapter ends with tailored AI feedback; stakeholder comms feel dynamic.

---

## Milestone 4 — Polish & UX

**Goal:** Ship-quality experience.

- Empty states, loading skeletons, error boundaries on all CRM routes
- Mobile layout pass (kanban → stacked list on small screens)
- Micro-animations on stage transitions, deal wins
- Accessibility: keyboard nav on pipeline, ARIA on drag targets
- Onboarding tour for first-time CRM users
- Head metadata + OG image for CRM landing

**Deliverable:** Feels as polished as DCR.

---

## Milestone 5 — Admin Evals & Analytics

**Goal:** Admin can measure quality and iterate.

- Extend `admin.evals` with CRM eval suite (`ai_eval_runs` / `ai_eval_results`)
- Golden-path traces per chapter for regression testing
- CRM-specific metrics on `admin.analytics`: starts, completions, avg score, drop-off per chapter
- Feedback triage view for `ai_feedback` entries flagged low quality

**Deliverable:** Admin can spot regressions and prioritize prompt fixes.

---

## Milestone 6 — QA & Launch

**Goal:** Confidence to open to beta users.

- Playwright happy-path per chapter
- Manual playtest pass (2–3 rounds with prompt tuning between)
- Copy edit pass across all scenarios
- Enable CRM in the simulations catalog

**Deliverable:** CRM simulation live for all beta testers.

---

## Technical Notes

- Reuse patterns from DCR: same route structure, same hooks (`useChapterProgress`, `useSimulationState`), same feedback pipeline
- All server functions under `src/lib/crm.functions.ts`, guarded by `requireSupabaseAuth`
- No new tables unless a CRM-specific concept doesn't fit existing schema — if needed (e.g. `crm_pipeline_snapshots`), migrate with GRANTs + RLS in one migration
- Admin routes stay guarded by existing `user_roles` check

## Cost Control

Suggest treating each milestone as its own build session, review before starting the next. Milestones 2 and 3 are the largest; 1, 4, 5, 6 are lighter.
