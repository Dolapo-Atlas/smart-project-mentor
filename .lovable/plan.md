Execute three workstreams sequentially. Each phase is self-contained and ships before the next begins.

## Phase 1 — Polish Pass (Milestones 1–5)

Tighten the "First Day at Work" arc end-to-end.

**Project Intro screen**
- Add subtle parallax on the hero card; ensure skills pills wrap cleanly on mobile.
- Fix transition loader timing so the three steps feel paced (currently too fast on fast networks).
- Guard against missing template metadata (fallback copy instead of empty pills).

**Welcome email**
- Verify idempotency under double-click on "Enter simulation".
- Ensure preferred name fallback chain works for users with no profile name set.

**Guided tour**
- Recalculate spotlight on scroll, not just resize.
- Add Esc-to-skip keyboard handler.
- Ensure tour does not start if the user lands on a non-sidebar route first.

**Learning drawer (Mentor)**
- Cache last brief per route for 60s to avoid re-fetching on every open.
- Add loading skeleton instead of blank tab.
- Show error state with retry when the AI Gateway fails.

**Notifications + task aging**
- Debounce the 20s poll when the tab is hidden (pause + resume on focus).
- Cap chase emails at one per stakeholder per advance to avoid inbox spam.
- Add a "Mark all read" affordance on the bell popover.

## Phase 2 — New Arc: Performance Review & Team Dynamics

A recurring "review moment" that closes the feedback loop on coordinator behaviour.

**Performance Review**
- New table `performance_reviews` (instance_id, week_number, score_delivery, score_stakeholder, score_decision, narrative, created_at).
- Server fn `generatePerformanceReview` — runs when the user advances past a week boundary. Pulls task completion rate, average stakeholder sentiment, and decision quality (RAID closure rate) into a structured AI-generated review from the Programme Manager.
- New route `/app/reviews` — timeline of past reviews with score chips and narrative.
- Trigger surfaced in the time-advance dialog as a "Review available" banner.

**Team Dynamics**
- New table `team_relationships` (instance_id, stakeholder_a, stakeholder_b, tension_score, last_event).
- When two stakeholders have opposing sentiment toward the coordinator (e.g. one frustrated, one happy), generate a "team tension" story beat — e.g. Priya emails complaining about David's pushback.
- Surface on the Stakeholders page as a small "Team pulse" widget showing 1–2 active dynamics.

## Phase 3 — Bug Sweep

Playtest the full loop and fix anything broken.

- Drive Playwright through: project pick → intro → tour → first email → first task submit → status report → advance day → advance week → review.
- Capture screenshots at each step; log console errors and failed network requests.
- Fix anything that crashes, mis-renders, or blocks progression.
- Verify RLS on new tables from Phase 2; run the security scanner.
- Report findings with before/after screenshots for any visual fixes.

## Technical Details

- All new server fns use `requireSupabaseAuth` and live in `src/lib/*.functions.ts`.
- New tables follow the `active_project_instance_id` scoping pattern with GRANTs to `authenticated` + `service_role` and RLS policies that read `instance_id` against the user's active instance.
- Review generation uses Lovable AI Gateway (`google/gemini-2.5-flash`), structured output via Zod.
- Phase 3 Playwright scripts live under `/tmp/browser/sweep/` and use the injected Supabase session.

## Order of Operations

1. Ship Phase 1 in one batch, confirm working, then move on.
2. Ship Phase 2 schema + logic + UI, confirm working, then move on.
3. Run Phase 3 sweep last so it covers everything from Phases 1 and 2.
