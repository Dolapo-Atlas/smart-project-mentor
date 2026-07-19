## Goal

Make the landing page hero "come alive" like the uploaded reference — a layered product mockup with floating UI cards, subtle motion, and a stronger sense of a real, working workspace. Landing-page only. No changes to auth, app routes, backend, or scoring.

## What the reference shows (and what we're missing)

The reference hero is a **composed scene**, not a single card:
1. A macOS-chrome "browser window" showing a mini Atlas dashboard (navy sidebar with Home/Inbox/Tasks/People/Charter/Kick-off + Phase card + "Powered by Google Gemini" footer, and a **"Recommended Next Step"** hero card with orange progress + "Start task").
2. A floating **Inbox popover** overlapping the top-right (Margaret Chen / James Lin / Sarah Williams).
3. A floating **"Task in Progress"** card overlapping the bottom-left (progress bar, chips, avatar).
4. A floating **"RAID Log · Summary"** card overlapping the bottom-right (donut chart + legend).
5. Soft dotted texture on the right, gentle float/parallax, all in the cream + navy + orange palette we already own.

Today's hero has one flat `HeroInbox` card. That's the gap.

## Plan (frontend-only, hero + nav polish)

### 1. Replace `HeroInbox` with a new `HeroStage` composition
File: `src/routes/index.tsx` (swap the `<HeroInbox />` usage), new file `src/components/landing/hero-stage.tsx`.

Structure:
- **Base layer** — browser-chrome frame (reuse traffic-light dots) containing a *miniature* of the real Atlas dashboard:
  - Left: condensed navy sidebar (Atlas mark, Home/Inbox/Tasks/People/Charter/Kick-off tiles with the same neutral-tile + orange-icon treatment we already ship, Phase card, "Powered by Google Gemini" chip).
  - Right: greeting line ("Good afternoon, Dolapo."), time-control chips (Next Day / Next Week / Begin Sprint / Steering Committee / Go-Live), a **Recommended Next Step** card (navy body, orange progress, white "Start task" pill), a compact Kanban strip (To Do / In Progress / Pending Review / Completed).
  - All static markup — no data fetching, no functional buttons. Purely a visual mirror of the real dashboard.
- **Floating layer** (absolutely positioned over the frame):
  - Top-right: **Inbox popover** — 3 messages, "5 new" chip, "View all messages →" footer. Gentle float animation (staggered from the frame).
  - Bottom-left: **Task in Progress** card — "Update Project Charter · Technical Milestones", Documentation/Critical/Ch.2 chips, 52% progress bar, "Due this week · James Lin".
  - Bottom-right: **RAID Log · Summary** card — SVG donut (Risks 12 / Actions 10 / Issues 6 / Decisions 4) with legend. Donut built as a single SVG with 4 arcs, no chart lib.
- **Ambient layer** — retain the existing radial-gradient wash + add a subtle dotted pattern (CSS `radial-gradient` dots) on the far right, matching the reference.

### 2. Motion (tasteful, not busy)
- Reuse the existing `Reveal` intersection helper for enter animation.
- Each floating card gets its own slow `float` keyframe with different phase/duration (6s / 8s / 10s) so they drift independently.
- On pointer-move over the stage (desktop only), apply a very small parallax translate (±4px) to the three floating cards using `requestAnimationFrame`. Disabled under `prefers-reduced-motion` and on touch.
- One subtle "typing" shimmer on the Recommended Next Step progress bar (loop 0→11%→0 over ~6s), echoing `AutoDemo` energy.

### 3. Responsive behaviour
- ≥ lg: full composed scene as described.
- md: hide the RAID donut card, keep Inbox + Task cards, shrink frame.
- < md: show only the browser frame with the Recommended Next Step card; floating cards collapse into a single stacked "peek" below the frame so mobile stays legible (matches current hero footprint).

### 4. Nav polish to match reference
- Add an "About" and "FAQ" hover underline treatment (already links, just visual).
- Keep everything else identical.

### 5. Small copy nudge (optional, one line)
Reference eyebrow reads "Now accepting Founder Access" with a live orange dot — we already have this exact treatment. No copy changes.

## What stays untouched

- All auth, `/app/*`, backend, server functions, templates, scoring, AI, task logic.
- Everything below the hero on the landing page (`SocialProof`, `AutoDemo`, `Features`, `HowItWorks`, `Experience`, `WhyAtlas`, `Founder`, `Faq`, `SiteFooter`) — untouched.
- Color tokens in `src/styles.css` — untouched. Cream bg, navy, orange accent, semantic tokens only.
- `HeroInbox` component — deleted after `HeroStage` replaces it (it's only used in the hero).

## Files touched

- `src/routes/index.tsx` — swap `<HeroInbox />` for `<HeroStage />`, remove `HeroInbox` definition.
- `src/components/landing/hero-stage.tsx` — new; composed scene + floating cards + donut SVG + motion.

That's it. Fully additive, reversible, and matches the reference structure without pulling in real product data.
