import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/landing/atlas-chrome";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardTagChip,
} from "@/components/ui/card";
import {
  Target,
  Users,
  Workflow,
  ListChecks,
  Sparkles,
  Award,
  ArrowRight,
  FileText,
  Calendar,
  Users2,
  AlertTriangle,
  Mail,
  ClipboardList,
  ShieldCheck,
  Rocket,
  Handshake,
  Check,
  Bot,
  MessageSquareText,
  Pencil,
} from "lucide-react";

const PHASES = [
  "Initiation",
  "Planning",
  "Execution",
  "Monitoring & Control",
  "Go-Live",
  "Closure",
];

const ARTIFACTS = [
  { icon: FileText, label: "Project Charter" },
  { icon: ListChecks, label: "WBS" },
  { icon: Calendar, label: "Project schedule" },
  { icon: Users2, label: "Resource plan" },
  { icon: Mail, label: "Communication Plan" },
  { icon: AlertTriangle, label: "RAID items" },
  { icon: MessageSquareText, label: "Stakeholder requests" },
  { icon: Pencil, label: "Change requests" },
  { icon: ClipboardList, label: "Budget & performance" },
  { icon: ShieldCheck, label: "Status reports" },
  { icon: ShieldCheck, label: "Governance gates" },
  { icon: Rocket, label: "Testing & Go-Live" },
  { icon: Handshake, label: "Handover & closure" },
];

const OUTCOMES = [
  "Project deliverables they created",
  "AI and reviewer feedback",
  "Governance gate results",
  "Final project score",
  "Downloadable project artefacts",
  "A verifiable Atlas credential",
];

export function SimulationExplainer() {
  return (
    <section id="simulation" className="py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* Header */}
        <div className="max-w-3xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent-orange" />
              The Atlas Simulation
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-medium leading-[1.08] tracking-[-0.015em] text-foreground">
              What practising project work inside Atlas actually looks like
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Step into a realistic project role, work through the project lifecycle, make decisions,
              interact with stakeholders and produce the actual project work.
            </p>
          </Reveal>
        </div>

        {/* Bento grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 — Focus */}
          <Reveal delay={40}>
            <Card variant="soft" tone="navy" className="h-full">
              <CardHeader>
                <CardTagChip tone="navy">Focus</CardTagChip>
                <CardTitle className="mt-3 font-display text-xl">Practical project delivery</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Practise planning, stakeholder management, communication, risk, governance and
                  decision-making across a connected project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Atlas helps learners understand how scope, schedule, resources, budget, risk and
                  stakeholder communication affect one another.
                </p>
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-surface-navy-border bg-background/50 px-4 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-navy text-navy-foreground">
                    <Target className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">Connected, end-to-end project practice</span>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Card 2 — Built for */}
          <Reveal delay={80}>
            <Card variant="soft" tone="cream" className="h-full">
              <CardHeader>
                <CardTagChip tone="cream">Built for</CardTagChip>
                <CardTitle className="mt-3 font-display text-xl">People who know the theory and want somewhere to apply it</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-foreground">Suitable for:</p>
                <ul className="mt-3 space-y-2">
                  {[
                    "Project Management students and graduates",
                    "Aspiring Project Coordinators and PMO professionals",
                    "Career changers moving into project roles",
                    "Universities and training providers looking to add practical simulation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-surface-cream-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          {/* Card 3 — Your simulation experience */}
          <Reveal delay={120}>
            <Card variant="soft" tone="orange" className="h-full">
              <CardHeader>
                <CardTagChip tone="orange">Your simulation experience</CardTagChip>
                <CardTitle className="mt-3 font-display text-xl">Step into the project</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  You join a realistic project in a defined workplace role and work through the
                  lifecycle from initiation to closure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-1 flex items-center gap-2 overflow-x-auto pb-2 atlas-no-scrollbar">
                  {PHASES.map((phase, i) => (
                    <span key={phase} className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full border border-surface-orange-border bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground">
                        {phase}
                      </span>
                      {i < PHASES.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-surface-orange-accent" />
                      )}
                    </span>
                  ))}
                </div>
                <ul className="mt-5 space-y-2">
                  {[
                    "Stakeholders contact you.",
                    "New information emerges.",
                    "Risks and issues develop.",
                    "Decisions affect what happens next.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-surface-orange-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          {/* Card 4 — What you actually do (wide) */}
          <Reveal delay={160} className="md:col-span-2 lg:col-span-2">
            <Card variant="soft" tone="neutral" className="h-full">
              <CardHeader>
                <CardTagChip tone="neutral">What you actually do</CardTagChip>
                <CardTitle className="mt-3 font-display text-xl">Do the work, not just read about it</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Depending on the simulation, learners produce real project artefacts as the story unfolds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {ARTIFACTS.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 transition-colors hover:border-accent-orange/40"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-accent-orange" />
                      <span className="text-xs font-medium leading-tight text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm font-medium text-foreground">
                  These artefacts are produced as part of a live simulated project — not downloaded from a template library.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          {/* Card 5 — How Atlas responds */}
          <Reveal delay={200}>
            <Card variant="soft" tone="lilac" className="h-full">
              <CardHeader>
                <CardTagChip tone="lilac">How Atlas responds</CardTagChip>
                <CardTitle className="mt-3 font-display text-xl">The simulation reacts to the way you work</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    { icon: MessageSquareText, text: "AI stakeholders respond to your communication and decisions." },
                    { icon: ShieldCheck, text: "Deliverables are reviewed in the context of the current simulation." },
                    { icon: Pencil, text: "Where work needs improvement, you get contextual feedback and can revise." },
                    { icon: Bot, text: "Atlas Mentor can guide your thinking without completing the work for you." },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-surface-lilac-accent" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          {/* Card 6 — What you leave with */}
          <Reveal delay={240}>
            <Card variant="soft" tone="green" className="h-full">
              <CardHeader>
                <CardTagChip tone="green">What you leave with</CardTagChip>
                <CardTitle className="mt-3 font-display text-xl">Your work stays with you</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {OUTCOMES.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-surface-green-accent" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs italic leading-relaxed text-muted-foreground/80">
                  The goal is not only to finish the simulation. It is to leave with evidence of the work you actually practised.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          {/* Closing CTA banner */}
          <Reveal delay={280} className="md:col-span-2 lg:col-span-2">
            <Card variant="soft" tone="navy" className="h-full">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="max-w-md">
                  <div className="flex items-center gap-2 text-accent-orange">
                    <Award className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Ready to practise?</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-foreground">
                    Learn the framework. Practise the judgement.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Atlas gives you somewhere to practise project work before you are expected to perform it in the real world.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="group inline-flex items-center gap-2 rounded-full bg-accent-orange px-5 py-2.5 text-sm font-medium text-accent-orange-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5"
                  >
                    Start your simulation
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="#how"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card"
                  >
                    See how Atlas works
                  </a>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
