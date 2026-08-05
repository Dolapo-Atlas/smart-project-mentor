import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listDocuments } from "@/lib/sim.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarRange, FileText } from "lucide-react";
import { LockedModuleGate } from "@/components/dashboard/locked-module-gate";

export const Route = createFileRoute("/_authenticated/app/gantt")({
  head: () => ({
    meta: [
      { title: "Gantt Chart — Atlas" },
      {
        name: "description",
        content:
          "Visual timeline of your project schedule — milestones and phases rendered from your submitted Project Schedule.",
      },
    ],
  }),
  component: GatedGanttPage,
});

type Row = { label: string; date: Date; kind: "milestone" | "phase" };

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDate(raw: string, fallbackYear: number): Date | null {
  const s = raw.trim().toLowerCase();
  // ISO yyyy-mm-dd
  const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  // "12 sep" or "12 sep 2025"
  const dmy = s.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\w*)?(?:\s+(\d{4}))?/);
  if (dmy) {
    const day = +dmy[1];
    const month = MONTHS[dmy[2]];
    const year = dmy[3] ? +dmy[3] : fallbackYear;
    return new Date(year, month, day);
  }
  // "sep 12" or "sep 12 2025"
  const mdy = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  if (mdy) {
    const day = +mdy[2];
    const month = MONTHS[mdy[1]];
    const year = mdy[3] ? +mdy[3] : fallbackYear;
    return new Date(year, month, day);
  }
  return null;
}

function extractRows(markdown: string): Row[] {
  const rows: Row[] = [];
  const nowYear = new Date().getFullYear();
  const lines = markdown.split(/\r?\n/);
  let section: "milestones" | "phases" | "other" = "other";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#+\s*.*milestone/i.test(line)) { section = "milestones"; continue; }
    if (/^#+\s*.*phase/i.test(line)) { section = "phases"; continue; }
    if (/^#+\s/.test(line)) { section = "other"; continue; }

    // A line with a date somewhere in it. Support "Label — 12 Sep" or "Label: 12 Sep".
    const d = parseDate(line, nowYear);
    if (!d) continue;
    const label = line
      .replace(/[—–\-:•·]\s*.*$/, "")
      .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, "")
      .replace(/\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+\d{4})?/gi, "")
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:,?\s+\d{4})?/gi, "")
      .replace(/^[\-*•\d.\s]+/, "")
      .trim() || "(untitled)";
    rows.push({
      label: label.slice(0, 60),
      date: d,
      kind: section === "phases" ? "phase" : "milestone",
    });
  }
  return rows.sort((a, b) => +a.date - +b.date);
}

function GanttPage() {
  const listFn = useServerFn(listDocuments);
  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listFn({}),
  });

  const schedule = useMemo(() => {
    if (!docs) return null;
    const list = docs as Array<{ id: string; title: string; content_excerpt: string | null; created_at: string }>;
    return list.find((d) => /schedule/i.test(d.title)) ?? null;
  }, [docs]);

  const rows = useMemo(() => {
    if (!schedule?.content_excerpt) return [];
    return extractRows(schedule.content_excerpt);
  }, [schedule]);

  const range = useMemo(() => {
    if (rows.length === 0) return null;
    const min = +rows[0].date;
    const max = +rows[rows.length - 1].date;
    const span = Math.max(max - min, 1000 * 60 * 60 * 24 * 7); // at least a week
    return { min, max: min + span, span };
  }, [rows]);

  return (
    <div className="mx-auto max-w-5xl pb-24">
      {/* Header */}
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-orange">
            Timeline View
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Gantt Chart
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A visual read of your submitted{" "}
            <em className="font-medium not-italic text-foreground/80">Project Schedule</em>.
            Milestones and phases are synchronized automatically — edit the schedule to update this
            view.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 self-start rounded-xl">
          <Link to="/app/template/$kind" params={{ kind: "project_schedule" }}>
            <FileText className="mr-2 h-4 w-4" /> Edit schedule
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading schedule…</div>
      ) : !schedule ? (
        <EmptyState
          icon={<CalendarRange className="mx-auto h-8 w-8 text-muted-foreground" />}
          title="No Project Schedule yet"
          description="The Gantt view reads dated milestones from your submitted Project Schedule. Fill the template first — you'll see bars appear here automatically."
          cta="Open Project Schedule"
          ctaTo="/app/template/$kind"
          ctaParams={{ kind: "project_schedule" }}
        />
      ) : rows.length === 0 || !range ? (
        <EmptyState
          title="No dated milestones found"
          description="Your Project Schedule is saved, but the Gantt renderer couldn't find dated lines (e.g. 'Charter approved — 12 Sep' or '2025-09-12'). Add dates to your milestones and phases."
          cta="Edit schedule"
          ctaTo="/app/template/$kind"
          ctaParams={{ kind: "project_schedule" }}
          variant="outline"
        />
      ) : (
        <GanttChart rows={rows} range={range} />
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  cta,
  ctaTo,
  ctaParams,
  variant = "default",
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  ctaTo: string;
  ctaParams: Record<string, string>;
  variant?: "default" | "outline";
}) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-border/70 bg-card/60 p-8 text-center backdrop-blur-sm">
      {icon && <div className="mb-3">{icon}</div>}
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-5 rounded-xl" variant={variant}>
        <Link to={ctaTo as any} params={ctaParams as any}>
          {cta}
        </Link>
      </Button>
    </div>
  );
}

