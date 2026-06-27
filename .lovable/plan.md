## Goal
Every simulation gets its own cast — unique random names + titles fitting that project's domain, with persona avatars. No more "Margaret Hollis (Care Home Manager)" showing up in the CRM project.

## What ships

### 1. Per-template roster (data)
Add a `stakeholders jsonb` column to `project_templates`. Each template gets 7 roles with project-appropriate random names + titles + persona seeds:

| Role | CRM Implementation | Website Redesign | Office Relocation | EV Charging | Product Launch | Digital Care Records |
|---|---|---|---|---|---|---|
| pm | Emma Collins — Programme Manager | (same role pattern across all) | | | | |
| sponsor | Marcus Hale — Chief Revenue Officer | Lena Park — VP Marketing | Daniel Reeve — COO | Aisha Bello — Director of Infrastructure | Jordan Pike — Chief Product Officer | David Okafor — Executive Sponsor |
| finance | Priya Anand — Finance Lead (kept consistent — finance always Priya) | | | | | |
| tech | Ravi Shah — CRM Solutions Architect | Mei Tanaka — Lead Frontend Engineer | Tom Becker — IT Infrastructure Lead | Henrik Olsen — Charging Systems Engineer | Sofia Marín — Platform Lead | James Lin — Technical Lead |
| ops/domain1 | Hannah Briggs — Sales Operations Lead | Olu Adeyemi — UX Research Lead | Clara Voss — Facilities Manager | Ife Lawal — Site Acquisition Manager | Theo Ranjit — Go-to-Market Lead | Margaret Hollis — Care Home Manager |
| domain2 | Liam Doyle — CRM Admin | Yuki Sato — Brand Designer | Priscilla Owen — HR Business Partner | Marco Conti — Grid Compliance Officer | Nadia Roche — Customer Insights Lead | Rachel Stone — Clinical Governance Lead |
| vendor | Saleforce-style: "Helio CRM (Vendor)" | "PixelForge Studio (Vendor)" | "Hartwell Movers (Vendor)" | "VoltaGrid Ltd (Vendor)" | "Northbeam Agency (Vendor)" | CareSoft Ltd |

Names will be slightly randomized at seed time so two users on the same template still see the same cast (deterministic per template), but different templates have entirely different casts.

### 2. Runtime roster resolver
New `src/lib/roster.ts`:
- `DEFAULT_ROSTER` (Digital Care Records — current names, no behavior change for existing data)
- `rosterFromTemplate(template)` returns `{role, name, title, archetype}[]`
- `getActiveRoster(supabase, userId)` server helper that joins `profiles.current_project_instance_id → project_instances.template_id → project_templates.stakeholders`, falls back to DEFAULT_ROSTER.

### 3. Refactor call sites
Replace static `import { STAKEHOLDERS }` with roster lookup in:
- **Server fns**: `pm.functions.ts`, `comms.functions.ts`, `delegate.functions.ts`, `sim.functions.ts`, `tasks.functions.ts`, `raid.functions.ts` — accept resolved roster, no hardcoded names in prompts.
- **UI**: `app.comms.tsx`, `app.raid.tsx`, `app.settings.tsx`, `delegate-panel.tsx`, `stakeholder-card.tsx`, `app.inbox.tsx` — fetch roster via new `useRoster()` query hook.
- **Sentiment/archetype maps** keyed by role instead of by name so they survive name changes.

### 4. Persona avatars
`stakeholder-avatar.tsx` already uses DiceBear notionists with a `seed`. Update it to:
- Accept optional `seed` prop (falls back to name slug).
- Roster entries carry a stable `persona_seed` (e.g. `crm-sponsor-marcus-hale`), giving each cast member a distinct illustrated face that stays consistent within a project but differs across projects.
- Role still drives the ring colour.

### 5. Migration + reseed
One migration to:
- Add `stakeholders jsonb` to `project_templates`.
- Update all 6 templates' `stakeholders`, `pm_name`, `sponsor_name`, `sponsor_role` to the project-specific cast above.
- Backfill existing `project_instances` (none of those rows store the roster; resolver reads from template at runtime, so nothing else to migrate).

## Out of scope (this round)
- Renaming people inside *already-sent* inbox messages or comms (historical data keeps old names).
- Per-user randomization (different users see the same cast for the same template — keeps the sim shareable/testable).

## Risks
- Existing comms/inbox rows reference old names like "Margaret Hollis". They'll continue to display correctly — only *new* AI-generated content uses the new roster. If you want a clean slate per project, start a new project instance after this ships.

## Technical notes
- All sentiment/archetype maps re-keyed from name → role to stop carrying healthcare baselines into other sims.
- AI prompts will receive the roster as a "Cast of stakeholders" block, so the model never invents names from a different domain.
- Vendor entries continue to use organisation names (not personal names) since that matches how vendors actually email.
