import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, ClipboardCopy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AtlasMark } from "@/components/landing/atlas-chrome";
import type { Guide } from "@/lib/toolkit/content";
import { GUIDES } from "@/lib/toolkit/content";

/**
 * Renders one public toolkit guide. Free to read, no sign-in, mobile-first.
 * Every route into the app carries a source tag so signups stop reading
 * as "direct" in the tracking view.
 */

export function toolkitCta(utm: string, path = "/auth?mode=signup") {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}utm_source=google&utm_medium=organic&utm_campaign=toolkit&utm_content=${utm}`;
}

function TemplateBlock({ guide }: { guide: Guide }) {
  const [copied, setCopied] = useState(false);

  const plain = [
    guide.template.heading,
    "",
    ...guide.template.fields.map((f) => `${f.label}: `),
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="mt-12 rounded-3xl border border-surface-navy-border bg-surface-navy p-6 text-surface-navy-accent sm:p-8">
      <h2 className="font-display text-2xl font-medium">{guide.template.heading}</h2>
      <p className="mt-2 max-w-2xl text-sm opacity-80">{guide.template.intro}</p>

      <ul className="mt-6 space-y-3">
        {guide.template.fields.map((f) => (
          <li
            key={f.label}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
          >
            <p className="text-sm font-medium">{f.label}</p>
            <p className="mt-0.5 text-xs opacity-75">{f.hint}</p>
          </li>
        ))}
      </ul>

      <Button onClick={copy} variant="secondary" className="mt-6 w-full sm:w-auto">
        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy the blank template"}
      </Button>
    </section>
  );
}

export function GuidePage({ guide }: { guide: Guide }) {
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-semibold">
            <AtlasMark className="h-6 w-6" /> Atlas
          </Link>
          <Link
            to="/toolkit"
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Project toolkit
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Free guide</p>
        <h1 className="mt-3 font-display text-3xl font-medium leading-tight sm:text-4xl">
          {guide.h1}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{guide.standFirst}</p>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {guide.readMinutes} minute read · no sign-up needed
        </p>

        {guide.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-display text-xl font-medium sm:text-2xl">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-3 leading-relaxed text-foreground/85">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-4 space-y-2.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-foreground/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-12">
          <h2 className="font-display text-xl font-medium sm:text-2xl">{guide.example.caption}</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {guide.example.columns.map((c) => (
                    <th key={c} className="px-4 py-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.example.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-foreground/85">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <TemplateBlock guide={guide} />

        <section className="mt-12">
          <h2 className="font-display text-xl font-medium sm:text-2xl">Common questions</h2>
          <div className="mt-4 space-y-4">
            {guide.faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-card/60 p-5">
                <p className="font-medium">{f.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-surface-orange-border bg-surface-orange p-6 sm:p-8">
          <h2 className="font-display text-2xl font-medium">{guide.cta.heading}</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/80">{guide.cta.body}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href={toolkitCta(guide.cta.utm)}>
                {guide.cta.label} <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={toolkitCta(guide.cta.utm, "/challenge/friday-crisis")}>
                Or try a 3-minute decision challenge
              </a>
            </Button>
          </div>
        </section>

        <section className="mt-12 border-t border-border/60 pt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            More free guides
          </p>
          <ul className="mt-4 space-y-3">
            {others.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/toolkit/${g.slug}` as string}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 px-5 py-4 transition hover:-translate-y-0.5"
                >
                  <span className="font-medium">{g.h1}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}

/** Article + FAQ structured data, so search results can show the questions. */
export function guideJsonLd(guide: Guide) {
  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.h1,
      description: guide.metaDescription,
      author: { "@type": "Organization", name: "Atlassim Technologies Limited" },
      publisher: { "@type": "Organization", name: "Atlas" },
      mainEntityOfPage: `https://atlassim.co/toolkit/${guide.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ]);
}
