# Atlas Progression Logic & Project Deliverables — Full Fix

Corrective engineering only: no story changes, no redesign, no new features beyond the Project Deliverables library the brief asks for.

## Stage 1 — One canonical six-phase model (foundation)

New shared module `src/lib/phases.ts`:
- Single ordered list: `initiation → planning → execution → monitoring → go-live → closure`, with labels, gate names, and `nextPhase()` / `prevPhase()` helpers.
- `normalisePhase()` returns `null` for unknown input and logs it — no silent fallback to Execution.
- Re-exported and used by: `time.functions.ts`, `pm.functions.ts` (gates), `phase.functions.ts`, `chapters.functions.ts`, `analytics.functions.ts`, `outcomes.functions.ts`, navigation in `app.tsx`, and `app.progress.tsx` / `app.gates.tsx`.
- Delete the local PHASE arrays in each of those files.

## Stage 2 — One authoritative progression pathway

- Only the gate system writes `simulation_state.phase`. Remove the phase-stepping code from `advanceTime` in `time.functions.ts`; the clock keeps advancing days, events, emails, sentiment and consequences.
- Gate pass advances exactly one phase (fixing the current `execution → closure` jump) and unlocks only the immediately following gate.
- Gate submission is refused server-side unless the phase readiness checklist is satisfied.

## Stage 3 — Governance gates for all six phases

- `phase_gates` seeded with all six phases per project instance.
- Gate evidence assembled from real artefacts, RAID, reports and decisions for that phase.
- Failure result persists reason, concerns and required actions, and offers a re-defend path.

## Stage 4 — Phase readiness becomes the gate condition

- New `src/lib/readiness.ts` defining an explicit checklist per phase, built from requirements already present in Atlas (Charter/Register/RAID for Initiation; Schedule/Resource/Budget/Comms/conditional WBS for Planning; execution deliverables, UAT/training/cutover; status reports/RAID/forecast/change decisions; go-live readiness/support model/decision; handover/lessons/closure report/sign-off).
- `getPhaseProgress` returns the same checklist the gate enforces, so displayed % and progression agree.
- Dashboard readiness panel and the gates page show "what remains before the next phase" — no hidden conditions.

## Stage 5 — Document lifecycle

- `documents.status` lifecycle: `draft → submitted → under_review → approved | changes_requested → resubmitted → approved`, with a migration to add the missing states plus reviewer/decision columns.
- Submission no longer implies approval. The existing AI reviewer/stakeholder approver writes the decision; Charter, Stakeholder Register and Lessons Learned can now reach a persisted `approved`.
- Changes-requested surfaces the specific feedback and allows resubmission; approval fires task sync and readiness refresh.

## Stage 6 — Task status + system-review separation

- One shared task status model in `src/lib/tasks-status.ts`: `todo, in_progress, blocked, submitted, under_review, changes_requested, completed`. Define which count as finished, which unlock dependents, which count toward phase completion. Drop unreachable values.
- `under_review` is a system-processing state: shows "Atlas is reviewing your submission", never a learner blocker, and applies no reputation or sentiment penalty.

## Stage 7 — Clock warnings

- Next Day keeps working with outstanding work but first warns, with "Review outstanding work" and "Advance anyway".
- Sprint / Steering Committee / Go-Live show readiness explicitly. No clock button changes phase.

## Stage 8 — Multi-project scoping

- Every readiness, inbox, task, document, RAID, stakeholder, scoring and progression query scoped to `user_id + project_instance_id` (a shared `scoped()` helper, already present in `phase.functions.ts`, applied everywhere).
- Verified by creating two instances for one user and confirming no cross-blocking.

## Stage 9 — Chapters

- Chapters become narrative only; they never write `simulation_state.phase`.
- Remove hidden task-count thresholds; expose chapter requirements. Fix chapters (including CRM template chapters) with no reachable completion trigger.

## Stage 10 — Finalisation and credential safeguards

- `finalizeRun` validates server-side: phase = closure, closure deliverables complete, Lessons Learned + Closure Report approved, handover done, sponsor sign-off recorded. Certificate issuance re-validates independently.
- On finalise: archive the instance, preserve history/artefacts/score/credential, clear `profiles.current_project_instance_id`, and keep the project viewable in project history.

## Stage 11 — Project Deliverables library

- Migration for `project_artifacts` (or extension of `documents`) keyed on `user_id + project_instance_id + artifact_type + version`, with GRANTs and RLS scoped to the owner.
- New route `/app/deliverables` ("My Project Files"): document name, project, simulated role, created date, status, version, reviewer result, View, Download. Previous versions retained, latest approved version marked.
- Artefacts stay accessible after phase change, completion, archival and credential issue.

## Stage 12 — Downloads

- Professional PDF export with Atlas branding via the existing `src/lib/pdf-export.ts`, plus DOCX for document-style artefacts.
- Header block: learner name, "Atlas Simulated Workplace Project", project name, simulated role, document type, completion/approval date.
- Subtle footer: "Created as part of an Atlas simulated workplace project — atlassim.co". No heavy watermarking.

## Stage 13 — Scoring, access, regression

- One shared grade threshold config (Distinction / Merit / Pass / Not Yet Achieved); remove duplicate constants. Weights unchanged.
- `OPEN_ACCESS` behaviour untouched; dormant payment logic isolated from progression.
- Regression pass over the full journey with a scripted run and browser checks: no phase skipped or entered early, no document stuck pending, no early finalise, files downloadable, no multi-project bleed, each gate lands exactly one phase forward, AI stakeholder replies / task generation / AI feedback still work.
- Closing technical report: changes, files/functions touched, canonical progression logic, per-phase entry requirements, approval workflow, finalisation safeguards, deliverables implementation, tests performed, remaining risks.

## Sequencing note

Stages 1–4 change the progression core and must land together before the rest. I will deliver in that order, verifying after each group rather than all at once.
