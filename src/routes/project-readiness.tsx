import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  X,
  PlayCircle,
  ShieldCheck,
  Mail,
  ListChecks,
  GitBranch,
  Users,
  FileText,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AutoDemo } from "@/components/auto-demo";
import { EnrolDialog } from "@/components/landing/enrol-dialog";
import atlasMark from "@/assets/atlas-mark.png.asset.json";
import { getPublicOffer, COUNTRY_META, type CountryKey } from "@/lib/landing.functions";
import { captureCampaign, initTrackers, track } from "@/lib/landing-analytics";

const searchSchema = z.object({
  country: z.string().optional(),
  variant: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_country: z.string().optional(),
});

const TITLE = "Atlas Project Readiness Experience | Practise Realistic Workplace Scenarios";
const DESCRIPTION =
  "Manage a realistic workplace project, practise stakeholder and risk decisions, receive performance feedback and earn a verifiable Atlas credential.";

export const Route = createFileRoute("/project-readiness")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Stop going into project interviews with only theory." },
      {
        property: "og:description",
        content: "Practise managing a realistic workplace project inside Atlas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectReadiness,
});

const HEADLINES: Record<string, string> = {
  interview: "Stop going into project interviews with only theory.",
  confidence: "Build practical project confidence before your next interview.",
  credential: "You studied project management. Now practise managing the project.",
};

const PROBLEM_CARDS = [
  "“I understand the theory, but I lack practical confidence.”",
  "“I struggle to answer scenario-based interview questions.”",
  "“Employers ask for experience before giving me an opportunity.”",
  "“I need somewhere safe to make decisions and learn from them.”",
];

const OUTCOMES = [
  "Practise realistic project decisions",
  "Understand how actions create consequences",
  "Identify your strengths and development areas",
  "Prepare stronger examples for project interviews",
  "Receive a verifiable record of completion and performance",
];

const JOURNEY = [
  {
    title: "Enter the workplace",
    body: "Join the Digital Care Records Rollout in the simulated role of Project Coordinator.",
    icon: Users,
  },
  {
    title: "Receive your first assignment",
    body: "Open a stakeholder email, understand what is required and take your first action.",
    icon: Mail,
  },
  {
    title: "Manage realistic project activity",
    body: "Work with project documentation, stakeholders, risks, issues, planning activities and changing priorities.",
    icon: ListChecks,
  },
  {
    title: "Make decisions",
    body: "Choose how to respond when information is incomplete, stakeholders disagree or delivery comes under pressure.",
    icon: GitBranch,
  },
  {
    title: "Experience the consequences",
    body: "See how your choices affect project health, delivery, stakeholder confidence and professional reputation.",
    icon: Sparkles,
  },
  {
    title: "Review your performance",
    body: "Receive a structured performance summary showing what you handled well and where you need to improve.",
    icon: FileText,
  },
];

const INCLUSIONS = [
  {
    title: "Digital Care Records Rollout",
    body: "A realistic simulated workplace project to manage from initiation through the project lifecycle.",
  },
  {
    title: "Stakeholder and workplace scenarios",
    body: "Respond to realistic emails, requests, concerns and project developments.",
  },
  {
    title: "Project activities and deliverables",
    body: "Complete tasks connected to planning, risks, reporting, governance and coordination.",
  },
  {
    title: "Decision consequences",
    body: "See how your choices influence stakeholders, project health and progress.",
  },
  {
    title: "Performance feedback",
    body: "Receive an overall score, performance rating and competency breakdown.",
  },
  {
    title: "Detailed performance report",
    body: "Review demonstrated strengths, completed activities and development areas.",
  },
  {
    title: "Verifiable Atlas credential",
    body: "Receive a shareable credential with a unique verification code and public verification page after successful completion.",
  },
  {
    title: "Interview reflection guide",
    body: "Translate what you learned into honest, interview-ready reflections without presenting simulated experience as employment.",
  },
];

