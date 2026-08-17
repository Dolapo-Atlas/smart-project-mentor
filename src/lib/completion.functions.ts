import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readCompletionState } from "@/lib/completion.server";

/** Presentation-only: is the learner's current run finished, and with what result? */
export const getCompletionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readCompletionState(context.supabase, context.userId));
