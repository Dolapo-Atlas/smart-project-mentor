import { createFileRoute } from "@tanstack/react-router";
import { MilestoneCard } from "@/components/milestones/milestone-card";
import type { Milestone } from "@/lib/milestones.functions";

export const Route = createFileRoute("/card-preview")({ component: Preview });

const gate: Milestone = {
  id: "g1", kind: "gate", title: "Planning Phase Complete", eyebrow: "Phase Complete",
  achievedAt: "2026-08-17T10:00:00.000Z", score: 88, phase: "planning", phaseLabel: "Planning",
  nextPhaseLabel: "Execution",
  items: ["Project Schedule", "Work Breakdown Structure", "Risk Register"],
  grade: null, deliverableId: null,
  summary: [{ label: "Deliverables approved", value: "3" }, { label: "Duration", value: "30 simulated days" }],
};

const completion: Milestone = {
  id: "c1", kind: "completion", title: "Atlas Digital Care Records Rollout Complete", eyebrow: "Project Complete",
  achievedAt: "2026-08-17T10:00:00.000Z", score: 86, phase: "closure", phaseLabel: "Closure",
  nextPhaseLabel: null, items: [], grade: "Distinction", deliverableId: null,
  summary: [
    { label: "Credential", value: "ATLAS-2026-BGTMY243AM" },
    { label: "Deliverables approved", value: "14" },
    { label: "Duration", value: "84 simulated days" },
  ],
};

const artifact: Milestone = {
  id: "a1", kind: "artifact", title: "Project Charter Approved", eyebrow: "Project Milestone",
  achievedAt: "2026-08-17T10:00:00.000Z", score: null, phase: "initiation", phaseLabel: "Initiation",
  nextPhaseLabel: null, items: [], grade: null, deliverableId: "art1",
  summary: [{ label: "Deliverable", value: "Project Charter" }],
};

function Preview() {
  const common = { learnerName: "Dolapo Rasaq", simulatedRole: "Project Officer", projectName: "Atlas Digital Care Records Rollout" };
  return (
    <div className="flex flex-col gap-8 bg-white p-4">
      <div id="card-gate" className="w-[540px]"><MilestoneCard milestone={gate} {...common} /></div>
      <div id="card-completion" className="w-[540px]"><MilestoneCard milestone={completion} {...common} /></div>
      <div id="card-artifact" className="w-[540px]"><MilestoneCard milestone={artifact} {...common} /></div>
    </div>
  );
}
