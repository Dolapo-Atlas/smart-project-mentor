import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  PlayCircle,
  ShieldCheck,
  Mail,
  ListChecks,
  GitBranch,
  Users,
  FileText,
  Sparkles,
  BadgeCheck,
  QrCode,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AutoDemo } from "@/components/auto-demo";
import { ATLAS_DEMO_POSTER } from "@/components/landing/demo-video";
import { HeroStage } from "@/components/landing/hero-stage";
import { AtlasNav, AtlasFooter, Reveal, EXPERIENCE_NAV } from "@/components/landing/atlas-chrome";
import { AtlasCertificate } from "@/components/certificate/atlas-certificate";
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

const TITLE = "Atlas Project Readiness Experience | Manage a Realistic Workplace Project";
const DESCRIPTION =
  "Manage a realistic workplace project inside Atlas, practise stakeholder and risk decisions, receive performance feedback and earn a verifiable Atlas credential.";

export const Route = createFileRoute("/project-readiness")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Atlas Project Readiness Experience" },
      {
        property: "og:description",
        content:
          "Practise managing a realistic workplace project inside Atlas and finish with evidence of what you completed.",
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

const PROBLEM_QUOTES = [
  "I understand the theory, but I lack practical confidence.",
  "I struggle to answer scenario-based interview questions.",
  "Employers ask for experience before giving me an opportunity.",
];

const OUTCOMES = [
  { title: "Practise realistic project decisions", icon: GitBranch },
  { title: "Understand how actions create consequences", icon: Sparkles },
  { title: "Identify your strengths and development areas", icon: ListChecks },
  { title: "Prepare stronger examples for project interviews", icon: Users },
  { title: "Receive a verifiable record of completion and performance", icon: BadgeCheck },
];

const JOURNEY = [
  {
    title: "Enter the workplace",
    body: "Join the Digital Care Records Rollout in the simulated role of Project Coordinator.",
    icon: Users,
  },
  {
    title: "Receive your assignment",
    body: "Open a stakeholder email, understand what is required and take your first action.",
    icon: Mail,
  },
  {
    title: "Manage project activity",
    body: "Work across documentation, stakeholders, risks, planning and changing priorities.",
    icon: ListChecks,
  },
  {
    title: "Make decisions",
    body: "Choose how to respond when information is incomplete or delivery is under pressure.",
    icon: GitBranch,
  },
  {
    title: "Experience consequences",
    body: "See how your choices affect project health, delivery and stakeholder confidence.",
    icon: Sparkles,
  },
  {
    title: "Review performance",
    body: "Receive a structured summary of what you handled well and where to improve.",
    icon: FileText,
  },
];

const PACKAGE = [
  {
    group: "The workplace experience",
    items: [
      "Digital Care Records Rollout",
      "Realistic stakeholder scenarios",
      "Project activities and deliverables",
    ],
  },
  {
    group: "Performance and development",
    items: [
      "Decision consequences",
      "Performance score",
      "Competency breakdown",
      "Detailed performance report",
    ],
  },
  {
    group: "Professional evidence",
    items: [
      "Verifiable Atlas credential",
      "Public verification page",
      "Shareable completion record",
    ],
  },
  {
    group: "Interview preparation",
    items: [
      "Reflection guide",
      "Help explaining decisions honestly in interviews",
      "Strengths and development areas",
    ],
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

const PRICE_INCLUDES = [
  "Full Digital Care Records Rollout",
  "Workplace assignments and stakeholder scenarios",
  "Performance feedback",
  "Detailed performance report",
  "Verifiable Atlas credential",
  "Interview reflection guide",
  "Immediate access after payment",
];

const SAMPLE_SCORES: Array<[string, number]> = [
  ["Decision-Making", 84],
  ["Stakeholder Management", 78],
  ["Risk and Issue Management", 72],
  ["Documentation", 88],
  ["Communication", 80],
  ["Delivery Management", 76],
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is Atlas?",
    a: "Atlas is an AI-powered simulated workplace environment where professionals practise realistic workplace scenarios. The current experience places you in a project-delivery role within a Digital Care Records Rollout.",
  },
  {
    q: "Is this a course?",
    a: "No. Atlas is based on learning through action. You enter a simulated workplace, receive assignments, make decisions, complete activities and experience the consequences.",
  },
  {
    q: "Is this real employment?",
    a: "No. Atlas provides simulated workplace experience. It helps you practise realistic project situations, but it must not be presented as employment or as work completed for a real organisation.",
  },
  {
    q: "Can I include it on my CV?",
    a: "Yes, honestly — under a section such as “Projects,” “Professional Development” or “Simulated Workplace Experience.” You must clearly state that it was completed through Atlas and was not employment.",
  },
  {
    q: "What do I receive?",
    a: "The complete Digital Care Records workplace experience, a performance score and competency breakdown, a detailed performance report, an interview reflection guide, and a verifiable Atlas credential after successful completion.",
  },
  {
    q: "How long does it take?",
    a: "Most people complete the experience over several focused sessions. You progress at your own pace, and your project state is saved as you go.",
  },
  {
    q: "Is the credential accredited?",
    a: "No. It is an Atlas-issued credential confirming completion and performance within a simulated workplace experience. It is not an accredited academic or professional qualification.",
  },
  {
    q: "What happens after payment?",
    a: "You create or sign in to your Atlas account and are taken directly to the beginning of the workplace experience — your first assignment is waiting in your inbox.",
  },
  {
    q: "Can beginners use Atlas?",
    a: "Yes. Clear task instructions, in-app templates and guidance are provided throughout, so you always know what is expected of you next.",
  },
  {
    q: "Can I access Atlas from my country?",
    a: "Yes. Atlas is web-based and works on any supported internet-connected device. Pricing is shown in local currency for Nigeria and India, and in pounds for the United Kingdom and other markets.",
  },
  {
    q: "Who is Atlas not right for?",
    a: "Atlas is not for you if you are only looking for passive video lessons, expect guaranteed employment, want to claim the experience as real employment, or are unwilling to complete project activities and make decisions.",
  },
];

const SAMPLE_CERT = {
  recipient_name: "Dolapo Rasaq",
  simulated_role: "Project Coordinator",
  programme_name: "Atlas Digital Care Records Programme",
  project_name: "Digital Care Records Rollout",
  completion_date: new Date().toISOString(),
  issued_at: new Date().toISOString(),
  overall_score: 86,
  grade: "Distinction",
  competencies: [
    "Decision-Making",
    "Stakeholder Management",
    "Risk and Issue Management",
    "Documentation",
    "Communication",
    "Delivery Management",
  ],
  verification_code: "ATLAS-2026-A7F3K9D2M4",
};

function normaliseCountry(value?: string | null): CountryKey | null {
  const v = (value ?? "").trim().toLowerCase();
  if (["nigeria", "ng", "nga"].includes(v)) return "nigeria";
  if (["india", "in", "ind"].includes(v)) return "india";
  if (["uk", "gb", "gbr", "united kingdom", "international"].includes(v)) return "international";
  return null;
}

const COUNTRY_ORDER: CountryKey[] = ["nigeria", "india", "international"];

function ProjectReadiness() {
  const search = Route.useSearch();
  const fetchOffer = useServerFn(getPublicOffer);
  const offerQuery = useQuery({
    queryKey: ["public-offer"],
    queryFn: () => fetchOffer(),
    staleTime: 60_000,
  });

  const [country, setCountry] = useState<CountryKey>(
    () => normaliseCountry(search.country) ?? normaliseCountry(search.utm_country) ?? "international",
  );
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
  const headline =
    HEADLINES[search.variant ?? offer?.heroVariant ?? "interview"] ?? HEADLINES["interview"]!;

  const priceLabel = useMemo(() => {
    if (!offer) return null;
    const meta = COUNTRY_META[country];
    return `${meta.symbol}${offer.prices[country].toLocaleString()}`;
  }, [country, offer]);

  // New funnel: sign up free, do the first real task inside Atlas, then pay to
  // continue. No card is asked for on this page.
  const openEnrol = (source: string) => {
    track("primary_cta_click", { source, country });
    window.location.href = "/auth";
  };

  const ctaLabel = "Start free — no card needed";

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AtlasNav onPrimary={() => openEnrol("nav")} />

      {/* ---------------------------------------------------------- HERO */}
      <section ref={heroRef} className="relative overflow-hidden pt-10 pb-20 sm:pt-16 lg:pb-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 85% 0%, color-mix(in oklab, var(--accent-orange) 14%, transparent), transparent 70%), radial-gradient(40% 35% at 0% 30%, color-mix(in oklab, var(--accent-orange) 8%, transparent), transparent 70%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20 lg:px-10">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-orange" />
                Atlas Project Readiness Experience
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.3rem,5.4vw,4.4rem)] font-medium leading-[1.04] tracking-[-0.02em]">
                {headline}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Manage a realistic workplace project, respond to stakeholders, handle risks and make
                project decisions inside Atlas. Build practical confidence, receive personalised
                performance feedback and earn a verifiable Atlas credential.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEnrol("hero")}
                  className="group inline-flex items-center gap-2 rounded-full bg-accent-orange px-6 py-3 text-sm font-medium text-accent-orange-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_30px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card"
                >
                  <PlayCircle className="h-4 w-4 text-accent-orange" />
                  See How It Works
                </a>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{priceLabel ? `${COUNTRY_META[country].label} · ${priceLabel}` : "Local pricing"}</span>
                <span aria-hidden>·</span>
                <span>One-time payment</span>
                <span aria-hidden>·</span>
                <span>Immediate access</span>
                <span aria-hidden>·</span>
                <span>Complete at your own pace</span>
              </p>
            </Reveal>
          </div>
          <Reveal delay={140} className="relative">
            <HeroStage />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- PROBLEM */}
      <section className="border-y border-border/60 bg-card/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <Reveal>
                <h2 className="max-w-2xl font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
                  You have learned the terminology. But can you apply it when the project is under{" "}
                  <span className="italic text-accent-orange">pressure</span>?
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <div className="mt-8 max-w-xl space-y-4 text-[16px] leading-relaxed text-muted-foreground">
                  <p>
                    Courses can teach you what stakeholders, RAID logs, project plans and change
                    requests mean. Interviews and workplaces expect something more: judgement.
                  </p>
                  <p>
                    You may be asked how you would respond to a difficult stakeholder, prioritise
                    competing tasks, manage an unresolved risk or explain a delayed deliverable.
                  </p>
                  <p className="text-foreground">
                    Atlas gives you a realistic environment to practise these decisions before the
                    pressure is real.
                  </p>
                </div>
              </Reveal>
            </div>
            <ul className="space-y-8 lg:pt-4">
              {PROBLEM_QUOTES.map((q, i) => (
                <Reveal as="li" key={q} delay={100 + i * 90} className="border-l-2 border-accent-orange/50 pl-6">
                  <p className="font-display text-[clamp(1.15rem,2.1vw,1.5rem)] leading-snug">
                    &ldquo;{q}&rdquo;
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- OUTCOME */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-orange">The outcome</p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-4 max-w-3xl font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Build practical workplace confidence you can explain in interviews.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
              Atlas places you in the simulated role of a Project Coordinator responsible for a
              Digital Care Records Rollout. You receive realistic workplace information, complete
              project activities, respond to stakeholders and see how your decisions affect delivery,
              risk, project health and professional reputation.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
            <ul className="space-y-7">
              {OUTCOMES.map((o, i) => (
                <Reveal as="li" key={o.title} delay={80 + i * 70} className="flex items-start gap-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-orange/12 text-accent-orange">
                    <o.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-display text-[clamp(1.05rem,1.9vw,1.35rem)] leading-snug">
                    {o.title}
                  </span>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={200}>
              <div className="rounded-[28px] border border-border bg-card/70 p-3 shadow-[0_40px_120px_-50px_rgba(40,30,15,0.35)] backdrop-blur">
                <AutoDemo />
              </div>
            </Reveal>
          </div>
          <Reveal delay={260}>
            <p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Atlas provides simulated workplace experience. It does not represent employment and does
              not guarantee a job or interview.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- DEMO */}
      <ExperienceSection
        ctaLabel={ctaLabel}
        onCta={() => openEnrol("video")}
      />

      {/* ------------------------------------------------------- JOURNEY */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-orange">How it works</p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              What you will do inside Atlas
            </h2>
          </Reveal>

          <ol className="relative mt-14 space-y-0 border-l border-border/70 pl-8 sm:pl-12">
            {JOURNEY.map((step, i) => (
              <Reveal as="li" key={step.title} delay={60 + i * 70} className="relative pb-10 last:pb-0">
                <span className="absolute -left-[calc(2rem+1px)] grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-border bg-background text-xs font-semibold text-accent-orange sm:-left-[calc(3rem+1px)]">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2.5">
                  <step.icon className="h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
                  <h3 className="font-display text-xl font-medium">{step.title}</h3>
                </div>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------- PACKAGE */}
      <section id="receive" className="border-y border-border/60 bg-card/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-orange">What is included</p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              A complete professional service, not a feature list.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-14 gap-y-12 sm:grid-cols-2">
            {PACKAGE.map((group, i) => (
              <Reveal key={group.group} delay={80 + i * 80}>
                <p className="font-display text-xl font-medium">{group.group}</p>
                <div className="mt-4 h-px w-14 bg-accent-orange/60" />
                <ul className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="text-[15px] leading-relaxed text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- WHO IT'S FOR */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
          <Reveal>
            <h2 className="max-w-2xl font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Atlas may be right for you if…
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-x-12 gap-y-5 md:grid-cols-2">
            {FOR_YOU.map((f, i) => (
              <Reveal as="li" key={f} delay={60 + i * 60} className="flex items-start gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
                <span className="text-[16px] leading-relaxed">{f}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- EVIDENCE */}
      <section className="border-y border-border/60 bg-card/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-orange">Evidence</p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Finish with evidence of what you completed
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-16">
            <Reveal>
              <div className="rounded-[24px] border border-border bg-background p-3 shadow-[0_50px_140px_-60px_rgba(11,31,58,0.5)]">
                <AtlasCertificate
                  cert={SAMPLE_CERT}
                  verificationUrl={`atlassim.co/verify/${SAMPLE_CERT.verification_code}`}
                />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Example credential. Your own is issued from your actual activities, decisions and score.
              </p>
            </Reveal>

            <div className="space-y-8">
              <Reveal delay={100}>
                <div className="rounded-[24px] border border-border bg-background p-7">
                  <h3 className="font-display text-xl font-medium">Example performance report</h3>
                  <div className="mt-6 space-y-4">
                    {SAMPLE_SCORES.map(([label, value]) => (
                      <div key={label}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span>{label}</span>
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                    Illustrative only. Scores and competencies are never automatically awarded.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <div className="rounded-[24px] border border-border bg-background p-7">
                  <h3 className="font-display text-xl font-medium">Public verification page</h3>
                  <div className="mt-5 flex items-start gap-4 rounded-2xl bg-muted/50 p-5">
                    <QrCode className="h-10 w-10 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="font-mono text-sm break-all">
                        atlassim.co/verify/{SAMPLE_CERT.verification_code}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Every credential carries a unique verification code, a matching QR code and a
                        public page an employer can check in seconds.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/certificate/preview"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-orange underline-offset-4 hover:underline"
                  >
                    See a full example credential
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- PRICE */}
      <section id="price" className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-10">
          <Reveal className="text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-accent-orange">Get full access</p>
            <h2 className="mt-4 font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Atlas Project Readiness Experience
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
              Complete the Digital Care Records workplace experience, receive performance feedback and
              earn a verifiable Atlas credential.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <div className="relative mt-12 overflow-hidden rounded-[28px] border border-border bg-card/80 p-7 shadow-[0_50px_140px_-60px_rgba(40,30,15,0.4)] backdrop-blur sm:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(60% 80% at 90% 0%, color-mix(in oklab, var(--accent-orange) 12%, transparent), transparent 70%)",
                }}
              />
              <div className="flex flex-wrap gap-2">
                {COUNTRY_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCountry(key);
                      track("country_selected", { country: key });
                    }}
                    className={[
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      country === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {key === "international" ? "UK & other markets" : COUNTRY_META[key].label}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex items-end gap-3">
                <span className="font-display text-[clamp(2.6rem,6vw,4rem)] font-medium leading-none">
                  {priceLabel ?? "—"}
                </span>
                <span className="pb-2 text-sm text-muted-foreground">
                  one-time payment, only when you continue
                </span>
              </div>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {PRICE_INCLUDES.map((i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openEnrol("price")}
                className="group mt-9 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-orange px-6 py-4 text-sm font-medium text-accent-orange-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_14px_34px_-14px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Sign up free · Do your first real task · Pay only if you continue
              </p>
              {offer?.checkoutNote && (
                <p className="mt-2 text-center text-xs text-muted-foreground">{offer.checkoutNote}</p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ FAQ */}
      <section id="faq" className="border-y border-border/60 bg-card/40 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-10">
          <Reveal>
            <h2 className="font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
              Questions before you start
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Accordion type="single" collapsible className="mt-10">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`}>
                  <AccordionTrigger
                    className="text-left font-display text-base"
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
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- FINAL CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 lg:py-28">
          <Reveal>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.8rem)] font-medium leading-[1.12] tracking-[-0.02em]">
              Your first project role should not be the first time you make a project decision.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-primary-foreground/85">
              Enter a realistic workplace project, practise the decisions expected of project
              professionals and discover how you perform before the pressure is real.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <button
              type="button"
              onClick={() => openEnrol("final")}
              className="group mt-9 inline-flex items-center gap-2 rounded-full bg-accent-orange px-7 py-4 text-sm font-medium text-accent-orange-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_14px_34px_-14px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-0.5"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="mt-4 text-xs text-primary-foreground/70">
              One-time payment · Immediate access after payment
            </p>
          </Reveal>
        </div>
      </section>

      <AtlasFooter links={EXPERIENCE_NAV} />

      {/* sticky mobile CTA */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur transition-transform duration-300 md:hidden ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Atlas Project Readiness Experience</p>
            <p className="text-xs text-muted-foreground">{priceLabel ?? "Local pricing"}</p>
          </div>
          <button
            type="button"
            onClick={() => openEnrol("sticky")}
            className="shrink-0 rounded-full bg-accent-orange px-4 py-2.5 text-xs font-medium text-accent-orange-foreground"
          >
            Start Experience
          </button>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden />

    </div>
  );
}

/**
 * Product demonstration. The full walkthrough video lives on the homepage —
 * here we show one strong still with a play affordance that links back to it,
 * so the same video is never presented twice in one funnel.
 */
function ExperienceSection({
  ctaLabel,
  onCta,
}: {
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <section id="experience" className="relative overflow-hidden bg-primary py-20 text-primary-foreground sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 60% at 85% 5%, color-mix(in oklab, var(--accent-orange) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-10">
        <Reveal className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-accent-orange">A word from the founder</p>
          <h2 className="mt-4 font-display text-[clamp(1.85rem,3.6vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            What you are buying, explained by the founder
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-primary-foreground/85">
            Dolapo Rasaq walks through the experience and what you will be doing inside it. Tap to play with sound.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,360px)_1fr]">
            <div>
              <div className="rounded-[28px] border border-primary-foreground/15 bg-primary-foreground/5 p-3 shadow-[0_60px_160px_-60px_rgba(0,0,0,0.7)]">
                <a
                  href="/#walkthrough"
                  onClick={() => track("primary_cta_click", { source: "watch_demo" })}
                  className="group relative mx-auto block w-full max-w-[360px] overflow-hidden rounded-[24px]"
                  style={{ aspectRatio: "9 / 16" }}
                  aria-label="Watch the Atlas walkthrough on the homepage"
                >
                  <img
                    src={ATLAS_DEMO_POSTER}
                    alt="Atlas workspace during the Digital Care Records project"
                    width={720}
                    height={1280}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-primary/35 transition-colors group-hover:bg-primary/20">
                    <PlayCircle className="h-14 w-14 text-white drop-shadow" aria-hidden />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-[13px] font-medium text-white">
                    Watch the 60-second walkthrough
                  </span>
                </a>
              </div>
              <p className="mx-auto mt-4 max-w-[360px] text-center text-[13px] leading-relaxed text-primary-foreground/70">
                In 60 seconds: you run a real project end to end, and leave with proof you can do the job.
              </p>
              <div className="mx-auto mt-5 max-w-[360px]">
                <button
                  type="button"
                  onClick={onCta}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-orange px-6 py-3 text-sm font-medium text-accent-orange-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_30px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
            <div className="rounded-[28px] border border-primary-foreground/10 bg-primary-foreground/5 p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">What you will be doing</p>
              <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-primary-foreground/85">
                <li>Reading a live project brief and picking your first task</li>
                <li>Responding to stakeholders and handling pushback</li>
                <li>Filling real deliverables — charter, schedule, RAID log</li>
                <li>Taking your work to a Steering Committee gate</li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
