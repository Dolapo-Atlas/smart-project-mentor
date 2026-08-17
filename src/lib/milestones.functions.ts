import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PHASE_LABELS, GATE_LABELS, PHASE_KEYS, nextPhase, normalisePhase, type PhaseKey } from "@/lib/phases";
import { factsFor } from "@/lib/project-facts";

/**
 * Atlas Milestones — a read-only presentation layer.
 *
 * Every milestone is derived from data the simulation engine has already
 * verified: approved artefacts, passed governance gates, the finalised run
 * outcome and an issued credential. Nothing here writes progression state,
 * scores or clock data.
 */
export type MilestoneKind = "artifact" | "gate" | "completion";

export type Milestone = {
  id: string;
  kind: MilestoneKind;
  /** e.g. "Project Charter Approved" or "Planning Phase Complete". */
  title: string;
  eyebrow: string;
  achievedAt: string;
  score: number | null;
  phase: PhaseKey | null;
  phaseLabel: string | null;
  nextPhaseLabel: string | null;
  /** Approved work rolled into a phase milestone. */
  items: string[];
  grade: string | null;
  /** Related deliverable (artefact) id, when there is one. */
  deliverableId: string | null;
  summary: { label: string; value: string }[];
};

export type MilestoneFeed = {
  learnerName: string;
  simulatedRole: string;
  projectName: string;
  milestones: Milestone[];
};

/** Artefact types that represent throwaway task submissions, not deliverables. */
function isMeaningfulArtifact(type: string): boolean {
  return !type.startsWith("task_");
}

export const listMilestones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MilestoneFeed> => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name,last_name,preferred_name,display_name,role,current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();

    const learnerName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      (profile?.preferred_name as string | null) ||
      (profile?.display_name as string | null) ||
      "";
    // The card must reflect the role the learner actually chose at onboarding.
    const simulatedRole = (profile?.role as string | null)?.trim() || "Project Coordinator";
    const instanceId = profile?.current_project_instance_id as string | null;

    const empty: MilestoneFeed = {
      learnerName,
      simulatedRole,
      projectName: "",
      milestones: [],
    };
    if (!instanceId) return empty;

    const [instRes, artRes, gateRes, outcomeRes, certRes] = await Promise.all([
      supabase
        .from("project_instances")
        .select("display_name, project_templates(slug,title)")
        .eq("id", instanceId)
        .maybeSingle(),
      supabase
        .from("project_artifacts")
        .select("id,artifact_type,title,status,approved_at,review_result,simulated_role,is_latest")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .eq("status", "approved")
        .order("approved_at", { ascending: true }),
      supabase
        .from("phase_gates")
        .select("phase,status,score,decided_at")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId),
      supabase
        .from("project_outcomes")
        .select("score,grade,completed_at,user_role")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .maybeSingle(),
      supabase
        .from("certificates")
        .select("id,certificate_status,issued_at,grade,overall_score,simulated_role,revoked_at,verification_code")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .maybeSingle(),
    ]);

    const tpl = (instRes.data as any)?.project_templates;
    const projectName =
      ((instRes.data as any)?.display_name as string | null) || tpl?.title || "Atlas project";
    const facts = factsFor(tpl?.slug);
    const role =
      (outcomeRes.data as any)?.user_role?.trim() ||
      (artRes.data ?? []).find((a: any) => a.simulated_role)?.simulated_role ||
      simulatedRole;

    const artifacts = (artRes.data ?? []).filter(
      (a: any) => a.approved_at && isMeaningfulArtifact(String(a.artifact_type)),
    );

    const milestones: Milestone[] = [];

    // ---- Approved deliverables ------------------------------------------
    // Only the latest approved version of each artefact type earns a milestone,
    // so re-submissions don't spam the learner.
    const seenType = new Set<string>();
    for (const a of [...artifacts].reverse()) {
      const type = String(a.artifact_type);
      if (seenType.has(type)) continue;
      seenType.add(type);
      const score = Number((a.review_result as any)?.score);
      milestones.push({
        id: `artifact:${a.id}`,
        kind: "artifact",
        eyebrow: "Project milestone",
        title: `${a.title} Approved`,
        achievedAt: a.approved_at as string,
        score: Number.isFinite(score) ? Math.round(score) : null,
        phase: null,
        phaseLabel: null,
        nextPhaseLabel: null,
        items: [],
        grade: null,
        deliverableId: a.id as string,
        summary: [],
      });
    }

    // ---- Passed governance gates ----------------------------------------
    const gates = (gateRes.data ?? [])
      .filter((g: any) => g.status === "passed" && g.decided_at)
      .sort(
        (a: any, b: any) =>
          PHASE_KEYS.indexOf(normalisePhase(a.phase) as PhaseKey) -
          PHASE_KEYS.indexOf(normalisePhase(b.phase) as PhaseKey),
      );
    let windowStart = 0;
    for (const g of gates) {
      const phase = normalisePhase(g.phase) as PhaseKey;
      const decided = new Date(g.decided_at as string).getTime();
      // The approved work that landed inside this phase's window is the real
      // evidence behind the phase card — nothing is hardcoded.
      const items = artifacts
        .filter((a: any) => {
          const t = new Date(a.approved_at as string).getTime();
          return t > windowStart && t <= decided;
        })
        .map((a: any) => String(a.title));
      windowStart = decided;
      const nxt = nextPhase(phase);
      milestones.push({
        id: `gate:${phase}`,
        kind: "gate",
        eyebrow: "Phase complete",
        title: `${PHASE_LABELS[phase]} Phase Complete`,
        achievedAt: g.decided_at as string,
        score: g.score == null ? null : Math.round(Number(g.score)),
        phase,
        phaseLabel: PHASE_LABELS[phase],
        nextPhaseLabel: nxt ? PHASE_LABELS[nxt] : null,
        items: Array.from(new Set(items)),
        grade: null,
        deliverableId: null,
        summary: [{ label: GATE_LABELS[phase], value: g.score == null ? "Passed" : `${Math.round(Number(g.score))}/100 — Passed` }],
      });
    }

    // ---- Final completion ------------------------------------------------
    const outcome = outcomeRes.data as any;
    if (outcome?.completed_at) {
      const cert = certRes.data as any;
      const credentialLive = cert && cert.certificate_status === "issued" && !cert.revoked_at;
      milestones.push({
        id: `completion:${instanceId}`,
        kind: "completion",
        eyebrow: "Project complete",
        title: `${projectName} — Completed`,
        achievedAt: outcome.completed_at as string,
        score: outcome.score == null ? null : Math.round(Number(outcome.score)),
        phase: "closure",
        phaseLabel: PHASE_LABELS.closure,
        nextPhaseLabel: null,
        items: [],
        grade: (outcome.grade as string | null) ?? null,
        deliverableId: null,
        summary: [
          { label: "Final score", value: `${Math.round(Number(outcome.score ?? 0))}/100` },
          { label: "Grade", value: (outcome.grade as string) || "Pass" },
          { label: "Project duration", value: facts.timelineLabel },
          {
            label: "Project budget",
            value: `${facts.currencySymbol}${facts.totalBudget.toLocaleString()}`,
          },
          { label: "Deliverables completed", value: String(seenType.size) },
          { label: "Credential", value: credentialLive ? "Verified" : "Not yet issued" },
        ],
      });
    }

    milestones.sort(
      (a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime(),
    );

    return { learnerName, simulatedRole: role, projectName, milestones };
  });