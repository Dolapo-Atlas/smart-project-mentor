import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  PHASES,
  allCompetencyIds,
  phaseOf,
  competencyIdsForPhase,
  unlockedPhases,
  phaseFromDocTitle,
  artifactFromDocTitle,
  competencyIdsForArtifact,
} from "./learning";
import type { SupabaseClient } from "@supabase/supabase-js";

type Status = "drafting" | "mastered";

/**
 * Internal helper. Marks a list of competencies for a user with the given status.
 * Mastered is sticky — never downgraded by a later "drafting" call.
 */
export async function applyCompetencyStatus(
  supabase: SupabaseClient,
  userId: string,
  competencyIds: string[],
  status: Status,
): Promise<void> {
  if (competencyIds.length === 0) return;
  // Pull existing rows so we don't downgrade mastered → drafting
  const { data: existing } = await supabase
    .from("user_competencies")
    .select("competency_id,status")
    .eq("user_id", userId)
    .in("competency_id", competencyIds);
  const existingMap = new Map<string, string>(
    (existing ?? []).map((r: { competency_id: string; status: string }) => [
      r.competency_id,
      r.status,
    ]),
  );
  const now = new Date().toISOString();
  const rows = competencyIds
    .filter((id) => {
      const cur = existingMap.get(id);
      if (cur === "mastered") return false; // sticky
      if (cur === status) return false; // no-op
      return true;
    })
    .map((id) => ({
      user_id: userId,
      competency_id: id,
      status,
      unlocked_at: existingMap.get(id) ? undefined : now,
      mastered_at: status === "mastered" ? now : null,
    }));
  if (rows.length === 0) return;
  await supabase
    .from("user_competencies")
    .upsert(rows, { onConflict: "user_id,competency_id" });
}

/** Convenience: apply status to all competencies in a phase. */
export async function applyPhaseStatus(
  supabase: SupabaseClient,
  userId: string,
  phase: number,
  status: Status,
): Promise<void> {
  await applyCompetencyStatus(supabase, userId, competencyIdsForPhase(phase), status);
}

/**
 * Auto-tick competencies based on a document review score.
 * Only credits the specific competencies the artifact actually evidences —
 * NOT the entire phase (which used to over-credit from one submission).
 */
export async function applyDocumentReview(
  supabase: SupabaseClient,
  userId: string,
  docTitle: string,
  score: number,
): Promise<void> {
  const kind = artifactFromDocTitle(docTitle);
  if (!kind) return;
  const ids = competencyIdsForArtifact(kind);
  if (ids.length === 0) return;
  await applyCompetencyStatus(supabase, userId, ids, score >= 65 ? "mastered" : "drafting");
}

