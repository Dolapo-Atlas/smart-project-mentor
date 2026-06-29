
# Flagship: Digital Care Records — End-to-End Polish

Turn Digital Care Records (DCR) into Atlas's flagship template. Other templates stay listed but are marked "Coming soon" until DCR is fully polished. One project, one cast, one arc — finishable in 8–12 hours with a clear win/loss and a shareable certificate.

## 1. Lock the 12-chapter arc

A scripted spine of chapters in `project_templates.chapters jsonb`. Each chapter has: title, phase (Initiation / Planning / Execution / Monitoring / Closure), unlock trigger, completion criteria, and 1–3 seed events (emails, tasks, meetings) injected when the chapter opens.

```text
1.  Day One — Welcome & Brief
2.  Stakeholder Mapping
3.  Project Charter Approval
4.  Vendor Kickoff (CareSoft)
5.  Requirements & Clinical Sign-off
6.  Risk Register & Mitigation
7.  Budget Lock & Change Control
8.  Pilot Site Go-Live (Oakwood)
9.  Frontline Pushback
10. Mid-Programme Status Report
11. Rollout Decision Gate
12. Closure, Handover & Lessons Learned
```

Chapter progression is driven by `chapter_state` on `simulation_state` (advances when criteria met). Each chapter opens with a seeded inbox message + 1 task; closing it stamps a chapter completion row used by scoring.

## 2. Win/loss + certificate

New table `project_outcomes` (user_id, instance_id, score breakdown, grade, completed_at, certificate_id).

Score = weighted sum of:
- Stakeholder sentiment average at closure (30%)
- Tasks completed on time vs late vs skipped (25%)
- Budget variance (15%)
- RAID hygiene — risks logged before they fire (15%)
- Status reports submitted on cadence (15%)

Grades: Distinction ≥85 / Pass ≥60 / Conditional 40–59 / Did Not Pass <40.

On reaching Chapter 12 completion, generate a PDF certificate ("Atlas Certificate of Completion — Digital Care Records, Grade: X") via existing PDF flow used in reports, stored at `/mnt/documents`-style download. Show a Results screen at `/app/results` with breakdown, replayable highlights, and a share link.

## 3. AI dialogue quality bar

- **Cast lockdown**: DCR roster (Sarah, David, Priya, James, Margaret, Rachel, CareSoft) becomes canonical. Strip the generic "stakeholder X" fallbacks from prompts; always inject the cast block + project context block.
- **Eval set**: `src/lib/evals/dcr.ts` — 25 golden prompt→expected-traits pairs (e.g. "Margaret reacts to delayed pilot" → expects: in-character, mentions Oakwood residents, frustrated tone, asks for revised date). Add `bun run eval:dcr` that runs them through the gateway and scores with a judge model. Threshold ≥80% pass to ship.
- **Prompt hardening**: shared `dcrSystemPrompt()` builder enforces domain guard (no CRM/website lingo), persona voice per role, length caps, and "never invent new stakeholders" rule.
- **Regression hook**: log every generated message into `ai_feedback` with chapter + persona so we can spot drift.

## 4. Sidebar cut to 6

Hide modules that don't pull weight in DCR. Final nav:

```text
Home · Inbox · Tasks · Stakeholders · RAID · Reports
```

Moved into secondary surfaces (not sidebar items):
- Meetings → entered from Inbox/Tasks when a meeting event fires
- Budget, Changes, Gates, Health, Progress, Documents → grouped under a single "Project" panel on Home
- Learning, Completed, Reviews, Comms, Settings → user menu

Admin/Signups stays admin-only.

## 5. Template gating

`project_templates.status` column: `flagship` | `coming_soon`. Project picker still shows all six but only DCR is selectable; others get a "Coming soon — vote for next" tile that increments a counter in `template_interest`.

## 6. Out of scope (this pass)

- Building the other 5 templates' content
- Multiplayer / co-op rooms
- Mobile-specific layouts beyond what already works
- Re-recording TTS briefings for new chapters (existing voice flow reused)

## Technical sketch

- **Migration**: add `chapters jsonb`, `status text` to `project_templates`; create `project_outcomes`, `template_interest`; seed DCR chapters; mark other 5 `coming_soon`.
- **Server fns** (`src/lib/`):
  - `chapters.functions.ts` — `getCurrentChapter`, `advanceChapter`, `seedChapterEvents`
  - `outcomes.functions.ts` — `computeScore`, `finalizeRun`, `generateCertificate`
  - Update `pm.functions.ts`, `comms.functions.ts`, `sim.functions.ts` to inject DCR cast + chapter context into every prompt.
- **UI**:
  - `src/components/app-sidebar.tsx` — trimmed to 6 items, gated by active template
  - `src/routes/_authenticated/app.index.tsx` — chapter progress strip, current-chapter card, "Project" accordion with budget/gates/health/etc.
  - `src/routes/_authenticated/app.results.$instanceId.tsx` — results + certificate download
  - `src/routes/_authenticated/app.projects.tsx` — flagship badge on DCR, "Coming soon + vote" on others
- **Evals**: `src/lib/evals/dcr.ts`, `scripts/eval-dcr.ts`, npm script `eval:dcr`. Manual gate, not CI-blocking.

## Risks

- Existing in-flight runs on other templates will be paused (shown as "Paused — template under development"). We won't delete their data.
- Score formula is a v1 and will need tuning after first 10 real playthroughs.
- Cert PDF rendering on Workers — reuse the same HTML→PDF path already used for status reports to avoid native deps.
