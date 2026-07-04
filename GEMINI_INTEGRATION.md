# Atlas × Google Gemini — Integration Case Study

**Atlas** is a workplace project-management simulation. Learners run a real
12-chapter project (Digital Care Records rollout) — managing stakeholders,
budgets, risks, and status reports — and are graded on the outcome.

Google Gemini powers the parts of Atlas that must feel alive.

---

## What Gemini does in Atlas

| Feature | Gemini role |
|---|---|
| **AI Stakeholder Conversations** | Generates every reply from stakeholders (sponsor, finance, clinical lead, vendor, care-home ops) in-character, using the full email thread, project phase, and evidence the learner has submitted. |
| **AI Mentor ("Ask Atlas")** | A floating coaching panel that has full read-only awareness of the learner's project state (inbox, tasks, RAID, reputation, health, decisions, evidence) and coaches without writing deliverables. |
| **Real-time context** | Every prompt includes a compact snapshot of the workspace at that moment, so replies reference actual risks, people, and tasks — not generic PM theory. |
| **Structured output** | Stakeholder replies use Gemini's native `responseMimeType: application/json` + `responseSchema` so responses are guaranteed parseable. |

---

## Architecture

```
src/lib/
├── gemini.server.ts              # Single Gemini client (gemini-2.5-flash)
│                                 #  - generateGeminiText()
│                                 #  - generateGeminiJSON<T>()  (schema-enforced)
│                                 #  - isGeminiAvailable()
├── stakeholder-ai.server.ts      # In-character stakeholder replies (reusable)
├── mentor-ai.server.ts           # Coaching prompts + strict "coach, don't complete" rule
├── comms.functions.ts            # Uses Gemini in the stakeholder-reply fallback chain
└── mentor.functions.ts           # Uses Gemini for mentorBrief / mentorChat

src/routes/api/public/gemini-test.ts  # Health endpoint → { ok: true, reply: "pong" }
```

**Model:** `gemini-2.5-flash` via `@google/genai`.
**Key:** `GEMINI_API_KEY` stored as a server-only secret.

### Fallback chain (stakeholder replies)

1. Deterministic evidence-aware reply (unchanged governance UX)
2. **Gemini** via `generateStakeholderReply()`
3. Lovable AI gateway (`generateObject`)
4. Static reply library

The simulation never breaks. Reputation, scoring, tasks, and chapter
progression continue to work exactly as before.

---

## Why Gemini improves the learning experience

- **Personality over templates.** Static replies quickly feel canned; Gemini
  keeps Margaret (care-home ops) worried about residents, David (finance)
  focused on variance, and CareSoft (vendor) defending scope — turn after turn.
- **Grounded in the learner's own workspace.** The prompt includes what the
  learner actually did — attached documents, sent emails, logged risks — so
  the reply reacts to *their* project, not a generic scenario.
- **Coaching that scales.** The AI Mentor gives every learner a senior PM
  sitting next to them, without hand-holding them through the deliverable.
- **Safe by default.** Structured JSON output + a hard "never invent
  stakeholders / never write the learner's email for them" system rule keeps
  Gemini inside the simulation's guardrails.

---

## Production readiness

- [x] `GEMINI_API_KEY` stored as a server-only secret
- [x] Health endpoint returns `{ ok: true, model: "gemini-2.5-flash", reply: "pong" }`
- [x] All Gemini calls run inside TanStack `createServerFn` handlers (never client-side)
- [x] Full 4-tier fallback so a Gemini outage cannot break the simulation
- [x] Zero changes to database schema, existing routes, or user journey
- [x] Modular service layer — new features can call `generateGeminiText`,
      `generateGeminiJSON`, `generateStakeholderReply`, or
      `generateMentorAnswer` without duplicating client setup

---

## Verifying the integration

```bash
curl https://smart-project-mentor.lovable.app/api/public/gemini-test
# → {"ok":true,"model":"gemini-2.5-flash","reply":"pong"}
```

In-app: `/app/gemini` — user-facing summary of Gemini features.
