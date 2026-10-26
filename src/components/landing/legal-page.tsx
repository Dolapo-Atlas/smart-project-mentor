import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AtlasMark } from "@/components/landing/atlas-chrome";

export const COMPANY_LINE =
  "Atlassim Technologies Ltd. Registered in England and Wales. Company No. 17378309. Registered office: 12 Beacon Place, Bletchley, Milton Keynes, MK2 2AG, United Kingdom.";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
            <AtlasMark className="h-8 w-8" /> Atlas
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
        <div className="mt-8 space-y-5 text-base leading-relaxed text-foreground/85 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-accent-orange [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-3xl space-y-3 px-6 py-8 text-xs text-muted-foreground">
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Use</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </nav>
          <p>{COMPANY_LINE}</p>
        </div>
      </footer>
    </div>
  );
}

export function legalHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | Atlas` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | Atlas` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
