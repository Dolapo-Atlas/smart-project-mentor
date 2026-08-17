# Fact integrity audit: initiation to closure

## What actually caused the sponsor's wrong budget email

That email was not a one-off typo. Confirmed by reading the code: each AI generator builds its own prompt, and only three of them receive the canonical figures block (`stakeholder-ai.server.ts`, `mentor-ai.server.ts`, `comms.functions.ts`). Every other generator that writes learner-facing prose still gets no authoritative numbers, so the model fills gaps with invented ones. Same class of error, different surfaces:

- `sim.functions.ts` — stakeholder message generation, chase-up follow-ups, PMO deliverable review
- `pm.functions.ts` — sponsor status-report feedback, change requests, phase gate reviews, meeting dialogue, meeting minutes, action extraction, "stir the pot" conflict emails
- `tasks.functions.ts` — submission review, stakeholder task generation
- `submission.functions.ts` — contextual quality scoring
- `reviews.functions.ts`, `mentor.functions.ts` — review and briefing generation

Second confirmed gap: the canonical facts file covers one project only. `PROJECT_FACTS` hardcodes £1,200,000 / 120 days, but the database holds six playable templates (digital-care-records, crm-implementation, website-redesign, office-relocation, new-product-launch, ev-charging-network) with different sponsors, PMs, stakeholder counts and durations — and no budget stored at all. So in the CRM or EV simulations the injected "authoritative" budget is the wrong project's number.

Third confirmed gap: figures are duplicated as literal strings instead of read from one source, so they drift silently. Found: the landing page says "6 months · 12 sites", `PROJECT_FACTS.durationDays` says 120 days, a seeded budget line says "12 sites x 12 months", and the Initiation Pack repeats "£1,200,000" and "£1.2 million" as text in three places.

## How we fact-check the whole simulation

### 1. One fact registry per project template
Extend the canonical facts module so every playable template has its own record: budget envelope and currency, duration and timeline wording, site/unit count, sponsor and PM names, key vendor, go-live date, stakeholder roster. Loaded by template slug, never hardcoded per screen. Where a value already lives in the database (duration, sponsor, PM, stakeholder count) the registry reads it rather than restating it.

### 2. Inject facts into every AI generator
Add the facts block to all prompts listed above, with the rule already used for stakeholder replies: quote these figures exactly, never convert currency, never invent a number, and say where to confirm instead of guessing. This closes the class of error rather than one email.

### 3. Automated fact-check suite — the actual answer to "how many are left"
An admin fact-check run that exercises each generator with scripted prompts across all four phases (initiation, planning, execution, closure) and validates output against the registry:

- money mentioned that is not the template budget or a real budget line
- any currency other than the project's currency
- dates or durations outside the template timeline
- stakeholder or vendor names not on the roster
- unresolved placeholders such as `[Name]` or `[Coordinator's Name]`
- site/unit counts that contradict the registry

Runs are stored in the existing eval tables (`ai_eval_runs` / `ai_eval_results`) so each run is comparable over time.

### 4. Fact-check panel on the admin tracking page
Latest run at a glance: pass rate per generator, failing samples with the offending text highlighted, and a "run check" button. This is how you count remaining errors instead of discovering them mid-play.

### 5. Live content audit of what learners already received
A read-only scan of stored `inbox_messages`, `comms_messages`, `meetings`, `status_reports` feedback and `change_requests` for the same violations, so existing wrong messages are surfaced and countable. History is not auto-edited.

### 6. Unclear-step audit, phase by phase
Separate from factual errors: a walkthrough of each phase's expected steps against what the product actually asks the learner to do, flagging steps with no clear instruction, no completion signal, or a dead end. Delivered as a prioritised findings list; fixes only after you approve them.

## Order of work
1. Fact registry per template
2. Facts injected into every generator
3. Automated fact-check suite plus admin panel
4. Stored-content scan
5. Phase-by-phase unclear-step findings list

## Not changing
Simulation logic, scoring, stakeholder personalities, task flow, navigation, or the Atlas navy/cream/orange design language. Everything here is additive or read-only apart from the prompt injections and the registry.

## Technical notes
- `src/lib/project-facts.ts` becomes a slug-keyed registry with a `factsPromptFor(templateSlug, liveBudget)` helper; the existing `TOTAL_BUDGET` export stays as the DCR value so current imports keep working.
- Validators live as pure functions in a new `src/lib/fact-check.server.ts`, reused by both the generator suite and the stored-content scan.
- The suite runs as a server function behind the existing admin role check, writing to `ai_eval_runs` / `ai_eval_results`.