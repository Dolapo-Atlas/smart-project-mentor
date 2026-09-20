# Get Atlas found on Google

## Why this, and why now

The usage problem is visibility, not appetite. Measured over the last month: about 172 visitors (5–6 a day), 108 of them on the homepage. 31 accounts in total across three months, all recorded as "direct" traffic — no campaign or referral source at all.

Right now there is almost nothing for Google to show. Apart from the homepage, the Friday Crisis challenge and certificate pages, every page sits behind sign-in. The site has no robots file and no sitemap, so search engines are not even being told what exists.

Semrush search demand in the UK market shows where the opening is, and it lines up exactly with what Atlas already contains:

| What people search | Monthly searches | Competition |
| --- | --- | --- |
| raid log | 3,600 | moderate |
| what is a raid log | 590 | low |
| raid project management | 590 | low |
| project charter template | 480 | low |
| project charter | 1,300 | low |
| how to become a project coordinator with no experience | 20 | low |

(Source: Semrush, UK market. "project management simulation" itself gets only about 30 a month — nobody searches for the category, they search for the job problem in front of them.)

Atlas already has in-app templates for a RAID log, a project charter and a project schedule. Turning those into free public pages targets demand that exists, and each page has a natural next step into the simulation.

## What gets built

**1. A free public "Project toolkit" section**

Three guide pages to start, each one answering a real search and ending with a route into Atlas:

- **What is a RAID log?** — plain explanation of risks, assumptions, issues, dependencies, a worked example from the Digital Care Records project, a downloadable/copyable blank RAID log, and a link to practise it live in Atlas.
- **Project charter template** — what a charter is, what each section must say, a filled example, a blank template, and the guided charter builder as the "do it for real" step.
- **Project schedule and work breakdown structure** — how to break work down, why a schedule without task detail gets rejected, worked example, template.

Each page is public, indexable, mobile-first, uses the existing Atlas card styling, and carries its own title and description written around the search phrase. No sign-in required to read or use the template.

**2. A toolkit index page** linking all guides, reachable from the homepage and footer.

**3. Make the site crawlable**

- Add a robots file that allows crawling of public pages and keeps the signed-in app out.
- Add a sitemap listing the homepage, the challenge, the toolkit index and each guide.
- Keep the signed-in app and admin pages marked as not-for-search, as they already are.

**4. Close the measurement gap**

Traffic sources are currently invisible — every account reads as "direct". Add source tagging to the links used in guides and on the homepage so the tracking page can finally show where a signup came from, and make search-referred visits visible in the admin tracking view.

## What this does not change

No change to the simulation, phases, gates, scoring, stakeholder AI, certificates, pricing, payments, onboarding or authentication. The drop-off problem inside the simulation (19 started, 2 reached the charter) is real but is a separate piece of work — it is not touched here.

## Technical notes

- New public routes under `src/routes/`: `toolkit.tsx` (index), `toolkit.raid-log.tsx`, `toolkit.project-charter.tsx`, `toolkit.project-schedule.tsx`. SSR on (the default), no auth gate, each with its own `head()` carrying unique title, description, og and twitter tags.
- Guide content lives in a small data module (`src/lib/toolkit/`) so copy is editable in one place; page components render it with existing shadcn/soft-card primitives.
- Templates on guide pages reuse the existing template field definitions where practical, rendered in a public, no-persistence mode; no writes for anonymous visitors.
- `public/robots.txt` and `public/sitemap.xml` created; sitemap uses `https://atlassim.co` as the base.
- CTA links carry UTM parameters and flow into the existing `readCampaign()` / `learner_events` attribution, so `profiles.campaign` stops being empty.
- Add an `article` JSON-LD block per guide for richer search results.

## After this ships

Search results take a few weeks to appear. The honest measure of success is: homepage-plus-toolkit visitors rising above the current 5–6 a day, and signups arriving with a source other than "direct". Once there is traffic, fixing the mid-simulation drop-off becomes worth doing — and that is the next piece of work to plan.