function formatShort(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function formatMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
}

function GanttChart({
  rows,
  range,
}: {
  rows: Row[];
  range: { min: number; max: number; span: number };
}) {
  const pct = (t: number) => ((t - range.min) / range.span) * 100;

  const phaseRows = rows.filter((r) => r.kind === "phase");
  const milestoneRows = rows.filter((r) => r.kind === "milestone");

  const phaseBars = phaseRows.map((p, i) => {
    const start = +p.date;
    const end = i + 1 < phaseRows.length ? +phaseRows[i + 1].date : range.max;
    return { label: p.label, start, end };
  });

  // Month gridlines
  const gridDates: Date[] = [];
  const cursor = new Date(range.min);
  cursor.setDate(1);
  while (+cursor <= range.max) {
    gridDates.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="mt-8">
      {/* Glass timeline card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-xl shadow-primary/5 backdrop-blur-xl">
        {/* Subtle top accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent-orange to-primary opacity-60" />

        {/* Scrollable timeline area */}
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="relative min-w-[700px] p-6 sm:p-8">
            {/* Date range header */}
            <div className="mb-8 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="rounded-full bg-secondary/60 px-2.5 py-1">
                {formatShort(new Date(range.min))}
              </span>
              <span className="rounded-full bg-secondary/60 px-2.5 py-1">
                {formatShort(new Date(range.max))}
              </span>
            </div>

            {/* Month gridlines */}
            <div className="pointer-events-none absolute inset-x-6 top-16 bottom-24 sm:inset-x-8">
              {gridDates.map((g, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-dashed border-border/60"
                  style={{ left: `${pct(+g)}%` }}
                >
                  <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {formatMonth(g)}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart body */}
            <div className="relative pt-8">
              {/* Phase bars */}
              {phaseBars.length > 0 && (
                <div className="mb-10">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phases
                  </div>
                  <div className="space-y-3">
                    {phaseBars.map((b, i) => {
                      const left = pct(b.start);
                      const width = Math.max(pct(b.end) - left, 1.5);
                      return (
                        <div key={i} className="relative h-7">
                          <div
                            className="absolute top-0 flex h-7 items-center overflow-hidden rounded-full bg-primary/90 px-3 text-[11px] font-semibold text-primary-foreground shadow-md shadow-primary/10 transition-transform hover:scale-[1.01]"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${b.label} · ${formatShort(new Date(b.start))} → ${formatShort(new Date(b.end))}`}
                          >
                            <span className="truncate">{b.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {milestoneRows.length > 0 && (
                <div className="pt-2">
                  <div className="mb-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Milestones
                  </div>
                  <div className="relative h-[180px]">
                    {milestoneRows.map((m, i) => {
                      // Stagger vertically so labels don't overlap
                      const topPct = (i % 3) * 30;
                      return (
                        <div
                          key={i}
                          className="absolute flex -translate-x-1/2 flex-col items-center transition-transform hover:scale-105"
                          style={{ left: `${pct(+m.date)}%`, top: `${topPct}%` }}
                          title={`${m.label} · ${formatShort(m.date)}`}
                        >
                          <div className="relative">
                            <div className="h-3.5 w-3.5 rotate-45 bg-accent-orange shadow-[0_0_14px_rgba(249,115,22,0.45)] ring-4 ring-accent-orange/15" />
                          </div>
                          <div className="mt-3 text-center">
                            <p className="whitespace-nowrap text-[11px] font-bold text-foreground">
                              {m.label}
                            </p>
                            <p className="whitespace-nowrap text-[10px] text-muted-foreground">
                              {formatShort(m.date)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer legend */}
        <div className="flex items-center gap-6 border-t border-border/40 bg-secondary/30 px-6 py-4 sm:px-8">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="h-2.5 w-4 rounded-full bg-primary/90" /> Phase
          </span>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="h-2.5 w-2.5 rotate-45 bg-accent-orange shadow-[0_0_8px_rgba(249,115,22,0.4)]" />{" "}
            Milestone
          </span>
        </div>
      </div>

    </div>
  );
}

function GatedGanttPage() {
  return (
    <LockedModuleGate>
      <GanttPage />
    </LockedModuleGate>
  );
}
