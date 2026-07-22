# Atlas UX Polish — Batch A (Weekend-Ready)

Goal: make Atlas feel like it was built by a team of 10, not by Lovable — without touching any simulation, scoring, or AI logic. Everything below is presentation/visual layer only.

## Scope guardrails (what stays untouched)

- No changes to `sim.functions.ts`, `time.functions.ts`, `tasks.functions.ts`, `learning.ts`, `pm.functions.ts`, `submission.functions.ts`, `templates.ts`, or any Supabase schema.
- No changes to routes, server functions, query keys, or invalidation logic.
- No changes to Charter, RAID, Budget, Reports, Meetings, CR, Retros module logic.
- Sidebar structure, phase gates, blocker detection, task permissions all remain as they are.

## 1. Motion & micro-interactions

Install `framer-motion` (already peer-compatible). Add a small motion primitives file `src/components/motion/primitives.tsx` with reusable variants (`fadeUp`, `stagger`, `pop`, `checkPulse`).

Apply to:
- **Dashboard hero card** — subtle fadeUp on mount, progress bar animates from 0 to current value.
- **Task summary strip** — staggered count-up on the four numbers (uses `useReducedMotion` for accessibility).
- **Task board columns** — cards fade+slide when status changes; column count badges pop on update.
- **Phase progress card** — checkmarks fill with a spring animation when a deliverable completes.
- **Buttons** — micro press-scale (0.97) on primary/navy CTAs.
- **Sidebar nav** — active-tile transition with layoutId (Linear-style pill slide).
- **Phase gate advance** — confetti burst (canvas-confetti, ~4KB) + navy-to-orange gradient sweep across the hero when a phase completes.

Respects `prefers-reduced-motion` everywhere.

## 2. Characterful empty states

New shared component `src/components/empty-state.tsx` accepts `illustration`, `title`, `body`, `cta`. Voice matches Atlas mentor tone (warm, PM-flavoured).

Applied to:
- RAID: "No risks logged yet. David hasn't flagged anything either — quiet, but stay alert."
- Change Requests: "No change requests. Enjoy the calm — it rarely lasts."
- Inbox: "Inbox zero. Rare in real projects. Savour it."
- Meetings: "No meetings scheduled. Time to actually do the work."
- Retrospectives: "No retros yet. You need a phase gate under your belt first."
- Reports: "No status reports filed. Sponsors are watching quietly."
- Documents: "No documents uploaded. Templates are one tab over."
- Tasks: "All clear on this filter. Try switching columns."

## 3. Day in Review recap modal

New component `src/components/dashboard/day-in-review.tsx`. Triggers automatically after `advanceTime` returns, before returning control to the user. Duolingo-style modal, 3 animated slides:

1. **What changed** — count-up of new inbox messages, resolved blockers, new tasks. Icons animate in sequence.
2. **Wins & watch-outs** — pulled from the existing `resolution` payload and RAID severity. No new data source; just presentation.
3. **What's next** — top 3 recommended tasks (from existing `listWhatsNext`). Each card is clickable and closes the modal into the target module.

Persistence: user can dismiss and reopen from the sidebar "More" menu ("Last day recap"). Won't auto-open more than once per advance.

## 4. Custom illustrations (flat-geometric, navy/orange/cream)

Generate 8 illustrations via image gen, style-locked to: flat geometric, thin strokes, navy `#0B132B` + orange `#F97316` + cream `#FFF8EF` + neutral `#E5E7EB`, subtle grid backgrounds, no gradients.

Set:
1. David the mentor — portrait for mentor panels
2. Empty inbox
3. Empty RAID (calm office)
4. Empty change requests
5. Empty meetings (empty conference room)
6. Phase-gate hero (mountain summit / flag)
7. Celebration (confetti + trophy) for Day in Review "wins" slide
8. Onboarding hero for the Comfort Start brief sheet

Each committed as a `.asset.json` pointer via `lovable-assets` — repo stays light.

## 5. Micro-polish sweep

- Card hover elevations (subtle, 2px lift + shadow) on dashboard tiles and RAID summary tiles.
- Focus rings tightened to Atlas orange for keyboard navigation.
- Skeleton loaders replaced with animated shimmer using existing tokens (currently a static grey box on some routes).
- Tooltip on the sidebar phase card's progress bar showing "X of Y deliverables mapped."

## Files created

- `src/components/motion/primitives.tsx`
- `src/components/empty-state.tsx`
- `src/components/dashboard/day-in-review.tsx`
- `src/assets/illustrations/*.svg.asset.json` (8 pointers)

## Files modified (presentation only, no logic changes)

- `src/routes/_authenticated/app.index.tsx` — motion on hero + strip, mount Day in Review, empty-state prop pass-through
- `src/components/dashboard/continue-card.tsx` — animated progress bar
- `src/components/dashboard/task-summary-strip.tsx` — count-up numbers
- `src/components/dashboard/task-board.tsx` — card motion + empty state
- `src/components/dashboard/phase-progress-card.tsx` — check animation + tooltip
- `src/routes/_authenticated/app.tsx` — sidebar active-tile motion, "Last day recap" entry
- `src/routes/_authenticated/app.raid.tsx`, `app.inbox.tsx`, `app.meetings.tsx`, `app.documents.tsx`, `app.tasks.tsx`, `app.change-requests.tsx`, `app.reports.tsx`, `app.retros.tsx` — empty-state swap
- `src/styles.css` — micro-polish tokens (hover elevation, focus ring, shimmer keyframes)
- `package.json` — add `framer-motion`, `canvas-confetti`

## What's NOT in this batch (Batch B, post-presentation)

- Guided onboarding tour (medium risk — DOM-selector coupling)
- Mobile-first RAID & Kanban restructure (medium-high risk — restructures working screens)

## Verification

After build I'll manually confirm:
- Dashboard hero + strip animate on mount without layout shift
- Advance a day → Day in Review opens with real counts from `advanceTime` output
- One phase gate advance still fires (Steering Committee unchanged), plus confetti
- Empty states render on filtered views without hitting protected data
- No new console errors; existing simulation flows unaffected
