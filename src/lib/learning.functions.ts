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

/** Auto-tick competencies based on a document review score. */
export async function applyDocumentReview(
  supabase: SupabaseClient,
  userId: string,
  docTitle: string,
  score: number,
): Promise<void> {
  const phase = phaseFromDocTitle(docTitle);
  if (!phase) return;
  await applyPhaseStatus(supabase, userId, phase, score >= 65 ? "mastered" : "drafting");
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
        phase: z.number().int().min(1).max(8),
        prompt: z.string().min(1).max(500),
        answer: z.string().trim().min(3).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("reflection_entries").insert({
      user_id: userId,
      phase: data.phase,
      prompt: data.prompt,
      answer: data.answer,
    });
    if (error) throw error;
    return { ok: true };
  });

// Re-export so callers in other server modules can compose.
export { phaseOf };