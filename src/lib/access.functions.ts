import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Free-preview / paid-access state for the signed-in learner. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccessState } = await import("@/lib/access.server");
    return getAccessState(context.supabase, context.userId);
  });

/** Editable note shown under the unlock checkout. Prices live in `@/lib/plans`. */
export const markFreePreviewComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { markPreviewConsumed } = await import("@/lib/access.server");
    return markPreviewConsumed(context.supabase, context.userId);
  });

/** Editable note shown under the unlock checkout. Prices live in `@/lib/plans`. */
export const getUnlockPricing = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("landing_settings")
    .select("checkout_note")
    .eq("id", 1)
    .maybeSingle();
  return {
    checkoutNote: (data?.checkout_note ?? null) as string | null,
  };
});
/**
 * Permanently deletes the signed-in learner's account and all of their data.
 * Cascading foreign keys on auth.users remove the simulation records with it.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
