import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { previewOutcome, finalizeRun, getMyOutcome } from "@/lib/outcomes.functions";
import { Button } from "@/components/ui/button";
import { Award, Share2, Download, ArrowRight, Sparkles, Trophy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/results")({
  component: ResultsPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  stakeholders: "Stakeholder confidence",
  tasks: "Task delivery",
  budget: "Budget discipline",
  raid: "RAID hygiene",
  reports: "Reporting cadence",
};

function gradeStyle(g?: string) {
  switch (g) {
    case "Distinction":
      return { bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-200" };
    case "Pass":
      return { bg: "bg-sky-500", text: "text-sky-600", ring: "ring-sky-200" };
    case "Conditional":
      return { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-200" };
    default:
      return { bg: "bg-rose-500", text: "text-rose-600", ring: "ring-rose-200" };
  }
}

function ResultsPage() {
  const navigate = useNavigate();
  const fetchPreview = useServerFn(previewOutcome);
  const fetchExisting = useServerFn(getMyOutcome);
  const finalize = useServerFn(finalizeRun);

  const existing = useQuery({
    queryKey: ["my-outcome"],
    queryFn: () => fetchExisting() as Promise<any>,
  });

  const preview = useQuery({
    queryKey: ["outcome-preview"],
    queryFn: () => fetchPreview() as Promise<any>,
    enabled: !existing.data,
  });

  const [finalized, setFinalized] = useState<any>(null);
  const closeMut = useMutation({
    mutationFn: () => finalize(),
    onSuccess: (row: any) => {
      setFinalized(row);
      toast.success("Run finalised. Certificate ready.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't close out the project"),
  });

  const outcome = finalized ?? existing.data ?? null;
  const score = outcome?.score ?? preview.data?.score ?? 0;
  const breakdown = outcome?.breakdown ?? preview.data?.breakdown ?? null;
  const highlights: string[] = outcome?.highlights ?? preview.data?.highlights ?? [];
  const g = gradeStyle(outcome?.grade);

  const isClosed = !!outcome;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {isClosed ? "Final review" : "Project review"}
      </div>
      <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
        {isClosed ? "Project closed." : "Ready to close out?"}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        {isClosed
          ? "Here's how the run played out. Your certificate is yours to share."
          : "Run a final scoring pass against your stakeholders, tasks, budget, RAID and reports. You'll get a grade and a shareable certificate."}
      </p>

      {/* Score card */}
      <div className="mt-8 grid gap-6 md:grid-cols-[260px_1fr]">
        <div className={`rounded-3xl border border-border bg-card p-6 text-center shadow-sm ring-2 ${g.ring}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="mt-4 font-display text-6xl font-semibold tracking-tight">{score}</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">out of 100</div>
          {outcome?.grade && (
            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full ${g.bg} px-3 py-1 text-xs font-semibold text-white`}>
              <Award className="h-3.5 w-3.5" />
              {outcome.grade}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Score breakdown</div>
          <div className="mt-4 space-y-4">
            {breakdown ? (
              Object.entries(breakdown).map(([key, val]: [string, any]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{CATEGORY_LABELS[key] ?? key}</span>
                    <span className="text-muted-foreground">
                      {val.score}/100 · weight {val.weight}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${val.score}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{val.detail}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Calculating…</div>
            )}
          </div>
        </div>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Highlights</div>
          <ul className="mt-3 space-y-2 text-sm">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {!isClosed ? (
          <>
            <Button size="lg" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>
              <Award className="mr-2 h-4 w-4" />
              {closeMut.isPending ? "Finalising…" : "Close out & generate certificate"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/app" })}>
              Not yet — keep going
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Closing archives the project. You can start a fresh run anytime.
            </div>
          </>
        ) : (
          <>
            <Button asChild size="lg">
              <Link to="/cert/$slug" params={{ slug: outcome.share_slug }} target="_blank">
                <Award className="mr-2 h-4 w-4" />
                View certificate
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/cert/${outcome.share_slug}`;
                navigator.clipboard.writeText(url);
                toast.success("Share link copied");
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Copy share link
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.open(`/cert/${outcome.share_slug}?print=1`, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Download (print to PDF)
            </Button>
            <Button variant="link" asChild>
              <Link to="/app/projects">Start a new run</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}