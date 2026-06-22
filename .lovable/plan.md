# Manual Time Progression System

Atlas currently advances implicitly. This plan introduces explicit, user-driven time progression with consequence generation, a "What's Next?" recommendation panel, and a phase-gating model — like Football Manager for project managers.

## 1. Data model

Add to `simulation_state` (migration):
- `current_day` int (default 1)
- `current_week` int (default 1)
- `current_sprint` int (default 1)
- `phase` text (default `'Initiation'`) — Initiation | Planning | Execution | Monitoring | Go-Live | Closure
- `last_advanced_at` timestamptz
- `next_milestone` text (e.g. `'Steering Committee'`, `'Go-Live'`)

No other tables changed; we reuse `inbox_messages`, `tasks`, `raid_items`, `meetings`, `documents`, `stakeholder_relationships`.

## 2. Server functions (`src/lib/time.functions.ts` — new)

All authenticated.

- `getReadiness()` — returns pre-advance check:
  - `openTasks`, `unreadInbox`, `unsubmittedDocs`, `meetingsMissingMinutes`, `openHighRisks`, `frustratedStakeholders` (sentiment < -20), `missingApprovals`
- `advanceTime({ mode: 'day' | 'week' | 'sprint' | 'steerco' | 'golive', force: boolean })`:
  1. Read readiness; if not `force` and any blocker, return `{ blocked: true, readiness }`.
  2. Compute days to skip (1 / 7 / 14 / until next steerco / until go-live milestone).
  3. Generate consequences based on current state:
     - High open risks → health degrade (green→amber→red), sponsor (-3..-8) sentiment, escalation email from Sarah/David.
     - Governance task done & Rachel concerns cleared → Rachel +5, new approval task.
     - CareSoft sentiment < -10 → +tech risk RAID, schedule slip note, vendor email.
     - Training tasks complete → Margaret +5.
     - Quiet inbox → stakeholder check-in email via existing `generateStakeholderMessage`.
  4. Update phase if deliverables met (see §4).
  5. Append story_log beat ("Day 12 → Day 19. Sponsor noted lack of update.").
  6. Bump `current_day/week/sprint`, set `last_advanced_at`.
  7. Return `{ ok: true, summary: { healthChange, newEmails, sentimentDeltas, beats } }`.

- `getNextAction()` — server-side recommendation (replaces client `computeNextAction` for richer logic). Considers phase, blockers, oldest unread, frustrated stakeholders, missing minutes, pending approvals.

## 3. UI components

- `src/components/time-controls.tsx`:
  - Row of buttons: Next Day · Next Week · Begin Sprint · → Steering Committee · → Go-Live.
  - Click → calls `getReadiness`, opens `AdvanceTimeDialog`.

- `src/components/advance-time-dialog.tsx`:
  - Lists every blocker category with counts and links.
  - Buttons: **Review Issues** (closes, navigates to first blocker) · **Continue Anyway** (calls `advanceTime` with `force:true`).
  - On success → toast summary + `queryClient.invalidateQueries()` everything.

- `src/components/whats-next-panel.tsx`:
  - Replaces the existing "What's next" section on the dashboard with server-driven recommendation from `getNextAction`.
  - Shows phase chip, current day/week, recommended action, CTA link.

## 4. Phase gating

Phase advances inside `advanceTime` when deliverables met:
- Initiation → Planning: project charter doc approved
- Planning → Execution: schedule + RAID baseline tasks complete
- Execution → Monitoring: ≥1 steering committee meeting with minutes
- Monitoring → Go-Live: governance + training + vendor risks all not "High open"
- Go-Live → Closure: go-live milestone meeting complete

Phase change emits a story beat + sponsor email.

## 5. Integration points

- **Dashboard (`app.index.tsx`)**: add `<TimeControls />` near header; swap "What's next" for `<WhatsNextPanel />`; show phase + day in subheader.
- **Meetings (`app.meetings.tsx`)**: after a meeting is marked complete, show inline checklist (minutes / decisions / actions / RAID) + "Continue to Next Day" button that opens the same dialog scoped to `mode:'day'`.
- **Tasks / Documents / Inbox**: small "Advance time" button in header so users can progress from anywhere.

## 6. What we are NOT changing

- Existing sentiment, AI, RAID, inbox, meetings logic stays intact — `advanceTime` calls into them rather than replacing them.
- No automatic background ticking. The dashboard `runEscalations` auto-call is removed; escalations now happen only on advance.

## Files

New:
- `supabase/migrations/<ts>_time_progression.sql`
- `src/lib/time.functions.ts`
- `src/components/time-controls.tsx`
- `src/components/advance-time-dialog.tsx`
- `src/components/whats-next-panel.tsx`

Edited:
- `src/routes/_authenticated/app.index.tsx` (controls + panel + phase chip, drop auto-escalation)
- `src/routes/_authenticated/app.meetings.tsx` (post-meeting checklist + advance CTA)
- `src/routes/_authenticated/app.tasks.tsx`, `app.inbox.tsx`, `app.documents.tsx` (header advance button)
- `src/lib/sim.functions.ts` (expose helpers reused by `time.functions.ts`)
