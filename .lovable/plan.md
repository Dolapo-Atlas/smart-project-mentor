## Delegation & Escalation System

Add a "Delegate or escalate" flow to the Inbox so the user isn't forced to personally answer every specialist question. They pick who handles it; that person replies in-thread, sentiment shifts realistically, and a system note appears in the inbox.

### UX

On any open inbox message, alongside the existing **Reply** button, add a **Delegate / Escalate** button that opens a panel with 4 options:

- **A. Reply personally** — existing flow (unchanged).
- **B. Ask Sarah Williams (PM) to respond** — available for any message.
- **C. Schedule a review meeting** — creates a draft meeting pre-filled with the sender + topic, jumps to `/app/meetings`.
- **D. Escalate to David Okafor (Sponsor)** — available for any message; intended for budget/scope/governance.
- **E. Assign to functional lead** — auto-routed by sender role:
  - finance (Priya) → Priya Anand herself responds with a Finance Lead artefact
  - tech (James) → James Lin
  - clinical (Rachel) → Rachel Stone
  - vendor (CareSoft) → CareSoft Account Director
  
  When the sender *is* the matching lead, "Assign to lead" is hidden and replaced with "Ask Sarah to coordinate".

Each choice shows a one-line preview of the likely outcome ("Sarah will take ownership but the sponsor will notice if you escalate too often").

### Behaviour per choice

A new server fn `delegateInboxMessage({ inbox_id, mode })` does the work:

1. Loads the original inbox message + simulation state + relationship with sender and with the delegate.
2. Generates an AI reply *from the delegate* to the original sender (in-thread style), grounded in project health, reputation, and what info the user has actually produced (latest status report RAG, open RAID, budget lines). Falls back to a deterministic template per (delegate, sender_role) pair if the model fails.
3. Inserts two `comms_messages` rows:
   - outbound from "coordinator" with body "Handing this to {Delegate} — please pick up.", `msg_type: "Request"`
   - inbound from delegate with the generated reply
4. Inserts an inbox message from the delegate so it shows up in the user's inbox.
5. Inserts a short **system note** inbox row (tone `neutral`, sender role `system`) like:
   - "Sarah Williams has taken ownership of this discussion."
   - "James Lin will provide a technical assessment by end of day."
   - "David Okafor has approved escalation to the Project Board."
6. Adjusts sentiment:
   - **Ask Sarah**: +2 sender, -1 Sarah per use, hard cap — third delegation in the same week to Sarah drops her sentiment by -8 ("you keep dumping things on me").
   - **Escalate to Sponsor**: +5 sender if the issue is genuinely budget/scope/governance (`msg_type === "Escalation"` or keywords match), otherwise -6 sponsor ("don't escalate trivia"). Always +3 reputation when justified, -5 when not.
   - **Assign to functional lead**: +4 sender (their concern went to the right specialist), neutral for delegate.
   - **Schedule meeting**: +3 sender, no sentiment change for others; user must actually run + send minutes for full credit (already wired).
7. Marks original inbox message read + records a `delegation_count` competency tick on `p2.escalation_routes` / `p2.managing_difficult_stakeholders`.

### Frontend changes

- `src/routes/_authenticated/app.inbox.tsx`:
  - Add `<DelegatePanel />` next to the existing reply UI.
  - Use `useMutation` calling the new `delegateInboxMessage` server fn; on success invalidate `inbox`, `comms`, `stakeholders`, `overview`, `next-action`, toast "Sarah Williams has taken ownership."
- New component `src/components/delegate-panel.tsx` rendering the 4-5 option cards with the preview hint and a confirm button per option.
- For **Schedule meeting**, call existing `createMeeting` server fn (already in `pm.functions.ts`) with prefilled attendees + topic, then `navigate({ to: "/app/meetings" })`.

### Backend changes

- `src/lib/pm.functions.ts`: add `delegateInboxMessage` server fn with the logic above. Reuses `ARCHETYPE_SENTIMENT`, `STAKEHOLDERS` (import from comms), and the same Lovable AI gateway model used elsewhere. Track per-week Sarah-delegation count by reading recent system notes (no schema change needed).
- `src/lib/sim.functions.ts`: extend the inbox type to include a `system_note` flag; existing schema already has `tone` — use a new tone literal `"system"` (purely a UI hint, no migration required since `tone` is text).

### Out of scope

- No new tables; everything fits into existing `inbox_messages`, `comms_messages`, `stakeholder_relationships`. No migration needed.
- No changes to landing page, RAID, learning, or auth.
