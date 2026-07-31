import { randomBytes } from "crypto";
import QRCode from "qrcode";

export const COMPLETION_THRESHOLD = 60;

export type CertGrade = "Not yet achieved" | "Pass" | "Merit" | "Distinction";

export function calculateGrade(score: number): CertGrade {
  if (score >= 85) return "Distinction";
  if (score >= 75) return "Merit";
  if (score >= 60) return "Pass";
  return "Not yet achieved";
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** ATLAS-[YEAR]-[10 char crypto-random id]. Unguessable, permanent. */
export function generateVerificationCode(now = new Date()): string {
  const bytes = randomBytes(10);
  let id = "";
  for (let i = 0; i < 10; i += 1) id += ALPHABET[bytes[i] % ALPHABET.length];
  return `ATLAS-${now.getUTCFullYear()}-${id}`;
}

export function verificationUrl(code: string): string {
  return `https://atlassim.co/verify/${code}`;
}

export async function qrDataUrl(code: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(verificationUrl(code), {
      margin: 0,
      width: 320,
      color: { dark: "#0B1F3A", light: "#00000000" },
      errorCorrectionLevel: "M",
    });
  } catch {
    return null;
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (...n: number[]) => clamp(n.reduce((a, b) => a + b, 0) / (n.length || 1));

export type PerformanceBreakdown = {
  knowledgeApplication: number;
  decisionMaking: number;
  stakeholderManagement: number;
  riskManagement: number;
  documentation: number;
  deliveryManagement: number;
  communication: number;
};

/** Maps the Atlas scoring engine's outcome breakdown onto credential categories. */
export function toPerformanceBreakdown(
  breakdown: Record<string, { score: number }> | null | undefined,
  artifactScore: number,
): PerformanceBreakdown {
  const b = breakdown ?? {};
  const s = (k: string) => clamp(Number((b as any)[k]?.score ?? 0));
  const stakeholderManagement = s("stakeholders");
  const riskManagement = s("raid");
  const deliveryManagement = s("tasks");
  const communication = s("reports");
  const documentation = avg(artifactScore, communication);
  const decisionMaking = avg(deliveryManagement, riskManagement, s("budget"));
  return {
    knowledgeApplication: avg(
      stakeholderManagement,
      riskManagement,
      deliveryManagement,
      communication,
      documentation,
    ),
    decisionMaking,
    stakeholderManagement,
    riskManagement,
    documentation,
    deliveryManagement,
    communication,
  };
}

export type EvidenceCounts = {
  charterApproved: boolean;
  registerSubmitted: boolean;
  raidItems: number;
  raidClosed: number;
  documentsSubmitted: number;
  reportsSubmitted: number;
  meetingsHeld: number;
  changeRequests: number;
  gatesPassed: number;
  lessonsSubmitted: boolean;
  budgetLines: number;
};

/**
 * Competencies are evidence-gated: an activity must have been completed AND the
 * matching performance category must clear 60 before it can be claimed.
 */
export function deriveCompetencies(
  perf: PerformanceBreakdown,
  ev: EvidenceCounts,
): string[] {
  const out: string[] = [];
  const push = (label: string, ok: boolean) => {
    if (ok && !out.includes(label)) out.push(label);
  };

  push("Project Charter Creation", ev.charterApproved && perf.documentation >= 60);
  push(
    "Stakeholder Management",
    ev.registerSubmitted && perf.stakeholderManagement >= 60,
  );
  push("RAID Log Development", ev.raidItems >= 4 && perf.riskManagement >= 60);
  push(
    "Risk and Issue Management",
    ev.raidClosed >= 2 && perf.riskManagement >= 60,
  );
  push("Status Reporting", ev.reportsSubmitted >= 2 && perf.communication >= 60);
  push(
    "Executive Communication",
    ev.reportsSubmitted >= 3 && perf.communication >= 75,
  );
  push("Governance", ev.gatesPassed >= 1 && perf.decisionMaking >= 60);
  push(
    "Project Documentation",
    ev.documentsSubmitted >= 2 && perf.documentation >= 60,
  );
  push("Change Evaluation", ev.changeRequests >= 1 && perf.decisionMaking >= 60);
  push(
    "Meeting and Action Management",
    ev.meetingsHeld >= 2 && perf.communication >= 60,
  );
  push(
    "Planning and Prioritisation",
    ev.documentsSubmitted >= 1 && perf.deliveryManagement >= 60,
  );
  push(
    "Decision-Making Under Pressure",
    ev.gatesPassed >= 1 && perf.decisionMaking >= 75,
  );
  push("Budget Awareness", ev.budgetLines >= 3 && perf.decisionMaking >= 60);
  push(
    "Project Closure and Lessons Learned",
    ev.lessonsSubmitted && perf.documentation >= 60,
  );

  return out.slice(0, 8);
}

const AREA_LABELS: Record<keyof PerformanceBreakdown, string> = {
  knowledgeApplication: "Knowledge Application",
  decisionMaking: "Decision-Making",
  stakeholderManagement: "Stakeholder Management",
  riskManagement: "Risk Management",
  documentation: "Documentation",
  deliveryManagement: "Delivery Management",
  communication: "Communication",
};

export function performanceAreas(perf: PerformanceBreakdown) {
  return (Object.keys(AREA_LABELS) as (keyof PerformanceBreakdown)[]).map((k) => ({
    key: k,
    label: AREA_LABELS[k],
    score: clamp(Number(perf[k] ?? 0)),
  }));
}

export function strengthsAndGaps(perf: PerformanceBreakdown) {
  const areas = performanceAreas(perf).sort((a, b) => b.score - a.score);
  const strengths = areas.filter((a) => a.score >= 70).slice(0, 3);
  const gaps = areas.filter((a) => a.score < 70).slice(-3).reverse();
  return {
    strengths: strengths.length
      ? strengths.map((a) => `${a.label} — scored ${a.score}/100 across the run.`)
      : ["Completed a full simulated workplace programme end to end."],
    developmentAreas: gaps.length
      ? gaps.map(
          (a) =>
            `${a.label} — ${a.score}/100. Practise this area in the next Atlas run.`,
        )
      : ["Stretch goal: repeat the programme aiming for a Distinction in every area."],
  };
}