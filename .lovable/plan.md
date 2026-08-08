# Onboarding review and improvement plan

## Rating: 7/10

The current flow is: sign up -> onboarding form -> orientation -> project picker -> project intro (loader, "grab a coffee", brief) -> workspace home (brief sheet, first-email prompt, guided tour).

**What is working well**
- The "employee onboarding" framing is genuinely distinctive — it sells the simulation before any teaching happens.
- Orientation copy ("You're here to practise—not to be perfect") sets expectations honestly and reduces beginner anxiety.
- Role selection is short, and it can still be changed on the project picker until a project starts.
- First-time-task coaching (try it myself / guide me / show an example) is a strong differentiator.

**What is holding it back**
1. **Too many gates before the first real action.** Between orientation, the picker, a simulated loader, a "grab a coffee" screen, the brief sheet, the first-email prompt and the guided tour, a new learner clicks through six or more screens before doing anything that counts. Motivation peaks at signup and is being spent on theatre.
2. **A dead screen still exists.** `welcome.tsx` (Employee Portal loader, employee record card) can never be reached — the authenticated layout redirects `/welcome` to the project picker. It also still hardcodes "Project Coordinator", "12 chapters" and "first governance review in 4 days", so re-enabling it would contradict the learner's chosen role.
3. **No sense of place in the sequence.** No step indicator, no back button, no "what happens next" on the onboarding form, so learners cannot tell whether they are one step or five from starting.
4. **Orientation is one-way.** Nothing links back to it later; "How Atlas Works" only exists in that single moment.
5. **The form asks more than it uses.** Country is free text and is not used by the simulation yet, and the role helper text is long enough to be skipped.
6. **No re-entry story.** A learner who signs up, leaves mid-onboarding and returns gets no acknowledgement of where they stopped.

## Proposed improvements

**A. Compress the runway to the first action**
- Merge the project-intro simulated loader and the "grab a coffee" screen into one short pre-start screen with a single primary button.
- Show the brief sheet *or* the first-email prompt on arrival, never both; the inbox prompt becomes the default because it is the first scored action.
- Keep the guided tour, but trigger it from a persistent "Show me around" control instead of auto-opening on first load.

**B. Make the sequence legible**
- Add a light "Step 1 of 3 · Your details / Orientation / Your project" indicator across onboarding, orientation and the picker.
- Add a back link on orientation and the picker.
- Add one line to the onboarding form footer stating exactly what happens next.

**C. Fix the inconsistencies**
- Remove the unreachable `welcome.tsx` route and its redirect branch; the project intro already covers the same ground.
- Replace remaining hardcoded facts ("Project Coordinator", "12 chapters", "in 4 days") in onboarding copy with the learner's selected role and the real chapter/date values.

**D. Reduce the form to what earns its place**
- Keep first name, last name, preferred name and role. Make country optional with a short reason, or drop it.
- Shorten the role helper text to two lines and move the "you can change this until the project starts" detail next to the picker's change-role control.

**E. Add a re-entry acknowledgement**
- If a learner returns before finishing onboarding or before starting a project, greet them by name and resume at the step they left instead of restarting at the top.

## Technical notes
- Files affected: `src/routes/_authenticated/onboarding.tsx`, `orientation.tsx`, `project-intro.$templateId.tsx`, `app.projects.tsx`, `app.index.tsx`, `src/components/guided-tour.tsx`, `src/components/dashboard/first-email-prompt.tsx`, `project-brief-sheet.tsx`; delete `src/routes/_authenticated/welcome.tsx` and its redirect branch in `_authenticated/route.tsx`.
- Presentation and flow only. No changes to simulation logic, scoring, task/artifact reconciliation, phase gating or the database schema. `completeOnboarding` keeps writing both `role` and `career_goal`; if country leaves the form, the column stays as optional.
- Step indicator and re-entry logic read existing `profiles.onboarded` and project-instance state — no new columns.