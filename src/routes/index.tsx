import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Mail,
  ListChecks,
  FileText,
  Sparkles,
  Loader2,
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
import atlasLogo from "@/assets/atlas-logo.png.asset.json";
import { AutoDemo } from "@/components/auto-demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas | Learn by Managing Realistic Projects" },
      {
        name: "description",
        content:
          "Atlas is a workplace simulation platform where professionals learn by managing realistic projects, working with stakeholders, meetings, budgets, risks, and project decisions.",
      },
      { property: "og:title", content: "Atlas | Learn by Managing Realistic Projects" },
      {
        property: "og:description",
        content:
          "The platform where professionals learn by managing realistic projects. Learn by doing — not by watching.",
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
        <AutoDemo />
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
            className="inline-flex rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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

function OwnerOnlySignIn() {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("owner") === "1") {
        window.localStorage.setItem("atlas_owner", "1");
      }
      if (params.get("owner") === "0") {
        window.localStorage.removeItem("atlas_owner");
      }
      setIsOwner(window.localStorage.getItem("atlas_owner") === "1");
    } catch {
      // ignore
    }
  }, []);
  if (!isOwner) return null;
  return (
    <Link
      to="/auth"
      className="inline-flex rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      Sign in
    </Link>
  );
}

function AtlasMark({ className = "" }: { className?: string }) {
  return (
    <img
      src={atlasLogo.url}
      alt="Atlas"
      className={["object-contain", className].join(" ")}
      draggable={false}
    />
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
              Now accepting Founder Access
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,6.2vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.02em] text-foreground">
              Experience the workplace before you&rsquo;re{" "}
              <span className="italic text-primary">in it</span>.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Experience realistic workplace scenarios, collaborate with stakeholders, make decisions, and build the confidence employers expect — all inside a safe, AI-powered simulation.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#early-access"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_30px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_18px_36px_-12px_rgba(217,119,6,0.7)]"
              >
                Start your first project
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#demo"
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card"
              >
                <PlayCircle className="h-4 w-4 text-primary" />
                Experience Atlas
              </a>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-foreground shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>
                  Learn by doing.{" "}
                  <span className="italic text-primary">Not by watching.</span>
                </span>
              </div>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
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
  return (
    <section className="border-y border-border/60 bg-card/40 py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground/80">
            Built around the frameworks and tools the industry already uses
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ul className="mt-10 grid grid-cols-2 items-center justify-items-center gap-x-10 gap-y-8 sm:grid-cols-3 md:grid-cols-6 [&>li]:opacity-80 [&>li]:transition-opacity hover:[&>li]:opacity-100">
            <li><LogoPMI /></li>
            <li><LogoAPM /></li>
            <li><LogoScrum /></li>
            <li><LogoMicrosoft /></li>
            <li><LogoGoogle /></li>
            <li><LogoAtlassian /></li>
          </ul>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground/70">
            Atlas references the methodologies of PMI, APM and Scrum.org, and mirrors workflows familiar to teams using Microsoft, Google and Atlassian tooling. Atlas is not affiliated with, endorsed by, or certified by any of these organisations.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* Brand-styled logo lockups (stylized, non-trademark) */
function LogoPMI() {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground font-display text-[11px] font-bold tracking-tight text-background">
        PM
      </span>
      <span className="text-left font-display text-[10px] leading-tight">
        <span className="block font-semibold">Project</span>
        <span className="block font-semibold">Management</span>
        <span className="block font-semibold">Institute.</span>
      </span>
    </div>
  );
}
function LogoAPM() {
  return <span className="font-display text-3xl font-light tracking-tight text-foreground/85">apm</span>;
}
function LogoScrum() {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M20 12a8 8 0 1 1-3-6.2" />
        <path d="M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-lg font-medium tracking-tight">Scrum<span className="align-super text-[9px]">.org</span></span>
    </div>
  );
}
function LogoMicrosoft() {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <div className="grid h-5 w-5 grid-cols-2 grid-rows-2 gap-[2px]">
        <span className="bg-[#F25022]" />
        <span className="bg-[#7FBA00]" />
        <span className="bg-[#00A4EF]" />
        <span className="bg-[#FFB900]" />
      </div>
      <span className="font-display text-lg font-normal tracking-tight">Microsoft</span>
    </div>
  );
}
function LogoGoogle() {
  const colors = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
  return (
    <span className="font-display text-2xl font-medium tracking-tight">
      {"Google".split("").map((c, i) => (
        <span key={i} style={{ color: colors[i] }}>{c}</span>
      ))}
    </span>
  );
}
function LogoAtlassian() {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M7.5 11.2L2 21h9.2c.3 0 .6-.2.7-.5L7.5 11.2z" opacity="0.85" />
        <path d="M11.4 3.2c-.2-.3-.6-.3-.8 0L5.8 13.4c2.7-1 5.8.2 7 2.9l2 4.2c.1.3.4.5.7.5H22L11.4 3.2z" />
      </svg>
      <span className="font-display text-lg font-semibold uppercase tracking-[0.04em]">Atlassian</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Features — every card is a real product surface                    */
/* ------------------------------------------------------------------ */

const FEATURES: Array<{
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  title: string;
  body: string;
  preview: React.ReactNode;
}> = [
  {
    icon: Mail,
    tag: "Inbox",
    title: "A live stakeholder inbox.",
    body: "Sponsors, finance, vendors, governance — each writes in character. They remember what you ignore.",
    preview: <PreviewInbox />,
  },
  {
    icon: FileText,
    tag: "Charter",
    title: "Real project documentation.",
    body: "Charters, RAID logs, status reports, stakeholder registers — drafted as actual deliverables.",
    preview: <PreviewCharter />,
  },
  {
    icon: Sparkles,
    tag: "AI Review",
    title: "Workplace-grade AI panel.",
    body: "Every artefact gets a structured review across clarity, completeness, governance and professionalism.",
    preview: <PreviewAiReview />,
  },
  {
    icon: GitBranch,
    tag: "Decisions",
    title: "Decisions with consequences.",
    body: "Every reply, every late deliverable shapes the project. The story — and your reputation — bends with you.",
    preview: <PreviewDecision />,
  },
  {
    icon: Users,
    tag: "Stakeholders",
    title: "Stakeholder management.",
    body: "Track sentiment and influence. Recover relationships before the Friday call.",
    preview: <PreviewStakeholders />,
  },
  {
    icon: ShieldCheck,
    tag: "Governance",
    title: "Project governance & gates.",
    body: "Phase gates, change control, weekly reporting — the rituals real PMOs actually run.",
    preview: <PreviewGate />,
  },
];

function Features() {
  return (
    <section id="features" className="py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="The product"
          title="You're not reading about project management. You're already doing it."
          subtitle="Every surface in Atlas is a workplace surface. No quizzes, no theory cards — just the tools your first PM job will hand you on day one."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, tag, title, body, preview }, i) => (
            <Reveal key={title} delay={i * 60}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_70px_-30px_rgba(40,30,15,0.3)]">
                <div className="border-b border-border/60 bg-background/40 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.65_0.18_25)]/70" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.14_85)]/80" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.14_160)]/70" />
                    <span className="ml-2">atlas · {tag.toLowerCase()}</span>
                  </div>
                </div>
                <div className="relative px-5 pt-5 pb-1">{preview}</div>
                <div className="mt-auto px-6 pb-6 pt-5">
                  <div className="flex items-center gap-2 text-primary">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{tag}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-medium tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- mini product previews ----------------------------------------- */

