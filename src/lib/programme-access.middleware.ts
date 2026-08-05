import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Authenticated + paid. Any server function that writes simulation progress
 * beyond the free preview must use this instead of `requireSupabaseAuth`,
 * otherwise learners can walk around the unlock screen by opening another
 * module.
 */
export const requireProgrammeAccess = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { getAccessState, PAYWALL_MESSAGE } = await import("@/lib/access.server");
    const access = await getAccessState(context.supabase, context.userId);
    // Premium module writes always require verified full access. The free
    // preview is implemented only by its explicit task/email/Charter flows;
    // it must never make premium server functions temporarily writable.
    if (access.tier !== "full") throw new Error(PAYWALL_MESSAGE);
    return next();
  });
