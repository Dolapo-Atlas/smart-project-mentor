import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ListChecks, FileText, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — A Coordinator's Diary" },
      {
        name: "description",
        content:
          "Experience the workplace before you're in it. Atlas is an immersive project-coordination simulation — request early access.",
      },
      { property: "og:title", content: "Atlas — A Coordinator's Diary" },
      {
        property: "og:description",
        content: "Experience the workplace before you're in it.",
      },
    ],
  }),
  component: Landing,
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  desired_role: z.string().trim().min(1, "Tell us the role you want").max(100),
});

const SCREENSHOTS: Array<{ title: string; caption: string; body: React.ReactNode }> = [
  {
    title: "Inbox — Tuesday, 08:42",
    caption: "A real inbox. Stakeholders write in character.",
    body: (
      <div className="space-y-3 text-left">
        {[
          { from: "Margaret Chen — Sponsor", subj: "Re: Friday status report", tone: "Amber" },
          { from: "Raj Patel — PMO", subj: "RAID log overdue", tone: "Red" },
          { from: "CareSoft Vendor", subj: "Integration spec — questions", tone: "Green" },
          { from: "Rachel Okafor — Governance", subj: "Charter sign-off pending", tone: "Amber" },
        ].map((m) => (
          <div key={m.subj} className="flex items-start justify-between rounded-md border border-border/60 bg-background/60 p-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.from}</div>
              <div className="font-display text-sm text-foreground">{m.subj}</div>
            </div>
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {m.tone}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Tasks — Week 3, Planning",
    caption: "Project tasks, not quiz questions.",
    body: (
      <div className="grid grid-cols-3 gap-3 text-left">
        {[
          { col: "To Do", items: ["Stakeholder Register", "Risk Workshop prep"] },
          { col: "In Progress", items: ["Project Charter v2", "RAID Log refresh"] },
          { col: "Submitted", items: ["Status Report W2"] },
        ].map((c) => (
          <div key={c.col} className="rounded-md border border-border/60 bg-background/60 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.col}</div>
            <div className="space-y-2">
              {c.items.map((t) => (
                <div key={t} className="rounded border border-border/50 bg-card p-2 text-xs text-foreground">{t}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "AI Review — Status Report",
    caption: "Workplace-grade AI feedback on every deliverable.",
    body: (
      <div className="space-y-3 text-left">
        {[
          { k: "Clarity", v: 82 },
          { k: "Completeness", v: 68 },
          { k: "Professionalism", v: 91 },
          { k: "Governance", v: 57 },
        ].map((s) => (
          <div key={s.k}>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{s.k}</span>
              <span className="tabular-nums text-foreground">{s.v}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-border/60">
              <div className="h-full bg-primary" style={{ width: `${s.v}%` }} />
            </div>
          </div>
        ))}
        <p className="pt-2 text-xs italic text-muted-foreground">
          "Strong tone, but the risk section omits mitigation owners. Sponsor will press on this Friday."
        </p>
      </div>
    ),
  },
];

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
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Now accepting early access
            </p>
            <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
              Experience the workplace{" "}
              <span className="italic text-primary">before</span> you're in it.
            </h1>
            <p className="mt-4 max-w-xl font-display text-2xl text-muted-foreground">
              The project is 3 weeks behind. You just opened your inbox.
            </p>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Atlas is an immersive workplace simulation for project coordinators.
              Stakeholders write in. Tasks pile up. Documents are reviewed.
              Every decision shapes the story.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#early-access"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Request early access <ArrowRight className="h-4 w-4" />
              </a>
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
              From: Your Project Manager
            </div>
            <div className="mt-2 text-sm font-semibold">Subject: Governance Meeting Friday</div>
            <p className="mt-3 whitespace-pre-line font-display text-base leading-relaxed text-foreground/90">
              {`Hi,\n\nThe sponsor has requested an updated status report before Friday. Please prepare:\n\n• RAID Summary\n• Status Report\n• Stakeholder Update\n\nThanks,\nYour PM`}
            </p>
          </aside>
        </section>

        <div className="my-16 h-px ink-rule" />

        <section id="screenshots" className="mb-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">A look inside</p>
              <h2 className="mt-2 font-display text-3xl font-medium tracking-tight md:text-4xl">
                What a day in Atlas looks like
              </h2>
            </div>
          </div>
          <Carousel opts={{ loop: true }} className="mx-auto max-w-4xl px-12">
            <CarouselContent>
              {SCREENSHOTS.map((s) => (
                <CarouselItem key={s.title}>
                  <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                      <span className="ml-3 text-xs text-muted-foreground">{s.title}</span>
                    </div>
                    <div className="p-6">{s.body}</div>
                  </div>
                  <p className="mt-3 text-center text-sm italic text-muted-foreground">{s.caption}</p>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <section id="how" className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Mail,
              title: "A real inbox",
              body:
                "Managers, sponsors, finance, vendors, end users. Each writes in character. Read carefully — they remember what you ignored.",
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

        <div className="my-16 h-px ink-rule" />

        <EarlyAccessSection />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          Atlas · A Coordinator's Diary. The companies and projects are fictional; the work is real practice.
        </div>
      </footer>
    </div>
  );
}

function EarlyAccessSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ name, email, desired_role: role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("early_access_signups").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setDone(true);
    setName("");
    setEmail("");
    setRole("");
  }

  return (
    <section id="early-access" className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Early access</p>
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight md:text-4xl">
          Get on the list. Start your first day.
        </h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          We're onboarding aspiring coordinators, PMs and analysts in small cohorts.
          Tell us the role you're aiming for and we'll send your invitation.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {done ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <h3 className="font-display text-2xl">You're on the list.</h3>
            <p className="text-sm text-muted-foreground">
              We'll be in touch shortly with your invitation to your first day at Atlas.
            </p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ea-name">Name</Label>
              <Input id="ea-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" maxLength={100} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ea-email">Email</Label>
              <Input id="ea-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" maxLength={255} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ea-role">Desired role</Label>
              <Input id="ea-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Project Coordinator" maxLength={100} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Your First Day <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <p className="text-xs text-muted-foreground">
              By submitting you agree to receive an invitation email. No spam.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
