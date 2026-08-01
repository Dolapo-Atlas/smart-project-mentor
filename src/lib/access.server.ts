/**
 * Server-only access rules for the Atlas free preview.
 *
 * Free tier: the learner may sign up, enter the workspace, read the brief,
 * receive the first stakeholder email and complete ONE task, then see the
 * consequence/feedback. Continuing beyond that requires the paid unlock.
 *
 * Existing learners were grandfathered to `full` in the migration, so nothing
 * anyone has already built gets locked.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAYWALL_MESSAGE =
  "Your free preview is complete. Unlock the full Digital Care Records experience to continue.";

export interface AccessState {
  tier: "free" | "full";
  unlockedAt: string | null;
  /** Number of tasks the learner has submitted or completed. */
  workDone: number;
  /** Free preview consumed: first task finished. */
  previewComplete: boolean;
  /** Free tier + preview consumed => further progress is gated. */
  locked: boolean;
  freePreviewCompletedAt: string | null;
}

export async function getAccessState(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<AccessState> {
  const [profileRes, tasksRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("access_tier, unlocked_at, free_preview_completed_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["submitted", "reviewed", "done", "completed"]),
  ]);

  const profile = (profileRes.data ?? null) as
    | { access_tier: string | null; unlocked_at: string | null; free_preview_completed_at: string | null }
    | null;

  const tier = profile?.access_tier === "full" ? "full" : "free";
  const workDone = tasksRes.count ?? 0;
  const previewComplete = workDone >= 1;
  let freePreviewCompletedAt = profile?.free_preview_completed_at ?? null;

  // Stamp the moment the preview is consumed (idempotent).
  if (tier === "free" && previewComplete && !freePreviewCompletedAt) {
    freePreviewCompletedAt = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ free_preview_completed_at: freePreviewCompletedAt })
      .eq("id", userId);
  }

  return {
    tier,
    unlockedAt: profile?.unlocked_at ?? null,
    workDone,
    previewComplete,
    locked: tier === "free" && previewComplete,
    freePreviewCompletedAt,
  };
}

/** Throws when the learner has used up the free preview and has not paid. */
export async function assertProgrammeAccess(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<void> {
  const access = await getAccessState(supabase, userId);
  if (access.locked) throw new Error(PAYWALL_MESSAGE);
}