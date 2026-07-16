# Templates-in-Modules Build Plan

Goal: task → correct in-module template opens → learner completes real work → work persists in the module → readiness check → submit → stakeholder reacts. No duplicate template pages. Reuse `TaskSubmissionDialog`, readiness engine, upload flow, task linkage.

## Shared architecture (built once, reused everywhere)

- **Data model per artefact**: one table per artefact type (charter, status_report, resource_plan, change_request, stakeholder_register, meeting, lessons_learned). Each row is versioned, scoped to `project_instance_id + user_id`, with `status` (draft | submitted | approved), `linked_task_id`, `payload jsonb`, `version int`, `submitted_at`.
- **Version history**: snapshot on Submit only (per your choice). New `*_versions` sibling tables store an immutable copy of `payload` per submission.
- **Reusable pieces**:
  - `useArtefact(kind)` hook — load current draft for active project.
  - `<ArtefactSectionField>` component — label, guidance placeholder, min-length hint, live completion signal.
  - `<ArtefactActions>` — Save draft · Edit · Preview · Submit · Export PDF (client-side via `jsPDF`) · Upload PDF.
  - Readiness reuses existing `TEMPLATES` field registry + `evaluateGenericTemplate` from `src/lib/templates.ts`; the "Submit" button inside each module opens the existing `TaskSubmissionDialog` prefilled with the artefact's current fields when a `linked_task_id` is set.
- **Task → module routing**: `resolveTaskArtefactRoute(task)` maps a task to a module URL with `?task=<id>` param (e.g. `/app/charter?task=…`). The module reads the param, loads/creates a draft linked to that task, and scrolls to the first empty required section. RAID single-risk tasks open the RAID entry form with the correct kind/severity pre-selected.
- **On submit**: writes version snapshot → updates task status via existing `submitTaskWithReadiness` → recomputes phase progress (existing `phase.functions.ts`) → posts a stakeholder inbox message using existing comms pipeline.

## Stage 1 — Project Charter (this turn's build after approval)

1. **DB migration**: `project_charters` + `project_charter_versions` with all 17 charter sections in a `payload jsonb`, `completion_pct` generated, `approval_status`, `sponsor_comment`. RLS scoped to owner; GRANTs to `authenticated` + `service_role`.
2. **Server fns** `src/lib/charter.functions.ts`: `getCharter`, `upsertCharterDraft`, `submitCharter`, `listCharterVersions`, `approveCharter` (sponsor sim).
3. **Route** `src/routes/_authenticated/app.charter.tsx`: sectioned form (title, background, business need, purpose, objectives, success criteria, in/out of scope, deliverables, milestones, budget summary, key stakeholders, sponsor, PM, assumptions, constraints, initial risks, governance). Each section shows guidance placeholder — never auto-fills. Right rail: completion %, version history list, approval status pill, Export PDF, Upload PDF, Submit for sponsor approval.
4. **Task linkage**: charter-category tasks route to `/app/charter?task=…` and the Submit action in the charter reuses `TaskSubmissionDialog` with `values` pre-populated from `payload`.
5. **Sidebar nav**: add "Charter" under Planning.
6. **PDF export**: client-side `jsPDF` renders the sections; installed with `bun add jspdf`.

## Stage 2 — RAID linkage polish

- Individual RAID tasks (`Log the vendor delivery risk`, etc.) open `/app/raid?kind=risk&task=…&prefill_title=…` and auto-scroll to the entry form with fields prefilled.
- On saving that specific entry, mark the task ready and auto-open the existing submission dialog scoped to just that entry (not the whole log).
- Keep the existing "Submit log for review" workflow untouched.

## Stage 3 — Status Report module

- New route `/app/status-report` using the same shared architecture. Live-populated fields: reporting period (auto), RAG (from `simulation_state.health`), schedule/budget status (from `phase.functions` + `budget_lines`). Narrative fields blank with guidance.
- Version snapshots on Submit; PDF export; upload alternative; task linkage identical to Charter.

## Stages 4–8 (future turns, same pattern)

Resource Plan (extend `budget_lines` or new `resource_plan_items`), Change Request (Create vs Review split inside existing `app.changes.tsx`), Stakeholder Register with influence×interest matrix (extend existing stakeholder module), Meetings agenda+minutes with auto-task creation from action items, Lessons Learned inside Closure. Each reuses the artefact hook, section field, actions bar, readiness engine, PDF export, and task linkage.

## Non-goals for this build

- No redesign of Atlas visual identity.
- No new duplicate `/templates` pages — the existing reference index at `/app/templates` stays as a directory; the working templates are the module pages themselves.
- No AI auto-completion of sections.

## Approval needed

Confirm and I'll ship **Stage 1 (Project Charter)** end-to-end: migration → server fns → route → task routing → PDF export → sidebar nav. Stages 2 and 3 follow in the next turns after you validate the Charter flow.
