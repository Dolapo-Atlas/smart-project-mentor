import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { HowAtlasWorksDialog } from "@/components/onboarding/how-atlas-works-dialog";
import { ATLAS_SIGNATURE } from "@/lib/atlas-voice";
import { trackLearner } from "@/lib/learner-events";

export const Route = createFileRoute("/_authenticated/orientation")({
  head: () => ({
    meta: [
      { title: "Welcome to Atlas — Your first day" },
      {
        name: "description",
        content:
          "Atlas isn't a course. You'll receive emails, attend meetings and make decisions — in a safe place to practise before your first day on the job.",
      },
      { property: "og:title", content: "Welcome to Atlas — Your first day" },
      {
        property: "og:description",
        content:
          "A realistic workplace simulation where not knowing is expected. Practise before it counts.",
      },
    ],
  }),
  component: Orientation,
});

const LINES = [
  "Atlas isn’t a course.",
  "You’ll receive emails.",
  "You’ll attend meetings.",
  "You’ll make decisions.",
  "Sometimes you won’t know the answer.",
  "That’s intentional.",
];

function Orientation() {
  const navigate = useNavigate();
  const [howOpen, setHowOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background paper-texture">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent-orange/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl"
      />

      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="atlas-rise text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Orientation · Day one
        </div>

        <h1 className="atlas-rise atlas-rise-1 mt-5 font-display text-5xl font-medium tracking-tight md:text-6xl">
          Welcome to Atlas.
        </h1>

        <div className="atlas-rise atlas-rise-2 mt-8 space-y-2 text-lg leading-relaxed text-foreground/85 md:text-xl">
          {LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <p className="atlas-rise atlas-rise-3 mt-6 font-display text-2xl leading-snug tracking-tight md:text-3xl">
          You’re here to practise—
          <span className="text-accent-orange">not to be perfect.</span>
        </p>

        <p className="atlas-rise atlas-rise-3 mt-4 max-w-xl text-base text-muted-foreground">
          The safest place to make mistakes is before your first day on the job.
        </p>

        <div className="atlas-rise atlas-rise-4 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="rounded-xl px-8"
            onClick={() => {
              trackLearner("orientation_completed");
              navigate({ to: "/app/projects" });
            }}
          >
            Start My Simulation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            className="text-left text-sm font-medium text-foreground underline decoration-accent-orange decoration-2 underline-offset-4 hover:text-accent-orange"
          >
            How Atlas Works
          </button>
        </div>

        <p className="atlas-rise atlas-rise-4 mt-12 max-w-xl border-l-2 border-accent-orange/50 pl-4 text-sm italic text-muted-foreground">
          {ATLAS_SIGNATURE}
        </p>
      </main>

      <HowAtlasWorksDialog open={howOpen} onOpenChange={setHowOpen} />
    </div>
  );
}