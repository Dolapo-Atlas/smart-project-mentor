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
  /** How the access was granted: purchase, grandfathered, admin, or none. */
  accessSource: "purchase" | "grandfathered" | "admin" | "none";
  /** Number of tasks the learner has submitted or completed. */
  workDone: number;
  /** Free preview consumed: first task finished. */
  previewComplete: boolean;
  /** Free tier + preview consumed => further progress is gated. */
  locked: boolean;
  freePreviewCompletedAt: string | null;
  /** The one-time programme purchase on this account, when there is one. */
  purchase: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    country: string | null;
    paidAt: string | null;
    refundedAt: string | null;
    disputedAt: string | null;
  } | null;
  /** Live subscription state, when the learner has one. */
  subscription: {
    id: string;
    status: string;
    priceId: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

/** True while the learner has paid access, including a cancelled-but-paid period. */
function subscriptionGrantsAccess(row: {
  status: string;
  current_period_end: string | null;
}): boolean {
  const endsInFuture =
    !row.current_period_end || new Date(row.current_period_end).getTime() > Date.now();
  if (ACTIVE_STATUSES.includes(row.status)) return endsInFuture;
  if (row.status === "canceled") return endsInFuture && Boolean(row.current_period_end);
  return false;
}

export async function getAccessState(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<AccessState> {
  const [profileRes, tasksRes, subRes, purchaseRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("access_tier, access_source, unlocked_at, free_preview_completed_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["submitted", "reviewed", "done", "completed", "approved", "closed"]),
    supabase
      .from("subscriptions")
      .select("id, status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("programme_purchases")
      .select("id, status, amount, currency, country, paid_at, refunded_at, disputed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = (profileRes.data ?? null) as
    | {
        access_tier: string | null;
        access_source: string | null;
        unlocked_at: string | null;
        free_preview_completed_at: string | null;
      }
    | null;

  const subRow = (subRes.data ?? null) as
    | {
        id: string;
        status: string;
        price_id: string;
        current_period_end: string | null;
        cancel_at_period_end: boolean | null;
      }
    | null;

  const subscription = subRow
    ? {
        id: subRow.id,
        status: subRow.status,
        priceId: subRow.price_id,
        currentPeriodEnd: subRow.current_period_end,
        cancelAtPeriodEnd: Boolean(subRow.cancel_at_period_end),
      }
    : null;

  const purchaseRow = (purchaseRes.data ?? null) as null | {
    id: string;
    status: string;
    amount: number;
    currency: string;
    country: string | null;
    paid_at: string | null;
    refunded_at: string | null;
    disputed_at: string | null;
  };

  const purchase = purchaseRow
    ? {
        id: purchaseRow.id,
        status: purchaseRow.status,
        amount: purchaseRow.amount,
        currency: purchaseRow.currency,
        country: purchaseRow.country,
        paidAt: purchaseRow.paid_at,
        refundedAt: purchaseRow.refunded_at,
        disputedAt: purchaseRow.disputed_at,
      }
    : null;

  // Access must be backed by a real payment (or an explicit admin grant).
  // Historical `grandfathered` profile rows must not silently bypass checkout:
  // that was the reason unpaid test accounts could open every module.
  const subscribed = subRow ? subscriptionGrantsAccess(subRow) : false;
  const purchased = Boolean(
    purchaseRow?.status === "paid" &&
      purchaseRow.paid_at &&
      !purchaseRow.refunded_at &&
      !purchaseRow.disputed_at,
  );
  const adminGranted =
    profile?.access_tier === "full" && profile?.access_source === "admin";
  const tier = purchased || subscribed || adminGranted ? "full" : "free";
  const workDone = tasksRes.count ?? 0;
  let freePreviewCompletedAt = profile?.free_preview_completed_at ?? null;
  // The preview is consumed by the first finished piece of work — a submitted
  // task, or the onboarding email reply, which stamps the profile directly.
  const previewComplete = workDone >= 1 || Boolean(freePreviewCompletedAt);

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
    accessSource: ((profile?.access_source ?? "none") as AccessState["accessSource"]),
    workDone,
    previewComplete,
    locked: tier === "free" && previewComplete,
    freePreviewCompletedAt,
    purchase,
    subscription,
  };
}

/** Throws when the learner has used up the free preview and has not paid. */
export async function markPreviewConsumed(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<AccessState> {
  const state = await getAccessState(supabase, userId);
  if (!state.freePreviewCompletedAt) {
    const now = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ free_preview_completed_at: now })
      .eq("id", userId);
    return { ...state, freePreviewCompletedAt: now, previewComplete: true, locked: state.tier === "free" };
  }
  return state;
}

/** Throws when the learner has used up the free preview and has not paid. */
export async function assertProgrammeAccess(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<void> {
  const access = await getAccessState(supabase, userId);
  if (access.locked) throw new Error(PAYWALL_MESSAGE);
}