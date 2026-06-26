import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generatePerformanceReview, listReviews } from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Award, Loader2, Sparkles, TrendingUp, Users, Brain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/reviews")({
  component: ReviewsPage,
});

function scoreColor(n: number) {
  if (n >= 75) return "text-emerald-500";
  if (n >= 50) return "text-amber-500";
  return "text-rose-500";
}

function ReviewsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listReviews);
  const genFn = useServerFn(generatePerformanceReview);
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: () => fetchFn(),
  });
  const generate = useMutation({
    mutationFn: () => genFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-reviews"] }),
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Award className="h-3 w-3 text-primary" /> Performance
          </div>
          <h1 className="mt-1 font-display text-3xl">Weekly reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Honest feedback from Emma Collins on how you ran the project this week.
          </p>
        </div>
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing review…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Generate this week's review
            </>
          )}
        </Button>
      </div>

      <div className="mt-8 space-y-5">
        {isLoading && <div className="text-sm text-muted-foreground">Loading reviews…</div>}
        {!isLoading && reviews.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <Award className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-3 font-display text-lg">No reviews yet</div>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Run a week of work, then generate your first review. Emma will look at
              your delivery, stakeholder relationships and decision quality.
            </p>
          </div>
        )}
        {reviews.map((r: any) => (
          <article
            key={r.id}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <header className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Week {r.week_number} · {r.reviewer_name}
                </div>
                <div className="mt-1 font-display text-xl">Performance review</div>
              </div>
              <div className="text-right">
                <div className={`font-display text-4xl ${scoreColor(r.overall_score)}`}>
                  {r.overall_score}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Overall
                </div>
              </div>
            </header>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <ScoreChip icon={TrendingUp} label="Delivery" value={r.score_delivery} />
              <ScoreChip icon={Users} label="Stakeholders" value={r.score_stakeholder} />
              <ScoreChip icon={Brain} label="Decisions" value={r.score_decision} />
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed">
              {r.narrative}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-emerald-600">
                  Highlights
                </div>
                <ul className="mt-2 space-y-1.5">
                  {(r.highlights as string[]).map((h, i) => (
                    <li key={i} className="text-sm">
                      • {h}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-amber-600">
                  Improve next week
                </div>
                <ul className="mt-2 space-y-1.5">
                  {(r.improvements as string[]).map((h, i) => (
                    <li key={i} className="text-sm">
                      • {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 text-[11px] text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScoreChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className={`mt-1 font-display text-2xl ${scoreColor(value)}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}