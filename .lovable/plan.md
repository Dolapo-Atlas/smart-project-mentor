# Atlas Soft Card System

Make the soft, tinted, rounded card the default Atlas card look everywhere — tinted surfaces derived from Atlas navy, orange, cream and green, generous radii, layered soft shadows, pill tag chips, and a footer action row with a circular arrow.

## Step 1 — Pick a direction first

Before any code changes, I capture the current dashboard card grid from the running app and generate three rendered card-grid directions. All three share the locked Atlas-tinted pastel palette; they differ in density, hierarchy, chip treatment, and motion register. You pick one, then I implement that exact composition.

## Step 2 — Tint tokens

Add a small set of soft surface tokens to `src/styles.css` (light and dark values) so tints theme correctly instead of being hardcoded pastels:

```text
--surface-navy / --surface-navy-foreground
--surface-orange / --surface-orange-foreground
--surface-cream  / --surface-cream-foreground
--surface-green  / --surface-green-foreground
--surface-lilac  / --surface-lilac-foreground   (derived from navy, cooler)
```

Each is mapped in `@theme inline` as `--color-surface-*` so `bg-surface-orange` works as a utility. Also add two elevation tokens (`--shadow-soft`, `--shadow-soft-lift`) for the resting and hover states.

## Step 3 — Card component variants

Upgrade `src/components/ui/card.tsx` from a single hardcoded style to a `cva` variant API, keeping the existing exports and default appearance backward compatible:

- `variant`: `default` (today's look), `soft` (tinted surface, borderless, soft shadow), `outline`
- `tone`: `neutral | navy | orange | cream | green | lilac`
- `interactive`: adds hover lift, press scale, focus-visible ring, and `cursor-pointer`

New sub-components in the same file family:

- `CardTagChip` — small pill chip that picks up the parent tone
- `CardAction` — footer row: label on the left, circular arrow button on the right

Because `Card` is used in only a handful of places plus feature components, existing call sites keep working untouched; the soft look is opted into per surface.

## Step 4 — Roll out globally

Apply the chosen direction across, in order:

1. Dashboard module/quick-action tiles and the summary strip
2. Project Initiation Pack tab content cards
3. RAID, Documents, Templates, Schedule/Gantt list and detail cards
4. Landing page feature and pricing grids
5. Profile, tracking, and certificate surfaces

Rollout is presentation-only: class names, tones, and the new chip/action pieces. No changes to queries, mutations, routing, scoring, simulation logic, access rules, or copy.

## Step 5 — Polish and verify

- Responsive: 1 column mobile, 2 tablet, 3 desktop; chips wrap; tap targets ≥ 44px
- Motion: staggered card entry, hover lift, press feedback, all respecting `prefers-reduced-motion`
- Accessibility: AA contrast checked on every tint in light and dark mode, visible focus rings, arrow buttons labelled
- Verify with a build plus screenshots of the dashboard, pack, and landing grids at mobile and desktop widths

## What stays untouched

Simulation engine, phase/readiness logic, task and artifact sync, RAID and Charter logic, inbox behaviour, AI reviewer and WBS gating, certificates and verification, Stripe pricing and access tiers, and all database schema.