const FOR_YOU = [
  "You are pursuing Project Coordinator, PMO Analyst or junior Project Manager roles",
  "You have completed project-management learning but lack practical confidence",
  "You are changing careers into project delivery",
  "You find scenario-based interview questions difficult",
  "You want to practise workplace judgement in a safe environment",
  "You are prepared to complete realistic project activities",
];

const NOT_FOR_YOU = [
  "You are only looking for passive video lessons",
  "You expect guaranteed employment",
  "You want to claim the experience as real employment",
  "You are unwilling to complete project activities and make decisions",
];

const COMPETENCIES = [
  "Decision-Making",
  "Stakeholder Management",
  "Risk and Issue Management",
  "Documentation",
  "Communication",
  "Delivery Management",
];

const PRICE_INCLUDES = [
  "Complete Digital Care Records workplace experience",
  "All project scenarios and activities",
  "Performance score and feedback",
  "Detailed performance report",
  "Verifiable Atlas credential after successful completion",
  "Interview reflection guide",
  "Access to the current founding-user experience",
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is Atlas?",
    a: "Atlas is an AI-powered simulated workplace environment where professionals practise realistic workplace scenarios. The current experience places users in a project-delivery role within a Digital Care Records Rollout.",
  },
  {
    q: "Is this a course?",
    a: "No. Atlas is based on learning through action. You enter a simulated workplace, receive assignments, make decisions, complete activities and experience the consequences.",
  },
  {
    q: "Is this real work experience?",
    a: "No. Atlas provides simulated workplace experience. It helps you practise realistic project situations, but it must not be presented as employment or as work completed for a real organisation.",
  },
  {
    q: "Can I include it on my CV?",
    a: "You may include it honestly under a section such as “Projects,” “Professional Development” or “Simulated Workplace Experience.” You must clearly state that it was completed through Atlas and was not employment.",
  },
  {
    q: "Will Atlas help me get a job?",
    a: "Atlas can help you build practical confidence, identify development areas and prepare stronger reflections for interviews. It does not guarantee interviews, employment or professional certification.",
  },
  {
    q: "What happens inside the experience?",
    a: "You will respond to stakeholder communications, complete project activities, manage risks and issues, make decisions and progress through a realistic project lifecycle.",
  },
  {
    q: "How long does it take?",
    a: "Most users can complete the current experience over several focused sessions. You can progress at your own pace.",
  },
  {
    q: "What do I receive after completion?",
    a: "Eligible users receive a performance summary, detailed performance report and verifiable Atlas credential based on their actual completion and score.",
  },
  {
    q: "Is the certificate accredited?",
    a: "No. It is an Atlas-issued credential confirming completion and performance within a simulated workplace experience. It is not an accredited academic or professional qualification.",
  },
  {
    q: "Can beginners use Atlas?",
    a: "Yes. The experience is designed to help aspiring and developing project professionals practise workplace situations. Clear task instructions and progress guidance are provided.",
  },
  {
    q: "Can I access Atlas from Nigeria or India?",
    a: "Yes. Atlas is web-based and can be accessed using a supported internet-connected device.",
  },
  {
    q: "What happens after payment?",
    a: "You will create or access your Atlas account and be taken directly to the beginning of the workplace experience.",
  },
];

function normaliseCountry(value?: string | null): CountryKey | null {
  const v = (value ?? "").trim().toLowerCase();
  if (["nigeria", "ng", "nga"].includes(v)) return "nigeria";
  if (["india", "in", "ind"].includes(v)) return "india";
  return null;
}

