import type { Milestone } from "@/lib/milestones.functions";

/**
 * Professional, editable social copy for an Atlas milestone. Written in the
 * learner's voice, never claiming employer work — the Atlas simulation is
 * always named explicitly.
 */
export function milestoneCaption(m: Milestone, projectName: string): string {
  const tags = "#ProjectManagement #LearningByDoing #AtlasSim";

  if (m.kind === "completion") {
    const grade = m.grade ? ` with a ${m.grade}` : "";
    return [
      `I've completed the ${projectName} simulation on Atlas${grade}.`,
      "",
      "The project ran end to end — initiation, planning, execution, monitoring and control, go-live and closure — with every deliverable reviewed and each governance gate defended before the next phase opened.",
      "",
      `Final score: ${m.score ?? "—"}/100.`,
      "",
      tags,
    ].join("\n");
  }

  if (m.kind === "gate") {
    const work = m.items.length
      ? `The phase involved ${listSentence(m.items)}, before defending the ${m.phaseLabel} Gate.`
      : `The phase closed with a governance gate review.`;
    return [
      `I've completed the ${m.phaseLabel} phase of the ${projectName} simulation on Atlas.`,
      "",
      work,
      "",
      m.nextPhaseLabel ? `Next: ${m.nextPhaseLabel}.` : "Next: closing the project out.",
      "",
      tags,
    ].join("\n");
  }

  const doc = m.title.replace(/\s+Approved$/i, "");
  return [
    `I've just completed and received approval for my ${doc} as part of the ${projectName} simulation on Atlas.`,
    "",
    `Working through the detail — context, scope, stakeholders and constraints — gave me a much clearer understanding of how a ${doc} comes together in practice${m.score != null ? `, and the review came back at ${m.score}/100` : ""}.`,
    "",
    "Next step: continuing the project.",
    "",
    tags,
  ].join("\n");
}

function listSentence(items: string[]): string {
  const l = items.map((i) => i.toLowerCase());
  if (l.length === 1) return l[0];
  return `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`;
}

export const SIMULATION_DISCLAIMER = "Atlas · Simulated Workplace Experience";