function PreviewInbox() {
  const items = [
    { who: "MC", from: "Margaret Chen", sub: "Friday Status Report", tone: "Urgent", color: "bg-[oklch(0.62_0.18_25)]/15 text-[oklch(0.45_0.18_25)]" },
    { who: "RP", from: "Raj Patel", sub: "RAID log overdue", tone: "Action", color: "bg-primary/15 text-primary" },
    { who: "PA", from: "Priya Anand", sub: "Budget variance", tone: "FYI", color: "bg-[oklch(0.55_0.12_160)]/15 text-[oklch(0.4_0.12_160)]" },
  ];
  return (
    <ul className="space-y-1.5">
      {items.map((m) => (
        <li key={m.sub} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold">{m.who}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-muted-foreground">{m.from}</p>
            <p className="truncate font-display text-[13px]">{m.sub}</p>
          </div>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${m.color}`}>{m.tone}</span>
        </li>
      ))}
    </ul>
  );
}

function PreviewCharter() {
  const rows = [
    { k: "Project", v: "Digital Care Records" },
    { k: "Sponsor", v: "Margaret Chen" },
    { k: "Budget", v: "£500,000" },
    { k: "Timeline", v: "6 months · 12 sites" },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>Charter · v0.4</span>
        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary">in review</span>
      </div>
      {rows.map((r) => (
        <div key={r.k} className="flex items-baseline justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.k}</span>
          <span className="font-display text-[12px]">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewAiReview() {
  const scores = [
    { k: "Clarity", v: 82 },
    { k: "Completeness", v: 68 },
    { k: "Governance", v: 57 },
  ];
  return (
    <div className="space-y-2.5">
      {scores.map((s) => (
        <div key={s.k}>
          <div className="mb-0.5 flex justify-between text-[11px] text-muted-foreground">
            <span>{s.k}</span>
            <span className="tabular-nums text-foreground">{s.v}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
            <div className="h-full bg-primary" style={{ width: `${s.v}%` }} />
          </div>
        </div>
      ))}
      <p className="rounded-lg border border-border/60 bg-background/60 p-2 text-[11px] italic leading-snug text-muted-foreground">
        "Risk section omits mitigation owners. Sponsor will press on this Friday."
      </p>
    </div>
  );
}

function PreviewDecision() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-[12px]">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Decision</span>
          <span>2 outcomes</span>
        </div>
        <p className="mt-1 font-display">Delay sprint 4 by 1 week?</p>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[oklch(0.62_0.18_25)]/30 bg-[oklch(0.62_0.18_25)]/10 px-3 py-1.5 text-[11px] text-[oklch(0.45_0.18_25)]">
        <span>Sponsor confidence</span>
        <span className="tabular-nums">−12</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[oklch(0.55_0.12_160)]/30 bg-[oklch(0.55_0.12_160)]/10 px-3 py-1.5 text-[11px] text-[oklch(0.4_0.12_160)]">
        <span>Vendor relationship</span>
        <span className="tabular-nums">+8</span>
      </div>
    </div>
  );
}

function PreviewStakeholders() {
  const ppl = [
    { n: "Margaret Chen", r: "Sponsor", s: 72 },
    { n: "Raj Patel", r: "PMO", s: 54 },
    { n: "Priya Anand", r: "Finance", s: 38 },
  ];
  return (
    <ul className="space-y-2">
      {ppl.map((p) => (
        <li key={p.n} className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium">{p.n}</p>
              <p className="text-[10px] text-muted-foreground">{p.r}</p>
            </div>
            <span className="tabular-nums text-[10px] text-muted-foreground">{p.s}/100</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border/60">
            <div className="h-full bg-primary" style={{ width: `${p.s}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PreviewGate() {
  const gates = [
    { k: "Initiation", state: "done" },
    { k: "Planning", state: "done" },
    { k: "Execution", state: "now" },
    { k: "Go-Live", state: "next" },
  ];
  return (
    <ol className="space-y-1.5">
      {gates.map((g) => {
        const cls =
          g.state === "done"
            ? "bg-[oklch(0.55_0.12_160)]/12 text-[oklch(0.4_0.12_160)] border-[oklch(0.55_0.12_160)]/30"
            : g.state === "now"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-background/60 text-muted-foreground border-border/60";
        const dot =
          g.state === "done" ? "bg-[oklch(0.55_0.12_160)]" : g.state === "now" ? "bg-primary animate-pulse" : "bg-border";
        return (
          <li key={g.k} className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 text-[12px] ${cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            <span className="font-display">{g.k}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider opacity-75">
              {g.state === "done" ? "passed" : g.state === "now" ? "in gate" : "queued"}
            </span>
          </li>
        );
      })}
    </ol>
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
      tag: "Team Chat",
      title: "Sponsors and vendors message you, in real time.",
      body: <ChatSlide />,
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
      tag: "Gantt",
      title: "A timeline that slips when you do.",
      body: <GanttSlide />,
    },
    {
      tag: "Approvals",
      title: "Phase gates and change control.",
      body: <ApprovalSlide />,
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

function ChatSlide() {
  const msgs = [
    { who: "Margaret Chen", role: "Sponsor", side: "left", text: "Are we still tracking green for Friday?", time: "09:14" },
    { who: "You", role: "Coordinator", side: "right", text: "Amber. RAID refresh slipped — owner reassigned, mitigations in by 4pm.", time: "09:16" },
    { who: "Raj Patel", role: "PMO", side: "left", text: "Need the status pack 24h before the board call please.", time: "09:18" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span># project-care-records</span>
        <span>3 online</span>
      </div>
      {msgs.map((m, i) => (
        <div key={i} className={`flex ${m.side === "right" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.side === "right" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border/60 bg-background/70"}`}>
            <div className={`mb-0.5 text-[10px] uppercase tracking-wider ${m.side === "right" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {m.who} · {m.role} · {m.time}
            </div>
            <p className="leading-snug">{m.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GanttSlide() {
  const rows = [
    { k: "Initiation", start: 0, len: 18, state: "done" },
    { k: "Planning", start: 14, len: 26, state: "done" },
    { k: "Pilot rollout", start: 36, len: 30, state: "now" },
    { k: "Full rollout", start: 62, len: 26, state: "next" },
    { k: "Closure", start: 84, len: 14, state: "next" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>Timeline · 6 months</span>
        <span>Today · Wk 12</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const color =
            r.state === "done"
              ? "bg-[oklch(0.55_0.12_160)]/70"
              : r.state === "now"
                ? "bg-primary"
                : "bg-border";
          return (
            <div key={r.k} className="grid grid-cols-[110px_1fr] items-center gap-2">
              <span className="truncate text-[11px] text-muted-foreground">{r.k}</span>
              <div className="relative h-3 rounded-full bg-background/60 ring-1 ring-border/60">
                <div
                  className={`absolute top-0 h-3 rounded-full ${color}`}
                  style={{ left: `${r.start}%`, width: `${r.len}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalSlide() {
  const steps = [
    { who: "Coordinator", state: "done", note: "Submitted" },
    { who: "PMO · Raj Patel", state: "done", note: "Reviewed" },
    { who: "Sponsor · Margaret Chen", state: "now", note: "Pending sign-off" },
    { who: "Governance Board", state: "next", note: "Queued" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-[11px]">
        <span className="text-muted-foreground">Change Request · CR-014</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">In review</span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => {
          const cls =
            s.state === "done"
              ? "border-[oklch(0.55_0.12_160)]/30 bg-[oklch(0.55_0.12_160)]/10 text-[oklch(0.4_0.12_160)]"
              : s.state === "now"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-background/60 text-muted-foreground";
          return (
            <li key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[12px] ${cls}`}>
              <span className="font-display">{s.who}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-80">{s.note}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Why Atlas                                                          */
/* ------------------------------------------------------------------ */

function WhyAtlas() {
  const rows = [
    { bad: "Read about projects", good: "Run projects" },
    { bad: "Watch videos", good: "Make decisions" },
    { bad: "Take quizzes", good: "Handle stakeholders" },
    { bad: "Study templates", good: "Build real documents" },
    { bad: "Earn certificates", good: "Gain experience" },
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
              Atlas helps aspiring and early-career professionals — coordinators, PMOs, business analysts, scrum masters, change managers and project managers — gain real-world experience by managing realistic projects before stepping into them at work.
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
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteUrl = referralCode ? `https://atlassim.co/invite/${referralCode}` : "";

  useEffect(() => {
    if (!referralCode) return;
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.rpc("referral_stats", { code: referralCode });
        if (active && typeof data === "number") setReferralCount(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [referralCode]);

  async function onShare() {
    const url = inviteUrl || "https://atlassim.co";
    const shareData = {
      title: "Atlas — Founder Cohort",
      text:
        "I'm one of the first members of the Atlas Founder Cohort.\n\nAtlas is the platform where professionals learn by managing realistic projects — responding to stakeholders, running meetings, managing budgets and making decisions that affect outcomes.\n\nThought you might like it too.\n\nJoin the Founder Cohort:",
      url,
    };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Couldn't copy link. Please copy manually: ${url}`);
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link.");
    }
  }

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
    let ok = false;
    let returnedCode: string | null = null;
    try {
      let referredBy: string | null = null;
      try {
        referredBy = window.localStorage.getItem("atlas_ref");
      } catch {
        // ignore
      }
      const res = await fetch("/api/public/early-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, referred_by_code: referredBy || undefined }),
      });
      ok = res.ok;
      if (ok) {
        try {
          const j = await res.json();
          returnedCode = j?.referral_code ?? null;
        } catch {
          // ignore
        }
      }
    } catch {
      ok = false;
    }
    setSubmitting(false);
    if (!ok) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setReferralCode(returnedCode);
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
                  Step into your first project.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  We're onboarding aspiring and early-career professionals — coordinators, PMOs, business analysts, scrum masters, delivery and change managers — in small cohorts. Tell us where you're heading and we'll send your invitation.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Join the Atlas Founder Cohort — the first 100 professionals shaping Atlas.
                </p>
              </div>

              <div>
                {done ? (
                  <WelcomeCard
                    referralCode={referralCode}
                    referralCount={referralCount}
                    inviteUrl={inviteUrl}
                    onShare={onShare}
                    copied={copied}
                    onCopyLink={copyInviteLink}
                    linkCopied={linkCopied}
                    onReset={() => {
                      setDone(false);
                      setReferralCode(null);
                      setReferralCount(null);
                    }}
                  />
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
/*  Welcome card (post-signup)                                         */
/* ------------------------------------------------------------------ */

function WelcomeCard({
  referralCode,
  referralCount,
  inviteUrl,
  onShare,
  copied,
  onCopyLink,
  linkCopied,
  onReset,
}: {
  referralCode: string | null;
  referralCount: number | null;
  inviteUrl: string;
  onShare: () => void;
  copied: boolean;
  onCopyLink: () => void;
  linkCopied: boolean;
  onReset: () => void;
}) {
  const firstWeek = [
    "Meet your Project Lead",
    "Receive your first stakeholder email",
    "Handle your first project issue",
    "Attend your first steering committee",
    "Deliver your first status report",
  ];
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-background/70 p-7 sm:p-8">
      {/* Welcome */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
          🎉 Congratulations
        </p>
        <h3 className="mt-3 font-display text-[clamp(1.6rem,3vw,2rem)] font-medium leading-[1.1] tracking-[-0.01em]">
          Welcome aboard.
        </h3>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>You're officially on the Atlas Founder Access list.</p>
          <p>Your first day at Atlas is getting closer.</p>
          <p>
            We'll invite you to your first day at Atlas as soon as your workspace is ready.
          </p>
          <p>
            Before launch, we'll send your onboarding pack, project invitation
            and everything you need to begin your journey.
          </p>
        </div>
      </div>

      {/* First week preview */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Here's what your first week at Atlas will look like
        </p>
        <ul className="mt-4 space-y-2.5">
          {firstWeek.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-foreground">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Founder Cohort badge */}
      <div
        className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-5 shadow-[0_20px_60px_-30px_rgba(217,119,6,0.45)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 70% at 0% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xl shadow-[0_8px_20px_-8px_rgba(217,119,6,0.6)]">
            🏅
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Founder Cohort
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              You're one of the first 100 professionals helping shape Atlas
              from the very beginning.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              As a Founder Cohort member, you'll receive early access,
              exclusive updates and the opportunity to influence the future
              of Atlas.
            </p>
          </div>
        </div>
      </div>

      {/* Invitation */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-5">
        <h4 className="font-display text-lg">
          Know someone who manages projects?
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Atlas is the platform where professionals learn by managing realistic projects. Invite a coordinator, PMO, business analyst, scrum master or delivery lead who'd benefit from real practice before doing it for real.
        </p>

        {referralCode ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2">
            <span className="truncate font-mono text-xs text-foreground">
              {inviteUrl}
            </span>
            <button
              type="button"
              onClick={onCopyLink}
              className="ml-auto shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
            >
              {linkCopied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={onShare}
          className="mt-4 w-full rounded-full bg-primary px-5 py-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {copied ? (
            "Link copied!"
          ) : (
            <>
              Invite a professional <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-primary" />
          {referralCount && referralCount > 0
            ? `${referralCount} professional${referralCount === 1 ? "" : "s"} joined through your invitation.`
            : "You're helping build the first Atlas community."}
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Submit another
      </button>
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
      a: "Professionals who manage projects — aspiring and early-career coordinators, PMOs, business analysts, scrum masters, delivery managers, change managers and project managers who want practical experience before doing it for real.",
    },
    {
      q: "Is this another course?",
      a: "No. Atlas is a workplace simulation platform. You don't watch lessons — you manage realistic projects, respond to stakeholders, run meetings and make decisions with consequences.",
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
            The platform where professionals learn by managing realistic projects.
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
          <p>Made with care for professionals who learn by doing.</p>
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