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
    const { assertProgrammeAccess } = await import("@/lib/access.server");
    await assertProgrammeAccess(context.supabase, context.userId);
    return next();
  });
