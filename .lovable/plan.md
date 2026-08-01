## Goal

Find out where learners actually stop after signing in — with recorded events, not inference — before spending more on ads.

Today `getLearnerTracking` reconstructs the funnel from end-state tables (`profiles`, `project_instances`, `tasks`, `documents`, `project_charters`). That shows the residue of a stalled account but never the moment it stalled, so "stuck after sign-in" can't be diagnosed from current data.

## What gets built

**1. A first-session event trail**

New `learner_events` table: `user_id`, `event` (text), `project_instance_id` (nullable), `props` (jsonb), `campaign` (jsonb), `created_at`. RLS: users insert/select their own rows; admins select all via `has_role`; service_role full.

Events recorded (fire-and-forget, never blocking the UI):

```text
signed_in
onboarding_started
role_selected
project_created
brief_opened
brief_closed
first_email_prompt_shown
inbox_opened
first_reply_sent
first_task_completed
day_advanced
```

**2. Campaign attribution carried inward**

The first-touch campaign already persists in localStorage via `captureCampaign`/`readCampaign` in `landing-analytics.ts`. On the first event a user emits, that blob is written onto `profiles` (new `campaign jsonb` column) and stamped on each event. This lets the funnel be split paid vs organic.

**3. A real drop-off view on /admin/tracking**

Replace the inferred funnel with the recorded one:
- Step-by-step counts and the % lost at each step.
- Median time between consecutive steps (long gaps flag confusion, not abandonment).
- Filter by traffic source and by signup date range.
- Keep the existing per-learner table underneath, now showing "last event" and "stalled at" instead of guessed state.

**4. Mirror the key steps to GA4/Meta**

Extend `FunnelEvent` in `landing-analytics.ts` with the in-app steps so the ad platforms can optimise toward learners who actually start, not merely sign up.

## What is deliberately NOT touched

Simulation logic, task generation, scoring, AI reviewers, templates, phase gates, certificates, payments, the landing page, and `/project-readiness` all stay exactly as they are. This batch only adds observation.

## After the data lands

One week of events will say which of these it is, and the fix is different for each:
- They never get past the brief → the brief is too long.
- Brief closed, inbox never opened → the prompt isn't landing.
- Inbox opened, no reply sent → the reply UI isn't obvious.
- First task completed, then nothing → the second action is missing.

I'd hold ad spend increases until that's known.

## Technical notes

- One migration: `learner_events` table plus `profiles.campaign`, with GRANTs for `authenticated`/`service_role` and RLS policies in the same migration.
- New `src/lib/learner-events.functions.ts` (`recordLearnerEvent`, auth-gated) and a thin client helper `src/lib/learner-events.ts` that de-duplicates one-time events per user via localStorage so refreshes don't inflate counts.
- Call sites: `app.index.tsx` (brief open/close, first-email prompt), `app.inbox.tsx` (inbox opened, first reply), `onboarding.tsx` (role selected, project created), `time.functions.ts` (day advanced), and the auth callback (signed in).
- `getLearnerTracking` gains a second query against `learner_events` and returns both the recorded funnel and the existing inferred rows, so nothing on the page breaks during the transition.
