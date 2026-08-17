import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Mail, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectInitiationPack } from "@/components/dashboard/project-initiation-pack";
import { useFirstEmailGate } from "@/lib/use-first-email-gate";

type Props = {
  /** Shown when a locked module was opened instead of Home. */
  moduleName?: string;
};

/**
 * Day-one lock screen. The learner's first piece of work is the Project
 * Manager's email: open the Project Initiation Pack (proof they read it), then
 * reply. Until the reply is sent every other module shows this instead.
 * Presentation only — no project state is written here.
 */
export function FirstTaskGate({ moduleName }: Props) {
  const { gate, packOpened, markPackOpened } = useFirstEmailGate();
  const [packOpen, setPackOpen] = useState(false);
  const sender = gate?.welcomeSender ?? "your Project Manager";

  const steps = [
    { label: `Open the email from ${sender}`, done: !!gate?.welcomeRead },
    { label: "Open the Project Initiation Pack", done: packOpened },
    { label: "Send your response", done: !!gate?.replied },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-border bg-surface-cream p-8 shadow-sm sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-orange/40 bg-accent-orange/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-accent-orange">
          <Mail className="h-3.5 w-3.5" />
          First task
        </div>
        <h1 className="mt-5 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {sender} has emailed you.
        </h1>
        <p className="mt-3 text-muted-foreground">
          {moduleName ? (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Lock className="h-3.5 w-3.5" /> {moduleName}
              </span>{" "}
              opens once you&rsquo;ve answered your first email. On a real
              project nobody drafts a charter before speaking to the person who
              brought them onto the team.
            </>
          ) : (
            <>
              Read the message, open the Project Initiation Pack it points you
              to, then reply. The rest of the workspace unlocks the moment your
              response is sent.
            </>
          )}
        </p>

        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-start gap-3">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-medium text-muted-foreground">
                  {i + 1}
                </span>
              )}
              <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/app/inbox" search={{ onboarding: 1 }}>
              <Mail className="mr-2 h-4 w-4" />
              Open my inbox
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setPackOpen(true);
              markPackOpened();
            }}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Open Project Initiation Pack
          </Button>
        </div>
      </div>
      <ProjectInitiationPack open={packOpen} onOpenChange={setPackOpen} />
    </div>
  );
}
