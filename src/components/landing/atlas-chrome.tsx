import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Linkedin, Twitter, Github } from "lucide-react";
import atlasMarkAsset from "@/assets/atlas-mark.png.asset.json";

export function AtlasMark({ className = "" }: { className?: string }) {
  return (
    <img
      src={atlasMarkAsset.url}
      alt="Atlas"
      className={["object-contain", className].join(" ")}
      draggable={false}
    />
  );
}

/** Scroll-reveal wrapper matching the main Atlas homepage motion. */
export function Reveal({
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
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
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

export const EXPERIENCE_NAV = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#experience", label: "Experience" },
  { href: "#receive", label: "What You Receive" },
  { href: "#price", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** The Atlas site navigation, shared by the homepage and the paid experience page. */
export function AtlasNav({
  links = EXPERIENCE_NAV,
  onPrimary,
  primaryLabel = "Start Experience",
}: {
  links?: Array<{ href: string; label: string }>;
  onPrimary?: () => void;
  primaryLabel?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-10">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-xl font-semibold tracking-tight sm:text-2xl"
        >
          <AtlasMark className="h-9 w-9 sm:h-10 sm:w-10" />
          Atlas
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            Log In
          </Link>
          <button
            type="button"
            onClick={onPrimary}
            className="group inline-flex items-center gap-1.5 rounded-full bg-accent-orange px-4 py-2 text-sm font-medium text-accent-orange-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-12px_rgba(217,119,6,0.6)] transition-all hover:-translate-y-0.5"
          >
            {primaryLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

/** The Atlas site footer, shared by the homepage and the paid experience page. */
export function AtlasFooter({ links = EXPERIENCE_NAV }: { links?: Array<{ href: string; label: string }> }) {
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
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground/80">
            Atlas provides simulated workplace experience. It is not employment, is not an accredited
            qualification, and is not affiliated with or endorsed by any healthcare organisation.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Experience</p>
          <ul className="mt-4 space-y-2 text-sm">
            {links.map((l) => (
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
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <li key={i}>
                <a
                  href="#"
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
          <p>atlassim.co</p>
        </div>
      </div>
    </footer>
  );
}
