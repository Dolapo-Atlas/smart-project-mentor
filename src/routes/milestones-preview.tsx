import { createFileRoute } from "@tanstack/react-router";
import { MilestoneCard } from "@/components/milestones/milestone-card";
import type { Milestone } from "@/lib/milestones.functions";

const sampleMilestones: Milestone[] = [
  {
    id: "completion-sample",
    kind: "completion",
    title: "Simulation Complete",
    eyebrow: "Project Complete",
    achievedAt: new Date().toISOString(),
    score: 86,
    phase: "closure",
    phaseLabel: "Closure",
    nextPhaseLabel: null,
    items: [],
    grade: "Distinction",
    deliverableId: null,
    summary: [
      { label: "Credential", value: "ATLAS-2026-BGTMY243AM" },
      { label: "Duration", value: "84 simulated days" },
      { label: "Deliverables", value: "12" },
    ],
  },
  {
    id: "gate-sample",
    kind: "gate",
    title: "Planning Phase Complete",
    eyebrow: "Phase Complete",
    achievedAt: new Date().toISOString(),
    score: 82,
    phase: "planning",
    phaseLabel: "Planning",
    nextPhaseLabel: "Execution",
    items: [],
    grade: null,
    deliverableId: null,
    summary: [],
  },
  {
    id: "artifact-sample",
    kind: "artifact",
    title: "Project Charter Approved",
    eyebrow: "Project Milestone",
    achievedAt: new Date().toISOString(),
    score: 88,
    phase: "initiation",
    phaseLabel: "Initiation",
    nextPhaseLabel: null,
    items: [],
    grade: null,
    deliverableId: "charter",
    summary: [],
  },
];

export const Route = createFileRoute("/milestones-preview")({
  component: function MilestonesPreview() {
    return (
      <div className="min-h-screen bg-background p-8">
        <h1 className="mb-8 font-display text-2xl font-medium">Milestone Card Preview</h1>
        <div className="grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {sampleMilestones.map((m) => (
            <div key={m.id} className="w-full max-w-[360px]">
              <MilestoneCard
                milestone={m}
                learnerName="Dolapo Rasaq"
                simulatedRole="Project Coordinator"
                projectName="Atlas Digital Care Records Rollout"
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
});