function ProjectReadiness() {
  const search = Route.useSearch();
  const fetchOffer = useServerFn(getPublicOffer);
  const offerQuery = useQuery({
    queryKey: ["public-offer"],
    queryFn: () => fetchOffer(),
    staleTime: 60_000,
  });

  const [country, setCountry] = useState<CountryKey | null>(
    () => normaliseCountry(search.country) ?? normaliseCountry(search.utm_country),
  );
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initTrackers();
    captureCampaign(search as Record<string, unknown>);
    track("landing_page_view", { variant: search.variant ?? "default" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const bottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setShowSticky(bottom < 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const offer = offerQuery.data;
  const enrolmentOpen = offer?.enrolmentOpen ?? true;
  const headline =
    HEADLINES[search.variant ?? offer?.heroVariant ?? "interview"] ?? HEADLINES["interview"]!;

  const priceLabel = useMemo(() => {
    if (!country || !offer) return null;
    const meta = COUNTRY_META[country];
    const amount = offer.prices[country];
    return `${meta.symbol}${amount.toLocaleString()}`;
  }, [country, offer]);

  const placesLeft = useMemo(() => {
    if (!country || !offer) return null;
    return Math.max(0, offer.foundingPlaces - (offer.placesTaken[country] ?? 0));
  }, [country, offer]);

  const openEnrol = (source: string) => {
    track("primary_cta_click", { source, country: country ?? "unknown" });
    if (!enrolmentOpen) {
      window.location.href = "/#waitlist";
      return;
    }
    if (!country) {
      document.getElementById("price")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setEnrolOpen(true);
  };

  const ctaLabel = enrolmentOpen ? "Start Your Atlas Experience" : "Join the Waitlist";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={atlasMark.src} alt="Atlas" className="h-8 w-8 shrink-0" />
            <span className="truncate font-display text-lg font-medium">Atlas</span>
          </Link>
          <Button size="sm" onClick={() => openEnrol("nav")}>
            {enrolmentOpen ? "Enrol Now" : "Join the Waitlist"}
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="border-b border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              Atlas Project Readiness Experience
            </p>
            <h1 className="mt-4 font-display text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/85">
              Manage a realistic workplace project, respond to stakeholders, handle risks and make
              project decisions inside Atlas.
            </p>
            <p className="mt-3 max-w-xl text-base text-primary-foreground/85">
              Build practical confidence, receive personalised performance feedback and earn a
              verifiable Atlas credential.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={() => openEnrol("hero")}
                className="bg-accent-orange text-accent-orange-foreground hover:bg-accent-orange/90"
              >
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {priceLabel && (
                <span className="text-sm text-primary-foreground/80">
                  {COUNTRY_META[country!].label} price · {priceLabel}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm text-primary-foreground/70">
              Designed for aspiring Project Coordinators, PMO Analysts and Project Managers.
            </p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-foreground/60">
              <span>Simulated workplace experience</span>
              <span aria-hidden>·</span>
              <span>Performance feedback</span>
              <span aria-hidden>·</span>
              <span>Verifiable credential</span>
            </p>
          </div>
          <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-3 shadow-2xl">
            <AutoDemo />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="max-w-3xl font-display text-2xl font-medium leading-snug sm:text-3xl">
            You have learned the terminology. But can you apply it when the project is under
            pressure?
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Courses can teach you what stakeholders, RAID logs, project plans and change requests
              mean.
            </p>
            <p>Interviews and workplaces expect something more: judgement.</p>
            <p>
              You may be asked how you would respond to a difficult stakeholder, prioritise
              competing tasks, manage an unresolved risk or explain a delayed deliverable.
            </p>
            <p>
              Atlas gives you a realistic environment to practise these decisions before the
              pressure is real.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM_CARDS.map((c) => (
              <div
                key={c}
                className="rounded-xl border border-border bg-background p-5 text-[15px] leading-relaxed"
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUTCOME */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="max-w-3xl font-display text-2xl font-medium leading-snug sm:text-3xl">
            Build practical workplace confidence you can explain in interviews.
          </h2>
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            Atlas places you in the simulated role of a Project Coordinator responsible for a
            Digital Care Records Rollout. You will receive realistic workplace information, complete
            project activities, respond to stakeholders and see how your decisions affect delivery,
            risk, project health and professional reputation.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OUTCOMES.map((o) => (
              <li key={o} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                <span className="text-[15px] leading-relaxed">{o}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Atlas provides simulated workplace experience. It does not represent employment and does
            not guarantee a job or interview.
          </p>
        </div>
      </section>

      {/* VIDEO / PRODUCT */}
      <VideoSection videoUrl={offer?.videoUrl ?? null} />

      {/* JOURNEY */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">What you will do inside Atlas</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-2">
            {JOURNEY.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
                    <h3 className="font-medium">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* INCLUSIONS */}
      <section className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">What is included</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INCLUSIONS.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-background p-5">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">Atlas may be right for you if…</h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {FOR_YOU.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-xl border border-border bg-muted/40 p-6">
            <h3 className="font-medium">Atlas may not be right for you if…</h3>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {NOT_FOR_YOU.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CREDENTIAL PREVIEW */}
      <section className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">
            Finish with evidence of what you completed
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Credential preview
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-6 w-6 text-accent-orange" aria-hidden />
                  <div>
                    <p className="font-display text-lg font-medium">Atlas Digital Care Records Programme</p>
                    <p className="text-sm text-muted-foreground">
                      In the simulated role of Project Coordinator
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {COMPETENCIES.map((c) => (
                    <div key={c} className="rounded-lg border border-border px-3 py-2 text-sm">
                      {c}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Every credential carries a unique code and a public verification page at
                    atlassim.co/verify/&lt;code&gt;, with a matching QR code.
                  </span>
                </div>
                <Link
                  to="/certificate/preview"
                  className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  See a full example credential →
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-6">
                <h3 className="font-medium">Example performance breakdown</h3>
                <div className="mt-4 space-y-3">
                  {[
                    ["Decision-Making", 84],
                    ["Stakeholder Management", 78],
                    ["Risk and Issue Management", 72],
                    ["Documentation", 88],
                    ["Communication", 80],
                    ["Delivery Management", 76],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${value as number}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Illustrative only. Your results are based on your activities and decisions inside
                  Atlas. Scores and competencies are not automatically awarded.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The Atlas credential confirms completion and performance within a simulated
                workplace experience. It is not an academic qualification, professional licence or
                employment record.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE */}
      <section id="price" className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">Founding-user access</h2>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            {!country ? (
              <div>
                <p className="text-[15px] font-medium">Select your country to view your price.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["nigeria", "india"] as CountryKey[]).map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      onClick={() => {
                        setCountry(key);
                        track("country_selected", { country: key });
                      }}
                    >
                      {COUNTRY_META[key].label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {COUNTRY_META[country].label}
                </p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="font-display text-4xl font-medium">{priceLabel}</span>
                  <span className="pb-1 text-sm text-muted-foreground">one-time</span>
                </div>
                {placesLeft !== null && offer && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Founding-user pricing is available to the first {offer.foundingPlaces}{" "}
                    participants in each market. {placesLeft} places remaining in{" "}
                    {COUNTRY_META[country].label}.
                  </p>
                )}
                <ul className="mt-6 space-y-2">
                  {PRICE_INCLUDES.map((i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="mt-7 w-full" onClick={() => openEnrol("price")}>
                  {enrolmentOpen ? "Enrol Now" : "Join the Waitlist"}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Secure payment · Immediate access · Complete at your own pace
                </p>
                {offer?.checkoutNote && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">{offer.checkoutNote}</p>
                )}
                <button
                  type="button"
                  onClick={() => setCountry(null)}
                  className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Change country
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ENROLMENT STEPS */}
      <section className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">Start in three simple steps</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ["Enrol", "Complete your secure payment and create your Atlas account."],
              [
                "Begin your first task",
                "Enter your project and respond to your first workplace assignment.",
              ],
              [
                "Complete and receive your results",
                "Progress through the experience and unlock your performance report and credential after successful completion.",
              ],
            ].map(([title, body], i) => (
              <div key={title} className="rounded-xl border border-border bg-background p-6">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-orange text-sm font-semibold text-accent-orange-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Built from a real career challenge
              </p>
              <blockquote className="mt-5 font-display text-xl leading-relaxed">
                “I built Atlas after realising that studying project management and managing
                workplace situations are not the same thing. Atlas creates a safe place to practise
                the decisions professionals are expected to make before facing them in a real role.”
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground">
                — Dolapo Rasaq, Founder of Atlas
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["4", "project phases from initiation to closure"],
                ["15+", "workplace deliverables and templates"],
                ["1", "verifiable credential per completed run"],
              ].map(([stat, label]) => (
                <div key={label} className="rounded-xl border border-border bg-card p-5">
                  <div className="font-display text-3xl font-medium">{stat}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:py-20">
          <h2 className="font-display text-2xl font-medium sm:text-3xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger
                  className="text-left"
                  onClick={() => track("faq_opened", { question: f.q })}
                >
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:py-24">
          <h2 className="font-display text-2xl font-medium leading-snug sm:text-3xl">
            Your first real project role should not be the first time you make a project decision.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-primary-foreground/85">
            Enter a realistic workplace project, practise the decisions expected of project
            professionals and discover how you perform before the pressure is real.
          </p>
          <Button
            size="lg"
            onClick={() => openEnrol("final")}
            className="mt-8 bg-accent-orange text-accent-orange-foreground hover:bg-accent-orange/90"
          >
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-primary-foreground/70">Immediate access after payment.</p>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-5 py-8 text-xs leading-relaxed text-muted-foreground">
          Atlas is an AI-powered simulated workplace environment where professionals practise
          realistic workplace scenarios. Atlas is not affiliated with or endorsed by any healthcare
          organisation, and does not provide employment or accredited qualifications.
        </div>
      </footer>

      {/* sticky mobile CTA */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur transition-transform duration-300 md:hidden ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Atlas Project Readiness Experience</p>
            <p className="text-xs text-muted-foreground">
              {priceLabel ?? "Select your country to view your price"}
            </p>
          </div>
          <Button size="sm" onClick={() => openEnrol("sticky")}>
            {enrolmentOpen ? "Enrol Now" : "Waitlist"}
          </Button>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden />

      {country && priceLabel && (
        <EnrolDialog
          open={enrolOpen}
          onOpenChange={setEnrolOpen}
          country={country}
          price={priceLabel}
        />
      )}
    </div>
  );
}

function VideoSection({ videoUrl }: { videoUrl: string | null }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          el.play()
            .then(() => {
              setPlaying(true);
              track("video_played");
            })
            .catch(() => setPlaying(false));
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoUrl]);

  return (
    <section className="border-b border-border/60 bg-card">
      <div className="mx-auto max-w-5xl px-5 py-14 lg:py-20">
        <h2 className="font-display text-2xl font-medium sm:text-3xl">
          See what managing a project inside Atlas looks like
        </h2>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-background">
          {videoUrl ? (
            <div className="relative">
              <video
                ref={ref}
                src={videoUrl}
                muted
                playsInline
                loop
                preload="metadata"
                controls
                aria-label="Atlas product walkthrough with captions"
                className="w-full"
              />
              {!playing && (
                <button
                  type="button"
                  onClick={() => ref.current?.play()}
                  className="absolute inset-0 grid place-items-center bg-primary/30"
                  aria-label="Play the Atlas product video"
                >
                  <PlayCircle className="h-14 w-14 text-primary-foreground" aria-hidden />
                </button>
              )}
            </div>
          ) : (
            <div className="p-3">
              <AutoDemo />
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          You are not watching someone else manage the project. You are making the decisions.
        </p>
      </div>
    </section>
  );
}