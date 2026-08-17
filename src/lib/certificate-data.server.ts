import {
  COMPLETION_THRESHOLD,
  calculateGrade,
  deriveCompetencies,
  strengthsAndGaps,
  toPerformanceBreakdown,
  type EvidenceCounts,
} from "./certificates.server";
import { factsFor } from "./project-facts";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function money(n: number) {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

function timeline(days?: number | null) {
  if (!days) return null;
  if (days % 7 === 0 && days < 168) return `${days / 7} weeks`;
  if (days >= 60) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

export type CertificatePayload = {
  eligible: boolean;
  reason?: string;
  outcomeId?: string;
  projectInstanceId?: string;
  recipientName: string;
  simulatedRole: string;
  programmeName: string;
  projectName: string;
  simulatedBudget: string | null;
  simulatedTimeline: string | null;
  completionDate: string;
  overallScore: number;
  grade: string;
  performanceBreakdown: Record<string, number>;
  competencies: string[];
  strengths: string[];
  developmentAreas: string[];
};

/**
 * Builds the credential payload from real Atlas performance data only.
 * Never accepts client-supplied scores.
 */
export async function buildCertificatePayload(
  supabase: any,
  userId: string,
): Promise<CertificatePayload> {
  const empty = (reason: string): CertificatePayload => ({
    eligible: false,
    reason,
    recipientName: "",
    simulatedRole: "",
    programmeName: "",
    projectName: "",
    simulatedBudget: null,
    simulatedTimeline: null,
    completionDate: new Date().toISOString(),
    overallScore: 0,
    grade: "Not yet achieved",
    performanceBreakdown: {},
    competencies: [],
    strengths: [],
    developmentAreas: [],
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "current_project_instance_id, display_name, first_name, last_name, preferred_name, role, career_goal",
    )
    .eq("id", userId)
    .maybeSingle();

  let outcome: any = null;
  if (profile?.current_project_instance_id) {
    const { data } = await supabase
      .from("project_outcomes")
      .select("*")
      .eq("user_id", userId)
      .eq("project_instance_id", profile.current_project_instance_id)
      .maybeSingle();
    outcome = data;
  }
  if (!outcome) {
    const { data } = await supabase
      .from("project_outcomes")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    outcome = data;
  }
  if (!outcome) {
    return empty(
      "Your certificate will become available after all required programme activities have been completed.",
    );
  }

  const instanceId = outcome.project_instance_id as string;

  const [
    instRes,
    charterRes,
    registerRes,
    raidRes,
    docsRes,
    reportsRes,
    meetingsRes,
    crRes,
    gatesRes,
    lessonsRes,
    budgetRes,
  ] = await Promise.all([
    supabase
      .from("project_instances")
      .select("display_name, project_templates(title, slug, duration_days)")
      .eq("id", instanceId)
      .maybeSingle(),
    supabase
      .from("project_charters")
      .select("approval_status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("stakeholder_registers")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("raid_items")
      .select("status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("documents")
      .select("status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("status_reports")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("meetings")
      .select("held")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("change_requests")
      .select("status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("phase_gates")
      .select("status")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("lessons_learned_docs")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
    supabase
      .from("budget_lines")
      .select("kind, amount")
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId),
  ]);

  const raid = raidRes.data ?? [];
  const docs = docsRes.data ?? [];
  const budget = budgetRes.data ?? [];

  const ev: EvidenceCounts = {
    charterApproved: (charterRes.data ?? []).some(
      (c: any) => c.approval_status === "approved" || c.approval_status === "submitted",
    ),
    registerSubmitted: (registerRes.data ?? []).some((r: any) => r.submitted_at),
    raidItems: raid.length,
    raidClosed: raid.filter((r: any) => r.status === "closed").length,
    documentsSubmitted: docs.filter((d: any) =>
      ["submitted", "reviewed", "approved"].includes(d.status),
    ).length,
    reportsSubmitted: (reportsRes.data ?? []).filter((r: any) => r.submitted_at).length,
    meetingsHeld: (meetingsRes.data ?? []).filter((m: any) => m.held).length,
    changeRequests: (crRes.data ?? []).length,
    gatesPassed: (gatesRes.data ?? []).filter((g: any) => g.status === "passed").length,
    lessonsSubmitted: (lessonsRes.data ?? []).some((l: any) => l.submitted_at),
    budgetLines: budget.length,
  };

  const artifactScore = clamp(
    30 +
      ev.documentsSubmitted * 10 +
      (ev.charterApproved ? 12 : 0) +
      (ev.registerSubmitted ? 12 : 0) +
      (ev.lessonsSubmitted ? 12 : 0),
  );

  const perf = toPerformanceBreakdown(outcome.breakdown as any, artifactScore);
  const competencies = deriveCompetencies(perf, ev);
  const { strengths, developmentAreas } = strengthsAndGaps(perf);

  const score = clamp(Number(outcome.score ?? 0));
  const grade = calculateGrade(score);

  const tpl = (instRes.data as any)?.project_templates;
  const facts = factsFor(tpl?.slug);

  // The credential shows the approved project budget, not spend plus forecast:
  // only `planned` lines form the baseline.
  const baseline = budget
    .filter((b: any) => b.kind === "planned")
    .reduce((a: number, b: any) => a + Number(b.amount ?? 0), 0);
  // Atlas is not affiliated with or endorsed by the NHS — never let that
  // appear on an issued credential.
  const deNHS = (s: string) =>
    String(s ?? "")
      .replace(/\bNHS\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  const rawTitle = tpl?.title || outcome.template_title;
  const projectName = deNHS(
    (instRes.data as any)?.display_name || rawTitle,
  );
  const programmeName = `Atlas ${deNHS(rawTitle)
    .replace(/\b(simulation|rollout|project|programme)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()} Programme`;

  const recipientName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.preferred_name ||
    profile?.display_name ||
    outcome.user_display_name ||
    "";

  return {
    eligible: score >= COMPLETION_THRESHOLD && !!recipientName,
    reason:
      score < COMPLETION_THRESHOLD
        ? `A certificate is issued at ${COMPLETION_THRESHOLD}/100 or above. Your current run scored ${score}/100.`
        : !recipientName
          ? "Confirm the name you'd like on your certificate before it is issued."
          : undefined,
    outcomeId: outcome.id,
    projectInstanceId: instanceId,
    recipientName,
    simulatedRole: outcome.user_role || profile?.role || "Project Coordinator",
    programmeName,
    projectName,
    simulatedBudget: baseline > 0 ? money(baseline) : money(facts.totalBudget),
    // `project_templates.duration_days` is how long a learner takes in real time,
    // not the simulated project timeline — that comes from the project facts.
    simulatedTimeline: facts.timelineLabel || timeline(facts.durationDays) || "12 weeks",
    completionDate: outcome.completed_at,
    overallScore: score,
    grade,
    performanceBreakdown: perf as unknown as Record<string, number>,
    competencies,
    strengths,
    developmentAreas,
  };
}