export const getLearningJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: rows }, { data: reflections }] = await Promise.all([
      supabase
        .from("user_competencies")
        .select("competency_id,status,unlocked_at,mastered_at")
        .eq("user_id", userId),
      supabase
        .from("reflection_entries")
        .select("id,phase,prompt,answer,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    const byId = new Map<string, { status: string; mastered_at: string | null }>();
    for (const r of rows ?? []) {
      byId.set(r.competency_id, { status: r.status, mastered_at: r.mastered_at });
    }
    const masteredIds = new Set(
      (rows ?? []).filter((r) => r.status === "mastered").map((r) => r.competency_id),
    );
    const unlocked = unlockedPhases(masteredIds);
    const total = allCompetencyIds().length;
    let mastered = 0;
    let drafting = 0;
    for (const r of rows ?? []) {
      if (r.status === "mastered") mastered++;
      else if (r.status === "drafting") drafting++;
    }
    const locked = total - mastered - drafting;

    const phases = PHASES.map((p) => {
      const isUnlocked = unlocked.has(p.phase);
      const competencies = p.competencies.map((c) => {
        const row = byId.get(c.id);
        return {
          id: c.id,
          label: c.label,
          status: (row?.status as "locked" | "drafting" | "mastered") ?? "locked",
          mastered_at: row?.mastered_at ?? null,
        };
      });
      const phaseMastered = competencies.filter((c) => c.status === "mastered").length;
      return {
        phase: p.phase,
        title: p.title,
        unlock_hint: p.unlock_hint,
        unlocked: isUnlocked,
        completion: competencies.length
          ? Math.round((phaseMastered / competencies.length) * 100)
          : 0,
        mastered: phaseMastered,
        total: competencies.length,
        competencies,
      };
    });

    // Current phase = highest unlocked phase that isn't yet 100% mastered, else last unlocked.
    const current =
      phases.find((p) => p.unlocked && p.completion < 100)?.phase ??
      Math.max(...Array.from(unlocked));

    return {
      total,
      mastered,
      drafting,
      locked,
      current_phase: current,
      phases,
      reflections: reflections ?? [],
    };
  });

export const submitReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        phase: z.number().int().min(1).max(8).optional(),
        prompt: z.string().min(1).max(500),
        answer: z.string().trim().min(3).max(2000),
        task_id: z.string().uuid().optional(),
        tags: z.array(z.string().max(40)).max(8).optional(),
        trigger_kind: z.enum(["phase_mastery", "post_review", "chapter_close", "manual"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("reflection_entries").insert({
      user_id: userId,
      phase: data.phase ?? null,
      prompt: data.prompt,
      answer: data.answer,
      task_id: data.task_id ?? null,
      tags: data.tags ?? [],
      trigger_kind: data.trigger_kind ?? "manual",
    });
    if (error) throw error;
    return { ok: true };
  });

/**
 * Retroactively tick competencies based on the user's existing work:
 * approved/submitted documents, sent emails, status reports, RAID items,
 * change requests, and phase gates. Mastered is sticky upstream so this is
 * safe to run multiple times.
 */
export const backfillLearningJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [docs, comms, reports, raid, changes, gates] = await Promise.all([
      supabase.from("documents").select("title,quality_score,status").eq("user_id", userId),
      supabase.from("comms_messages").select("direction,from_role,to_roles,msg_type").eq("user_id", userId),
      supabase.from("status_reports").select("id").eq("user_id", userId),
      supabase.from("raid_items").select("kind").eq("user_id", userId),
      supabase.from("change_requests").select("id,status").eq("user_id", userId),
      supabase.from("phase_gates").select("phase,status").eq("user_id", userId),
    ]);

    const mastered = new Set<string>();
    const drafting = new Set<string>();

    // Documents → targeted artifact competencies (not entire phase)
    for (const d of (docs.data ?? []) as Array<{ title: string | null; quality_score: number | null; status: string | null }>) {
      const kind = artifactFromDocTitle(d.title ?? "");
      if (!kind) continue;
      const ids = competencyIdsForArtifact(kind);
      if (ids.length === 0) continue;
      const score = typeof d.quality_score === "number" ? d.quality_score : null;
      const passed = score !== null ? score >= 65 : d.status === "submitted";
      for (const id of ids) (passed ? mastered : drafting).add(id);
    }

    // Comms — soft skill micro-ticks based on outbound emails
    const outbound = (comms.data ?? []).filter((m) => m.direction === "outbound");
    if (outbound.length > 0) mastered.add("p5.stakeholder_emails");
    for (const m of outbound) {
      const to: string[] = Array.isArray(m.to_roles) ? m.to_roles : [];
      if (m.msg_type === "Escalation" && to.includes("sponsor")) {
        mastered.add("p2.escalation_routes");
        mastered.add("p2.executive_sponsors");
      }
      if (to.includes("care_home")) mastered.add("p2.managing_difficult_stakeholders");
      if (to.includes("vendor")) {
        mastered.add("p2.vendor_management");
        mastered.add("p6.vendor_coordination");
      }
      if (m.msg_type === "Update" && to.includes("sponsor")) mastered.add("p5.executive_briefings");
    }

    // Status reports → phase 5 + 7
    if ((reports.data ?? []).length > 0) {
      mastered.add("p5.status_reporting");
      mastered.add("p5.project_updates");
      mastered.add("p7.governance_reporting");
      mastered.add("p7.kpi_tracking");
    }

    // RAID items → phase 4
    const raidRows = raid.data ?? [];
    if (raidRows.length > 0) {
      mastered.add("p4.raid_log");
      const kinds = new Set(raidRows.map((r) => (r.kind ?? "").toLowerCase()));
      if (kinds.has("risk")) {
        mastered.add("p4.risks");
        mastered.add("p4.risk_management");
      }
      if (kinds.has("assumption")) mastered.add("p4.assumptions_tracking");
      if (kinds.has("issue")) mastered.add("p4.issues");
      if (kinds.has("dependency")) mastered.add("p4.dependencies_tracking");
    }

    // Change requests → phase 6
    if ((changes.data ?? []).length > 0) mastered.add("p6.change_requests");

    // Phase gates → governance
    if ((gates.data ?? []).some((g) => g.status === "passed")) {
      mastered.add("p1.stage_gates");
      mastered.add("p4.governance_reviews");
    }

    // Apply: drafting first (won't overwrite mastered), then mastered.
    const draftingOnly = Array.from(drafting).filter((id) => !mastered.has(id));
    await applyCompetencyStatus(supabase, userId, draftingOnly, "drafting");
    await applyCompetencyStatus(supabase, userId, Array.from(mastered), "mastered");

    return { ok: true, mastered: mastered.size, drafting: draftingOnly.length };
  });

// Re-export so callers in other server modules can compose.
export { phaseOf };