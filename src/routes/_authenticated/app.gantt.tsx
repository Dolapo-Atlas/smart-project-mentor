import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listDocuments } from "@/lib/sim.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarRange, FileText } from "lucide-react";

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
  component: GanttPage,
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
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timeline view</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">Gantt Chart</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A visual read of your submitted <em>Project Schedule</em>. Milestones and phases with
            dates are placed on a horizontal timeline. Edit the schedule to update this view — no
            separate data to maintain.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/template/$kind" params={{ kind: "project_schedule" }}>
            <FileText className="mr-2 h-4 w-4" /> Edit schedule
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading schedule…</div>
      ) : !schedule ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-semibold">No Project Schedule yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The Gantt view reads dated milestones from your submitted Project Schedule. Fill the
            template first — you'll see bars appear here automatically.
          </p>
          <Button asChild className="mt-4">
            <Link to="/app/template/$kind" params={{ kind: "project_schedule" }}>
              Open Project Schedule
            </Link>
          </Button>
        </div>
      ) : rows.length === 0 || !range ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <h2 className="font-display text-lg font-semibold">No dated milestones found</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Your Project Schedule is saved, but the Gantt renderer couldn't find dated lines
            (e.g. <em>Charter approved — 12 Sep</em> or <em>2025-09-12</em>). Add dates to your
            milestones and phases.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app/template/$kind" params={{ kind: "project_schedule" }}>
              Edit schedule
            </Link>
          </Button>
        </div>
      ) : (
        <GanttChart rows={rows} range={range} />
      )}
    </div>
  );
}

function formatShort(d: Date) {
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function GanttChart({
  rows,
  range,
}: {
  rows: Row[];
  range: { min: number; max: number; span: number };
}) {
  const pct = (t: number) => ((t - range.min) / range.span) * 100;

  // Bucket rows into phase bars (start→next) so the timeline shows durations,
  // while milestones stay as points.
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
    <div className="mt-6 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatShort(new Date(range.min))}</span>
        <span>{formatShort(new Date(range.max))}</span>
      </div>

      <div className="relative">
        {/* Month gridlines */}
        <div className="pointer-events-none absolute inset-0">
          {gridDates.map((g, i) => (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-dashed border-border/60"
              style={{ left: `${pct(+g)}%` }}
            >
              <div className="absolute -top-5 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.toLocaleDateString(undefined, { month: "short" })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-6">
          {phaseBars.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                Phases
              </div>
              {phaseBars.map((b, i) => {
                const left = pct(b.start);
                const width = Math.max(pct(b.end) - left, 1.5);
                return (
                  <div key={i} className="relative h-8">
                    <div
                      className="absolute top-1.5 flex h-5 items-center overflow-hidden rounded-md bg-primary/90 px-2 text-[11px] font-medium text-primary-foreground"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${b.label} · ${formatShort(new Date(b.start))} → ${formatShort(new Date(b.end))}`}
                    >
                      <span className="truncate">{b.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {milestoneRows.length > 0 && (
            <div className="pt-3">
              <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                Milestones
              </div>
              {milestoneRows.map((m, i) => (
                <div key={i} className="relative h-8">
                  <div
                    className="absolute top-2 flex -translate-x-1/2 items-center gap-1.5"
                    style={{ left: `${pct(+m.date)}%` }}
                    title={`${m.label} · ${formatShort(m.date)}`}
                  >
                    <span className="h-3 w-3 rotate-45 bg-accent-orange" />
                  </div>
                  <div
                    className="absolute top-6 -translate-x-1/2 whitespace-nowrap text-[11px] text-foreground/80"
                    style={{ left: `${pct(+m.date)}%` }}
                  >
                    {m.label} · {formatShort(m.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded bg-primary/90" /> Phase
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rotate-45 bg-accent-orange" /> Milestone
        </span>
      </div>
    </div>
  );
}