import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Maps an old /cert/:slug outcome share link to the new verifiable credential
 * code, when one has been issued for that run.
 */
export const findCredentialForOutcomeSlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().trim().min(6).max(64) }).parse(d),
  )
  .handler(async ({ data }): Promise<string | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: outcome } = await supabaseAdmin
      .from("project_outcomes")
      .select("id")
      .eq("share_slug", data.slug)
      .maybeSingle();
    if (!outcome) return null;
    const { data: cert } = await supabaseAdmin
      .from("certificates")
      .select("verification_code")
      .eq("outcome_id", outcome.id)
      .eq("certificate_status", "valid")
      .maybeSingle();
    return cert?.verification_code ?? null;
  });