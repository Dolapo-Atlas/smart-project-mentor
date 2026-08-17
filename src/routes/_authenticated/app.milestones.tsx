import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listMilestones, type Milestone } from "@/lib/milestones.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, FileText, Check, Award } from "lucide-react";
import { MilestoneShareDialog } from "@/components/milestones/milestone-share-dialog";

export const Route = createFileRoute("/_authenticated/app/milestones")({
  component: MilestonesPage,
  head: () => ({
    meta: [
      { title: "Atlas Milestones — Verified Simulation Achievements" },
      {
        name: "description",
        content:
          "Every verified milestone from your Atlas simulation: approved deliverables, governance gates passed and final project completion — with a premium share card for each.",
      },
      { property: "og:title", content: "Atlas Milestones — Verified Simulation Achievements" },
      {
        property: "og:description",
        content:
          "Approved deliverables, governance gates and project completion, captured as shareable Atlas milestones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MilestonesPage() {
  const fetchFeed = useServerFn(listMilestones);
  const { data, isLoading } = useQuery({ queryKey: ["milestones"], queryFn: () => fetchFeed() });
  const [share, setShare] = useState<Milestone | null>(null);

  const milestones = data?.milestones ?? [];

  return (
    <div className="space-y-6">
      <header className="atlas-rise">
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Verified progress
        </div>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Milestones</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Milestones appear only when work has been approved or a governance gate has genuinely
          passed. Each one can be shared as an Atlas card — always labelled as a simulated
          workplace experience.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your milestones…</p>
      ) : milestones.length === 0 ? (
        <Card variant="soft" tone="cream">
          <CardContent className="p-8">
            <h2 className="font-display text-xl font-medium">No milestones yet</h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Get your first deliverable approved — the Project Charter is usually the first — and
              it will appear here ready to share.
            </p>
            <Button className="mt-5" asChild>
              <Link to="/app/charter">Open the Charter</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {milestones.map((m) => (
            <Card key={m.id} variant="soft" tone={m.kind === "completion" ? "orange" : m.kind === "gate" ? "navy" : "neutral"}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {m.kind === "completion" ? (
                    <Award className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {m.eyebrow}
                </div>
                <h2 className="mt-3 font-display text-xl font-medium leading-snug tracking-tight">
                  {m.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {new Date(m.achievedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {m.phaseLabel && <span>{m.phaseLabel}</span>}
                  {m.score != null && <span>{m.score}/100</span>}
                  {m.grade && <span>{m.grade}</span>}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setShare(m)}>
                    <Share2 className="mr-2 h-3.5 w-3.5" /> Share again
                  </Button>
                  {m.deliverableId && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/app/deliverables">
                        <FileText className="mr-2 h-3.5 w-3.5" /> View deliverable
                      </Link>
                    </Button>
                  )}
                  {m.kind === "completion" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/app/results">View credential</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MilestoneShareDialog
        milestone={share}
        learnerName={data?.learnerName ?? ""}
        simulatedRole={data?.simulatedRole ?? ""}
        projectName={data?.projectName ?? ""}
        open={!!share}
        onOpenChange={(v) => !v && setShare(null)}
      />
    </div>
  );
}