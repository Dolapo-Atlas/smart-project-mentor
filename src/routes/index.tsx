import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ListChecks, FileText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — Project Coordinator Simulator" },
      {
        name: "description",
        content:
          "Step into the chair of a project coordinator. Read stakeholder mail, manage tasks, ship documents, and watch an AI grade your every move.",
      },
      { property: "og:title", content: "Atlas — Project Coordinator Simulator" },
      {
        property: "og:description",
        content: "An AI-driven simulation of life as a project coordinator.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground paper-texture">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-xl font-semibold tracking-tight">
          Atlas <span className="text-primary">/</span>{" "}
          <span className="text-muted-foreground font-normal italic">a coordinator's diary</span>
        </div>
        <Link
          to="/auth"
          className="rounded-md border border-foreground/20 bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/85"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Chapter One
            </p>
            <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
              The project is{" "}
              <span className="italic text-primary">already</span> behind.
              <br />
              You just opened your inbox.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Atlas is a writing-room simulation of a cross-functional project. Stakeholders write
              in. Tasks pile up. You upload documents — an AI panel grades them — and the story
              moves on, for better or worse.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Begin the simulation <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                How it plays
              </a>
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Field journal · Day 1
            </div>
            <p className="mt-3 font-display text-xl leading-snug">
              "Engineering wants scope cut. Design wants more time. Finance wants both, yesterday.
              I haven't even finished my coffee."
            </p>
            <div className="mt-4 text-sm text-muted-foreground">— You, in about ten minutes.</div>
          </aside>
        </section>

        <div className="my-16 h-px ink-rule" />

        <section id="how" className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Mail,
              title: "Stakeholder mail",
              body:
                "AI-driven stakeholders write with their own agendas. Read carefully — they remember what you ignored.",
            },
            {
              icon: ListChecks,
              title: "A task list that judges you",
              body:
                "Triage, prioritize, ship. Completed tasks nudge the project forward. Stalled ones echo back through the inbox.",
            },
            {
              icon: FileText,
              title: "Documents on trial",
              body:
                "Upload a brief, a plan, a memo. An AI review panel scores it 0–100, and the story bends to the verdict.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          Atlas is a fictional simulation. No real stakeholders were harmed.
        </div>
      </footer>
    </div>
  );
}
