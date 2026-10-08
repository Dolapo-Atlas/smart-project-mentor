import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  BarChart3,
  HeartHandshake,
  Repeat,
  Clock,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/landing/atlas-chrome";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardTagChip } from "@/components/ui/card";

const PROFESSIONS = [
  {
    icon: Briefcase,
    name: "Project Management",
    live: true,
    description:
      "Run realistic projects end to end — respond to stakeholders, write the real deliverables, sit through governance and live with your decisions.",
    detail: "Digital Care Records, CRM Implementation and Office Relocation are running now.",
  },
  {
    icon: BarChart3,
    name: "Business Analysis",
    live: false,
    description:
      "Elicit requirements, interrogate processes and turn unclear stakeholder needs into specifications the business can act on.",
    detail: "Requirements and process-change scenarios are in development.",
  },
  {
    icon: HeartHandshake,
    name: "Change Management",
    live: false,
    description:
      "Guide people through change — resistance, adoption, communication plans and the human side of every transformation.",
    detail: "People-side change scenarios are in development.",
  },
  {
    icon: Repeat,
    name: "Scrum Mastery",
    live: false,
    description:
      "Facilitate sprints, unblock teams, manage product backlogs and protect delivery when the pressure rises.",
    detail: "Agile delivery simulations are in development.",
  },
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
              The Atlas professions
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-medium leading-[1.08] tracking-[-0.015em] text-foreground">
              The professions Atlas will run
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Each profession is a full Atlas simulation — realistic projects, real stakeholders and
              real deliverables. Project Management is live today; more professions are on the way.
            </p>
          </Reveal>
        </div>

        {/* Profession cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROFESSIONS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.name} delay={40 + i * 70}>
                <Card
                  variant="soft"
                  tone={p.live ? "navy" : "cream"}
                  className={`h-full ${p.live ? "border-accent-orange/40 ring-1 ring-accent-orange/25" : ""}`}
                >
                  <CardHeader>
                    <CardTagChip tone={p.live ? "navy" : "cream"}>
                      {p.live ? "Live now" : "Coming soon"}
                    </CardTagChip>
                    <CardTitle className="mt-3 flex items-center gap-2.5 font-display text-xl">
                      <Icon className={`h-5 w-5 shrink-0 ${p.live ? "text-accent-orange" : "text-muted-foreground"}`} />
                      {p.name}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {p.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    {p.live ? (
                      <Link
                        to="/auth"
                        search={{ mode: "signup" }}
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-orange px-5 py-3 text-sm font-medium text-accent-orange-foreground transition-all hover:-translate-y-0.5"
                      >
                        Create your account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {p.detail}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
