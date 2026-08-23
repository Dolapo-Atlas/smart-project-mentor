import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Download,
  Linkedin,
  Loader2,
  Mail,
  Minus,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AtlasMark } from "@/components/landing/atlas-chrome";
import { ChallengeResultCard } from "@/components/challenge/challenge-result-card";
import { captureCampaign, initTrackers, readCampaign, track } from "@/lib/landing-analytics";
import {
  CHALLENGE_URL,
  DECISION_ONE,
  DECISION_ONE_FEEDBACK,
  DECISION_TWO,
  DECISION_TWO_FEEDBACK,
  DIMENSIONS,
  linkedInText,
  scoreChallenge,
  strongestDimension,
  tierFor,
  verdictFor,
  type D1,
  type D2,
  type ReplyFeedback,
} from "@/lib/challenge-friday";

const TITLE = "The 18:00 Friday Crisis | Atlas Challenge";
const DESCRIPTION =
  "Tuesday is launch day. It's 18:00 Friday and an email arrives. A 3-minute project decision challenge — no sign-up required.";

export const Route = createFileRoute("/challenge/friday-crisis")({
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
  component: FridayCrisis,
});

type Step = "landing" | "email" | "d1" | "d1feedback" | "twist" | "d2" | "results";

function FridayCrisis() {
  const [step, setStep] = useState<Step>("landing");
  const [d1, setD1] = useState<D1 | null>(null);
  const [d2, setD2] = useState<D2 | null>(null);

  useEffect(() => {
    initTrackers();
    if (typeof window !== "undefined") {
      captureCampaign(Object.fromEntries(new URLSearchParams(window.location.search)));
    }
    track("challenge_page_view", { challenge: "friday-crisis" });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const scores = d1 && d2 ? scoreChallenge(d1, d2) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <AtlasMark className="h-7 w-7" />
            <span className="font-display text-sm font-medium tracking-[0.3em]">ATLAS</span>
          </Link>
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Atlas Challenges
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
        {step === "landing" && (
          <Landing
            onStart={() => {
              track("challenge_started", { challenge: "friday-crisis" });
              setStep("email");
            }}
          />
        )}

        {step === "email" && <EmailScreen onNext={() => setStep("d1")} />}

        {step === "d1" && (
          <DecisionScreen
            eyebrow="Decision one"
            question="How do you reply to Dave?"
            options={DECISION_ONE}
            onPick={(id) => {
              setD1(id as D1);
              track("decision_1_completed", { decision: id });
              setStep("d1feedback");
            }}
          />
        )}

        {step === "d1feedback" && d1 && (
          <FeedbackScreen
            feedback={DECISION_ONE_FEEDBACK[d1]}
            timestamp="18:06"
            cta="What happened next"
            onNext={() => setStep("twist")}
          />
        )}

        {step === "twist" && <TwistScreen onNext={() => setStep("d2")} />}

        {step === "d2" && (
          <DecisionScreen
            eyebrow="Decision two"
            question="Dave is waiting. What do you recommend?"
            options={DECISION_TWO}
            onPick={(id) => {
              setD2(id as D2);
              track("decision_2_completed", { decision: id });
              setStep("results");
            }}
          />
        )}

        {step === "results" && d1 && d2 && scores && (
          <Results d1={d1} d2={d2} scores={scores} />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- screens */

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <p className="text-[0.7rem] uppercase tracking-[0.24em] text-surface-orange-accent">
        Atlas Challenge 01
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
        The 18:00 Friday Crisis
      </h1>
      <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Tuesday is launch day. Everything is on track. It’s 18:00 Friday and you’re about to close
        your laptop. Then an email arrives. You have a decision to make.
      </p>
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>3-minute project challenge</span>
        <span className="text-border">•</span>
        <span>No sign-up required</span>
      </p>
      <Button size="lg" className="mt-9 w-full sm:w-auto" onClick={onStart}>
        Enter the Hot Seat <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function EmailCard({
  timestamp,
  from,
  role,
  subject,
  body,
}: {
  timestamp: string;
  from: string;
  role: string;
  subject?: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft-lift)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-navy text-sm font-medium text-surface-navy-accent">
            {from
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium">{from}</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{timestamp}</span>
      </div>
      {subject && (
        <p className="mt-5 text-sm font-medium">
          <span className="text-muted-foreground">Subject: </span>
          {subject}
        </p>
      )}
      <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-foreground/90">
        {body}
      </p>
    </div>
  );
}

function EmailScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
      <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">
        <Mail className="h-3.5 w-3.5" /> Inbox — Friday 18:02
      </p>
      <div className="mt-4">
        <EmailCard
          timestamp="18:02"
          from="Dave Okonjo"
          role="VP of Sales"
          subject="Urgent — Tuesday Launch"
          body="We need to add live chat to Tuesday’s release. I know it’s late notice, but the client insists this needs to be included. Can you get the team onto it this weekend and make sure it’s ready for Tuesday?"
        />
      </div>
      <p className="mt-8 font-display text-2xl font-medium leading-snug tracking-tight">
        You’re responsible for coordinating delivery. What do you do?
      </p>
      <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={onNext}>
        Respond to Dave <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function DecisionScreen({
  eyebrow,
  question,
  options,
  onPick,
}: {
  eyebrow: string;
  question: string;
  options: { id: string; text: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <p className="text-[0.7rem] uppercase tracking-[0.24em] text-surface-orange-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
        {question}
      </h2>
      <div className="mt-6 space-y-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-surface-orange-border hover:bg-surface-orange/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-xs font-medium text-muted-foreground transition-colors group-hover:border-surface-orange-border group-hover:text-surface-orange-accent">
              {o.id}
            </span>
            <span className="text-[0.95rem] leading-relaxed text-foreground/90">“{o.text}”</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackScreen({
  feedback,
  timestamp,
  cta,
  onNext,
}: {
  feedback: ReplyFeedback;
  timestamp: string;
  cta: string;
  onNext: () => void;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <h2 className="font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
        {feedback.heading}
      </h2>
      <div className="mt-6">
        <EmailCard
          timestamp={timestamp}
          from={feedback.replyFrom}
          role={feedback.replyRole}
          body={feedback.replyText}
        />
      </div>
      <ul className="mt-7 space-y-2.5">
        {feedback.points.map((p) => (
          <li key={p.text} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
            <span
              className={
                p.positive
                  ? "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-green text-surface-green-accent"
                  : "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-orange text-surface-orange-accent"
              }
            >
              {p.positive ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </span>
            <span className={p.positive ? "text-foreground/90" : "text-muted-foreground"}>
              {p.text}
            </span>
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-8 w-full sm:w-auto" onClick={onNext}>
        {cta} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function TwistScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Friday 18:09
      </p>
      <h2 className="mt-3 font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
        Priya has run a quick initial assessment.
      </h2>
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-surface-orange-border bg-surface-orange p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-surface-orange-accent">
            Full live chat
          </p>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-foreground/85">
            <li>Cannot be responsibly committed for Tuesday</li>
            <li>Requires additional development and testing</li>
            <li>Introduces delivery risk</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-surface-green-border bg-surface-green p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-surface-green-accent">
            Basic “Contact Us” option
          </p>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-foreground/85">
            <li>Can be included in Tuesday’s release</li>
            <li>Meets part of the client’s immediate need</li>
            <li>Full live chat can be evaluated for a later release</li>
          </ul>
        </div>
      </div>
      <p className="mt-8 font-display text-2xl font-medium leading-snug tracking-tight">
        Dave is waiting. What do you recommend?
      </p>
      <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={onNext}>
        Give your recommendation <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- results */

function Results({
  d1,
  d2,
  scores,
}: {
  d1: D1;
  d2: D2;
  scores: ReturnType<typeof scoreChallenge>;
}) {
  const tier = tierFor(scores.total);
  const strongest = strongestDimension(scores);
  const verdict = verdictFor(d1, d2);
  const reply = DECISION_TWO_FEEDBACK[d2];
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track("challenge_completed", {
      challenge: "friday-crisis",
      decision_1: d1,
      decision_2: d2,
      score: scores.total,
      tier: tier.label,
    });
  }, [d1, d2, scores.total, tier.label]);

  const signupSearch = useMemo(() => {
    const params: Record<string, string> = {
      mode: "signup",
      ...readCampaign(),
      source: "challenge",
      challenge: "friday-crisis",
    };
    return params;
  }, []);

  const renderCard = async (): Promise<Blob | null> => {
    const el = cardRef.current;
    if (!el) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(el, { scale: 1, useCORS: true, logging: false });
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  };

  const download = async (silent = false) => {
    setBusy(true);
    try {
      const blob = await renderCard();
      if (!blob) throw new Error("Could not render the card");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlas-friday-crisis-${scores.total}.png`;
      a.click();
      URL.revokeObjectURL(url);
      track("score_shared", { method: "download", score: scores.total });
      return true;
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Download failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const shareLinkedIn = async () => {
    const text = linkedInText(scores.total, tier.label);
    const saved = await download(true);
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success(
      saved
        ? "Result card saved and post text copied — paste it, then attach the image."
        : "Post text copied — paste it into LinkedIn.",
    );
    track("score_shared", { method: "linkedin", score: scores.total });
    window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener");
  };

  const nativeShare = async () => {
    const text = linkedInText(scores.total, tier.label);
    if (!navigator.share) {
      await navigator.clipboard.writeText(text).catch(() => {});
      toast.success("Result copied.");
      track("score_shared", { method: "copy", score: scores.total });
      return;
    }
    setBusy(true);
    try {
      const blob = await renderCard();
      const file = blob ? new File([blob], "atlas-friday-crisis.png", { type: "image/png" }) : null;
      const canFiles =
        file && (navigator as unknown as { canShare?: (d: unknown) => boolean }).canShare?.({ files: [file] });
      await navigator.share({
        title: "The 18:00 Friday Crisis",
        text,
        url: CHALLENGE_URL,
        ...(canFiles && file ? { files: [file] } : {}),
      });
      track("score_shared", { method: "native", score: scores.total });
    } catch {
      /* the visitor cancelled */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* off-screen 1080x1080 asset */}
      <div className="pointer-events-none fixed -left-[3000px] top-0" aria-hidden>
        <ChallengeResultCard
          ref={cardRef}
          total={scores.total}
          tier={tier.label}
          strongest={strongest.label}
        />
      </div>

      <div className="rounded-3xl bg-navy p-7 text-navy-foreground shadow-[var(--shadow-soft-lift)] sm:p-9">
        <p className="text-[0.7rem] uppercase tracking-[0.24em] text-surface-orange-accent">
          Your Project Judgement Score
        </p>
        <p className="mt-5 font-display text-7xl font-medium leading-none sm:text-8xl">
          {scores.total}
          <span className="text-[0.36em] text-navy-foreground/55">/100</span>
        </p>
        <p className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {tier.label}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-navy-foreground/80">{tier.blurb}</p>

        <div className="mt-8 space-y-4">
          {DIMENSIONS.map((d) => (
            <div key={d.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-navy-foreground/85">{d.label}</span>
                <span className="font-mono text-navy-foreground/70">{scores[d.key]}/25</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-foreground/15">
                <div
                  className="h-full rounded-full bg-surface-orange-accent transition-all duration-700"
                  style={{ width: `${(scores[d.key] / 25) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <EmailCard
          timestamp="18:14"
          from={reply.replyFrom}
          role={reply.replyRole}
          body={reply.replyText}
        />
      </div>

      <div className="mt-8 space-y-4">
        {[
          { label: "Your Strength", text: verdict.strength },
          { label: "Watch Out", text: verdict.watchOut },
          { label: "Atlas Takeaway", text: verdict.takeaway },
        ].map((b) => (
          <div key={b.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {b.label}
            </p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground/90">{b.text}</p>
          </div>
        ))}
      </div>

      {/* share */}
      <div className="mt-8 rounded-2xl border border-surface-cream-border bg-surface-cream p-5">
        <p className="font-display text-lg font-medium tracking-tight">Share my result</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A 1080×1080 card with your score, tier and strongest competency.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={shareLinkedIn} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Linkedin className="mr-2 h-4 w-4" />}
            Share on LinkedIn
          </Button>
          <Button variant="outline" onClick={() => download()} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> Download card
          </Button>
          <Button variant="ghost" onClick={nativeShare} disabled={busy}>
            <Share2 className="mr-2 h-4 w-4" /> More
          </Button>
        </div>
      </div>

      {/* conversion */}
      <div className="mt-12 border-t border-border pt-10">
        <p className="font-display text-2xl font-medium tracking-tight">That was one decision.</p>
        <p className="mt-1 text-lg text-muted-foreground">A real project won’t stop there.</p>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-muted-foreground">
          Scope changes. Stakeholders disagree. Resources become unavailable. Risks materialise.
          Budgets move. Deadlines get challenged.
        </p>
        <h2 className="mt-8 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
          Atlas puts you inside the project.
        </h2>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            asChild
            onClick={() => {
              track("full_atlas_clicked", { from: "challenge", score: scores.total });
              track("atlas_signup_from_challenge", { score: scores.total });
            }}
          >
            <Link to="/auth" search={signupSearch}>
              Manage the Full Project <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/">Explore Atlas</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
