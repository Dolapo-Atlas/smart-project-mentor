import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Mail,
  ListChecks,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  Users,
  GitBranch,
  Workflow,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — A Coordinator's Diary" },
      {
        name: "description",
        content:
          "Experience the workplace before you're in it. Atlas is an immersive workplace simulation for aspiring Project Coordinators, PMOs and Project Managers.",
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
  country: z.string().trim().min(1, "Country is required").max(80),
  experience_level: z.string().trim().min(1, "Pick an experience level").max(60),
});

/* ------------------------------------------------------------------ */
/*  Landing                                                            */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it Works" },
  { href: "#experience", label: "Experience" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
];

function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav scrolled={scrolled} />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Experience />
        <WhyAtlas />
        <Founder />
        <EarlyAccess />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reveal helper                                                      */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any;
  return (
    <Comp
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={[
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      ].join(" ")}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <AtlasMark className="h-6 w-6" />
          Atlas
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <a
            href="#early-access"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_12px_28px_-12px_rgba(217,119,6,0.7)]"
          >
            Request Early Access
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

function AtlasMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "grid place-items-center rounded-[8px] bg-primary text-primary-foreground font-display text-[13px] font-semibold",
        className,
      ].join(" ")}
    >
      A
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 lg:pt-28 lg:pb-32">
      {/* Soft ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%), radial-gradient(40% 35% at 0% 30%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-10">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now accepting early access
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,6.2vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.02em] text-foreground">
              Experience the workplace{" "}
              <span className="italic text-primary">before</span>{" "}
              you're in it.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Atlas is an immersive workplace simulation where aspiring Project Coordinators, PMOs and Project Managers experience real stakeholder communication, real documentation and real project decisions — before their first day on the job.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#early-access"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_30px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_18px_36px_-12px_rgba(217,119,6,0.7)]"
              >
                Request Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#experience"
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card"
              >
                <PlayCircle className="h-4 w-4 text-primary" />
                Watch 90-second Demo
              </a>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Built with real PM frameworks
              </div>
              <div className="hidden h-3 w-px bg-border sm:block" />
              <div className="hidden items-center gap-2 sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> First 100 get Founder Access
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={140} className="relative">
          <HeroInbox />
        </Reveal>
      </div>
    </section>
  );
}

function HeroInbox() {
  const messages = [
    { from: "Margaret Chen", role: "Sponsor", subject: "Friday Status Report", preview: "Need this updated before the board call.", priority: "high", time: "08:42" },
    { from: "Raj Patel", role: "PMO", subject: "RAID Log overdue", preview: "Risks weren't refreshed last week — please action.", priority: "high", time: "08:31" },
    { from: "Finance", role: "Priya Anand", subject: "Budget variance", preview: "Q3 is trending 12% over baseline.", priority: "medium", time: "Yesterday" },
    { from: "Vendor", role: "CareSoft Ltd", subject: "Integration questions", preview: "Spec clarifications needed for sprint 4.", priority: "low", time: "Yesterday" },
    { from: "Governance", role: "Rachel Stone", subject: "Board meeting Friday", preview: "Confirming charter sign-off prerequisites.", priority: "medium", time: "Mon" },
  ];
  const badge: Record<string, string> = {
    high: "bg-[oklch(0.62_0.18_25)]/12 text-[oklch(0.45_0.18_25)] border-[oklch(0.62_0.18_25)]/25",
    medium: "bg-primary/10 text-primary border-primary/25",
    low: "bg-[oklch(0.55_0.12_160)]/12 text-[oklch(0.4_0.12_160)] border-[oklch(0.55_0.12_160)]/25",
  };
  const label: Record<string, string> = { high: "Urgent", medium: "Action", low: "FYI" };

  return (
    <div className="relative">
      {/* Floating decoration */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[28px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 8%, transparent), transparent 70%)",
        }}
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_30px_80px_-30px_rgba(40,30,15,0.25)] backdrop-blur animate-[float_8s_ease-in-out_infinite]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.18_25)]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.14_85)]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.14_160)]/70" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" /> Inbox · 5 new
          </div>
          <div className="text-xs text-muted-foreground">Tue 08:42</div>
        </div>
        <ul className="divide-y divide-border/60">
          {messages.map((m, i) => (
            <li
              key={m.subject}
              className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/40"
              style={{ animation: `fade-in 0.6s ease-out both`, animationDelay: `${i * 80}ms` }}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                {m.from
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{m.from}</p>
                  <span className="truncate text-xs text-muted-foreground">· {m.role}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{m.time}</span>
                </div>
                <p className="mt-0.5 truncate font-display text-[15px] text-foreground">{m.subject}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.preview}</p>
              </div>
              <span
                className={`mt-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badge[m.priority]}`}
              >
                {label[m.priority]}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Social proof                                                       */
/* ------------------------------------------------------------------ */

function SocialProof() {
  const logos = ["PMI", "APM", "Scrum.org", "Microsoft", "Google", "Atlassian"];
  return (
    <section className="border-y border-border/60 bg-card/40 py-14">
      <div className="mx-auto max-w-7xl px-6 text-center lg:px-10">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Preparing the next generation of Project Professionals
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ul className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
            {logos.map((l) => (
              <li
                key={l}
                className="font-display text-lg font-medium tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                {l}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: Mail, title: "Real stakeholder inbox", body: "Sponsors, finance, vendors, governance — each writes in character. They remember what you ignore." },
  { icon: FileText, title: "Real project documentation", body: "Draft Charters, RAID Logs, Status Reports and Stakeholder Registers as actual deliverables." },
  { icon: Sparkles, title: "AI workplace review", body: "Workplace-grade AI scores your work on clarity, completeness, professionalism and governance." },
  { icon: GitBranch, title: "Decision consequences", body: "Every reply, every late deliverable shapes the project. The story bends to your choices." },
  { icon: Users, title: "Stakeholder management", body: "Track sentiment, manage expectations and recover relationships when things go sideways." },
  { icon: ShieldCheck, title: "Project governance", body: "Phase gates, change control, status reporting — the rituals real PMOs actually run." },
];

function Features() {
  return (
    <section id="features" className="py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="Features"
          title="Built to feel like the job, not a course."
          subtitle="Every surface in Atlas is a workplace surface. No multiple choice. No scripts. Just the work."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 60}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/70 p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-[0_24px_60px_-30px_rgba(40,30,15,0.25)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div className="inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works                                                       */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    { icon: Inbox, title: "Receive your inbox", body: "Sponsors, PMO and vendors brief you on the project's reality." },
    { icon: ListChecks, title: "Complete project work", body: "Write the charter, the RAID log, the status report. The real artefacts." },
    { icon: Workflow, title: "Submit deliverables", body: "Move work through To Do → In Progress → Submitted with full context." },
    { icon: Sparkles, title: "Receive AI feedback", body: "Workplace-grade review changes the story, your reputation and what happens next." },
  ];
  return (
    <section id="how" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="How it works"
          title="Four steps. One realistic week."
          subtitle="Atlas mirrors the rhythm of a real project week, compressed and coached."
        />
        <div className="relative mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-6 right-6 top-[34px] hidden h-px md:block"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 40%, transparent), transparent)",
            }}
          />
          <ol className="grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <li className="group relative h-full rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_50px_-25px_rgba(40,30,15,0.25)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-[0_6px_20px_-6px_rgba(217,119,6,0.7)]">
                      {i + 1}
                    </span>
                    <s.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-medium">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Experience showcase                                                */
/* ------------------------------------------------------------------ */

function Experience() {
  const slides: Array<{ tag: string; title: string; body: React.ReactNode }> = [
    {
      tag: "Inbox",
      title: "A real inbox, with people who remember.",
      body: <InboxSlide />,
    },
    {
      tag: "RAID Log",
      title: "Risks, assumptions, issues, dependencies.",
      body: <RaidSlide />,
    },
    {
      tag: "Status Report",
      title: "Weekly status, reviewed like the real thing.",
      body: <StatusSlide />,
    },
    {
      tag: "Stakeholder Register",
      title: "Sentiment, influence and what to do next.",
      body: <StakeholderSlide />,
    },
    {
      tag: "Meeting Notes",
      title: "Auto-captured minutes and decisions.",
      body: <MeetingSlide />,
    },
    {
      tag: "Project Charter",
      title: "Draft, review, sign-off.",
      body: <CharterSlide />,
    },
  ];

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section id="experience" className="py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="Experience"
          title="Look inside the simulation."
          subtitle="Six surfaces, one continuous story. Swipe through a day at Atlas."
        />

        <Reveal>
          <div className="mt-12">
            <Carousel opts={{ loop: true, align: "start" }} setApi={setApi}>
              <CarouselContent className="-ml-4">
                {slides.map((s) => (
                  <CarouselItem key={s.tag} className="basis-full pl-4 md:basis-[78%] lg:basis-[64%]">
                    <ExperienceCard tag={s.tag} title={s.title}>
                      {s.body}
                    </ExperienceCard>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {slides.map((s, i) => (
                  <button
                    type="button"
                    key={s.tag}
                    onClick={() => api?.scrollTo(i)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-all",
                      i === index
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {s.tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => api?.scrollPrev()}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70 text-foreground transition hover:-translate-y-0.5 hover:bg-card"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => api?.scrollNext()}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70 text-foreground transition hover:-translate-y-0.5 hover:bg-card"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ExperienceCard({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/80 shadow-[0_30px_80px_-40px_rgba(40,30,15,0.3)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.18_25)]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.14_85)]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.14_160)]/70" />
          <span className="ml-3 text-xs text-muted-foreground">atlas · {tag.toLowerCase()}</span>
        </div>
        <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          live
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_1.3fr]">
        <div className="border-b border-border/60 p-7 md:border-b-0 md:border-r">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">{tag}</p>
          <h3 className="mt-3 font-display text-2xl font-medium tracking-tight">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Real surfaces, real artefacts. Atlas mirrors the tools your first PM job will hand you on day one.
          </p>
        </div>
        <div className="p-7">{children}</div>
      </div>
    </div>
  );
}

function InboxSlide() {
  const items = [
    { from: "Margaret Chen", sub: "Friday Status Report", tone: "Urgent" },
    { from: "Raj Patel", sub: "RAID log overdue", tone: "Action" },
    { from: "Finance", sub: "Budget variance", tone: "FYI" },
  ];
  return (
    <ul className="space-y-2.5">
      {items.map((m) => (
        <li key={m.sub} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-3">
          <div>
            <p className="text-xs text-muted-foreground">{m.from}</p>
            <p className="font-display text-sm">{m.sub}</p>
          </div>
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {m.tone}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RaidSlide() {
  const rows = [
    { k: "Risk", t: "Vendor delay on integration", o: "CareSoft", s: "H" },
    { k: "Issue", t: "Data migration scope gap", o: "James L.", s: "M" },
    { k: "Dep.", t: "Sign-off from Governance", o: "Rachel S.", s: "M" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full text-left text-sm">
        <thead className="bg-background/60 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Owner</th>
            <th className="px-3 py-2">Sev</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => (
            <tr key={r.t}>
              <td className="px-3 py-2 text-primary">{r.k}</td>
              <td className="px-3 py-2">{r.t}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.o}</td>
              <td className="px-3 py-2">{r.s}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusSlide() {
  const rags = [
    { k: "Scope", v: "Green" },
    { k: "Schedule", v: "Amber" },
    { k: "Budget", v: "Amber" },
    { k: "Quality", v: "Green" },
  ];
  const color: Record<string, string> = {
    Green: "bg-[oklch(0.7_0.14_160)]/15 text-[oklch(0.4_0.12_160)]",
    Amber: "bg-primary/15 text-primary",
    Red: "bg-[oklch(0.62_0.18_25)]/15 text-[oklch(0.45_0.18_25)]",
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {rags.map((r) => (
          <div key={r.k} className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.k}</div>
            <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color[r.v]}`}>{r.v}</div>
          </div>
        ))}
      </div>
      <p className="rounded-xl border border-border/60 bg-background/60 p-3 text-xs italic text-muted-foreground">
        "Solid week. Mitigation owners missing on two risks — sponsor will press on this Friday."
      </p>
    </div>
  );
}

function StakeholderSlide() {
  const people = [
    { n: "Margaret Chen", r: "Sponsor", s: 72 },
    { n: "Raj Patel", r: "PMO", s: 54 },
    { n: "Priya Anand", r: "Finance", s: 38 },
  ];
  return (
    <ul className="space-y-3">
      {people.map((p) => (
        <li key={p.n} className="rounded-xl border border-border/60 bg-background/60 px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{p.n}</p>
              <p className="text-xs text-muted-foreground">{p.r}</p>
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">{p.s}/100</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div className="h-full bg-primary transition-all" style={{ width: `${p.s}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MeetingSlide() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-background/60 p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Decision</p>
        <p className="mt-1 text-sm">Approve sprint 4 scope with vendor risk mitigation owner assigned.</p>
      </div>
      <div className="rounded-xl border border-border/60 bg-background/60 p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Minutes</p>
        <ul className="mt-1 space-y-1 text-sm text-foreground/90">
          <li>• RAID refreshed; two risks promoted to high.</li>
          <li>• Charter sign-off slipped to next Wed.</li>
          <li>• Finance to confirm budget reforecast by Fri.</li>
        </ul>
      </div>
    </div>
  );
}

function CharterSlide() {
  return (
    <div className="space-y-2">
      {[
        { k: "Project name", v: "Digital Care Records Rollout" },
        { k: "Sponsor", v: "Margaret Chen" },
        { k: "Budget", v: "£500,000" },
        { k: "Timeline", v: "6 months · 12 care homes" },
      ].map((r) => (
        <div key={r.k} className="flex items-baseline justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{r.k}</span>
          <span className="font-display text-sm">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Why Atlas                                                          */
/* ------------------------------------------------------------------ */

function WhyAtlas() {
  const rows = [
    { bad: "Memorise theory", good: "Make real decisions" },
    { bad: "Read templates", good: "Build actual documents" },
    { bad: "Multiple choice", good: "Workplace simulation" },
    { bad: "Generic feedback", good: "Stakeholder consequences" },
  ];
  return (
    <section className="py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="Why Atlas"
          title="Courses teach. Atlas rehearses."
          subtitle="The difference between knowing the theory and knowing what to do on a Monday morning."
        />
        <Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card/60 p-7 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Traditional courses</p>
              <h3 className="mt-3 font-display text-xl font-medium">Read, watch, repeat.</h3>
              <ul className="mt-5 space-y-3">
                {rows.map((r) => (
                  <li key={r.bad} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-background">
                      <X className="h-3 w-3" />
                    </span>
                    {r.bad}
                  </li>
                ))}
              </ul>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-7 shadow-[0_30px_80px_-40px_rgba(217,119,6,0.45)] md:scale-[1.02]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
                }}
              />
              <div className="relative">
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
                  Atlas
                </p>
                <h3 className="mt-3 font-display text-xl font-medium">Live the work.</h3>
                <ul className="mt-5 space-y-3">
                  {rows.map((r) => (
                    <li key={r.good} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                      {r.good}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card/60 p-7 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">The outcome</p>
              <h3 className="mt-3 font-display text-xl font-medium">Walk in ready.</h3>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Atlas graduates have already lived the cadence of a real project — the inbox, the artefacts, the awkward Friday calls. The first day at work feels familiar.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Built with PMI, APM and PRINCE2 in mind.
              </div>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Founder                                                            */
/* ------------------------------------------------------------------ */

function Founder() {
  return (
    <section id="about" className="py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Founder note</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.25rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            Built by someone who lived the problem.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="mx-auto mt-10 max-w-2xl space-y-5 text-left text-lg leading-relaxed text-muted-foreground">
            <p>I built TryNextRole to help people get interviews.</p>
            <p>Then I realised the biggest challenge begins after getting hired.</p>
            <p className="text-foreground/90">
              Atlas helps aspiring professionals experience real project work — before they ever enter the workplace.
            </p>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="mx-auto mt-10 inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-display text-sm font-semibold">
              DR
            </span>
            <div className="text-left">
              <p className="font-display text-sm font-medium">Dolapo Rasaq</p>
              <p className="text-xs text-muted-foreground">Founder, Atlas</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Early access                                                       */
/* ------------------------------------------------------------------ */

const EXPERIENCE_LEVELS = [
  "Student / new graduate",
  "0–1 years",
  "1–3 years",
  "3–5 years",
  "5+ years",
];

function EarlyAccess() {
  const [form, setForm] = useState({ name: "", email: "", role: "", country: "", level: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({
      name: form.name,
      email: form.email,
      desired_role: form.role,
      country: form.country,
      experience_level: form.level,
    });
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
    setForm({ name: "", email: "", role: "", country: "", level: "" });
  }

  return (
    <section id="early-access" className="py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[28px] border border-border bg-card/80 p-8 shadow-[0_40px_120px_-40px_rgba(40,30,15,0.35)] backdrop-blur sm:p-12"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(50% 80% at 90% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
              }}
            />
            <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
              <div className="flex flex-col justify-center">
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Early access
                </p>
                <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em]">
                  Start your first day at Atlas.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  We're onboarding aspiring coordinators, PMOs and PMs in small cohorts. Tell us where you're heading and we'll send your invitation.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Only the first 100 users will receive Founder Access.
                </p>
              </div>

              <div>
                {done ? (
                  <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-background/60 p-8">
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
                  <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-background/70 p-6 backdrop-blur sm:p-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name">
                        <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Alex Morgan" maxLength={100} required />
                      </Field>
                      <Field label="Email">
                        <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="alex@example.com" maxLength={255} required />
                      </Field>
                      <Field label="Target role">
                        <Input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="Project Coordinator" maxLength={100} required />
                      </Field>
                      <Field label="Country">
                        <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="United Kingdom" maxLength={80} required />
                      </Field>
                      <Field label="Current experience level" className="sm:col-span-2">
                        <select
                          value={form.level}
                          onChange={(e) => update("level", e.target.value)}
                          required
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="" disabled>Select…</option>
                          {EXPERIENCE_LEVELS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full rounded-full py-5 text-sm font-medium">
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Join Early Access <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      By submitting you agree to receive an invitation email. No spam.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

function Faq() {
  const items = [
    {
      q: "Who is Atlas for?",
      a: "Aspiring Project Coordinators, PMO analysts and Project Managers who want to experience the workplace before their first role.",
    },
    {
      q: "Is this another course?",
      a: "No. Atlas is a simulation. You don't watch lessons — you read inboxes, draft documents and make decisions with consequences.",
    },
    {
      q: "How long does the simulation run?",
      a: "Each cohort runs across 6 in-game weeks of project time, paced to fit around real life.",
    },
    {
      q: "Will I have a portfolio at the end?",
      a: "Yes. You'll finish with Charters, RAID Logs, Status Reports and Meeting Minutes you actually wrote.",
    },
  ];
  return (
    <section id="faq" className="border-t border-border/60 py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="FAQ"
          title="Quiet questions, honest answers."
          centered={false}
        />
        <div className="mt-10 divide-y divide-border/60 rounded-2xl border border-border bg-card/60 backdrop-blur">
          {items.map((it) => (
            <details key={it.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                <span className="font-display text-base font-medium">{it.q}</span>
                <span className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <AtlasMark className="h-6 w-6" /> Atlas
          </Link>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            An immersive workplace simulation for aspiring Project Coordinators, PMOs and Project Managers.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product</p>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-foreground/80 transition hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Connect</p>
          <ul className="mt-4 flex items-center gap-3">
            {[
              { icon: Twitter, href: "#" },
              { icon: Linkedin, href: "#" },
              { icon: Github, href: "#" },
            ].map(({ icon: Icon, href }, i) => (
              <li key={i}>
                <a
                  href={href}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center lg:px-10">
          <p>© {new Date().getFullYear()} Atlas. The companies and projects are fictional; the work is real practice.</p>
          <p>Made with care for the next generation of PMs.</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared                                                              */
/* ------------------------------------------------------------------ */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  centered = true,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Reveal>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      </Reveal>
      <Reveal delay={100}>
        <h2 className="mt-4 font-display text-[clamp(1.85rem,3.6vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.02em]">
          {title}
        </h2>
      </Reveal>
      {subtitle ? (
        <Reveal delay={180}>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </Reveal>
      ) : null}
    </div>
  );
}