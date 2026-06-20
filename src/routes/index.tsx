import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ListChecks, FileText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — A Coordinator's Diary" },
      {
        name: "description",
        content:
          "Atlas is an immersive workplace simulation. Stakeholders write in. Tasks pile up. Documents are reviewed. Every decision shapes the story.",
      },
      { property: "og:title", content: "Atlas — A Coordinator's Diary" },
      {
        property: "og:description",
        content: "Experience a project coordinator role before you ever get hired.",
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
          <span className="text-muted-foreground font-normal italic">A Coordinator's Diary</span>
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
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Chapter One · Northbridge Health
            </p>
            <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
              The project is{" "}
              <span className="italic text-primary">3 weeks</span> behind schedule.
              <br />
              You just opened your inbox.
            </h1>
            <p className="mt-4 max-w-xl font-display text-2xl text-muted-foreground">
              Welcome to your first day.
            </p>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Atlas is an immersive workplace simulation. Stakeholders write in. Tasks pile up.
              Documents are reviewed. Every decision shapes the story. Today you join Northbridge
              Health Services as Project Coordinator on the £500,000 Digital Care Records Rollout —
              moving 12 care homes off paper. Sarah Williams is your line manager. The sponsor is
              already asking questions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Start your first day <ArrowRight className="h-4 w-4" />
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
              From: Sarah Williams · Project Manager
            </div>
            <div className="mt-2 text-sm font-semibold">Subject: Governance Meeting Friday</div>
            <p className="mt-3 whitespace-pre-line font-display text-base leading-relaxed text-foreground/90">
              {`Hi,\n\nThe sponsor has requested an updated status report before Friday. Please prepare:\n\n• RAID Summary\n• Status Report\n• Stakeholder Update\n\nThanks,\nSarah`}
            </p>
          </aside>
        </section>

        <div className="my-16 h-px ink-rule" />

        <section id="how" className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Mail,
              title: "A real inbox",
              body:
                "Sarah, the sponsor, finance, the vendor, care-home managers. Each writes in character. Read carefully — they remember what you ignored.",
            },
            {
              icon: ListChecks,
              title: "Project tasks, not quiz questions",
              body:
                "Draft the Charter, the Stakeholder Register, the RAID Log, Status Reports. Move them To Do → In Progress → Submitted → Completed.",
            },
            {
              icon: FileText,
              title: "AI review, workplace-grade",
              body:
                "Upload your work as PDF, DOCX or XLSX. The AI panel scores clarity, completeness, professionalism and governance, and the story bends to the verdict.",
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
          Atlas · A Coordinator's Diary. Northbridge Health Services is fictional; the project work is real practice.
        </div>
      </footer>
    </div>
  );
}
