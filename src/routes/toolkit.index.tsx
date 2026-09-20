import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { AtlasMark } from "@/components/landing/atlas-chrome";
import { Button } from "@/components/ui/button";
import { GUIDES } from "@/lib/toolkit/content";
import { toolkitCta } from "@/components/toolkit/guide-page";

const TITLE = "Free Project Management Templates and Guides | Atlas Project Toolkit";
const DESCRIPTION =
  "Free, practical guides and templates for project coordinators: RAID log, project charter, project schedule and work breakdown structure. Worked examples, no sign-up.";

export const Route = createFileRoute("/toolkit/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolkitIndex,
});

function ToolkitIndex() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-semibold">
            <AtlasMark className="h-6 w-6" /> Atlas
          </Link>
          <a
            href={toolkitCta("toolkit-index")}
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Try the simulation
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Project toolkit</p>
        <h1 className="mt-3 font-display text-3xl font-medium leading-tight sm:text-4xl">
          Free project management guides and templates
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          The documents project coordinators are asked for in their first weeks, explained plainly,
          with worked examples from a real-shaped hospital rollout and blank templates you can copy.
          Nothing to sign up for.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <a
                href={`/toolkit/${g.slug}`}
                className="flex h-full flex-col rounded-3xl border border-surface-neutral-border bg-surface-neutral p-6 transition hover:-translate-y-0.5"
              >
                <h2 className="font-display text-xl font-medium">{g.h1}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/75">
                  {g.standFirst}
                </p>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {g.readMinutes} min · free template included
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
                  Read the guide <ArrowRight className="h-4 w-4" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <section className="mt-14 rounded-3xl border border-surface-orange-border bg-surface-orange p-6 sm:p-8">
          <h2 className="font-display text-2xl font-medium">
            Reading about it is not the same as doing it
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/80">
            Atlas is a simulation. You run a hospital records rollout as the project coordinator:
            stakeholders email you, documents get reviewed and challenged, and decisions have
            consequences you have to report at a steering committee.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href={toolkitCta("toolkit-index")}>
                Try the simulation free <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={toolkitCta("toolkit-index", "/challenge/friday-crisis")}>
                Try a 3-minute challenge first
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
