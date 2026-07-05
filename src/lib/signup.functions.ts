import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server-side check against the invite allowlist. The underlying table and
// RPC are locked down; only the service role (via supabaseAdmin) can read them.
export const checkEmailAllowed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email().max(254) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("signup_allowlist")
      .select("email")
      .ilike("email", data.email)
      .maybeSingle();
    if (error) throw error;
    return { allowed: !!row };
  });

// Server-side referral count. Reads through the admin client so anon has no
// direct access to the early_access_signups table.
export const getReferralStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("early_access_signups")
      .select("id", { count: "exact", head: true })
      .eq("referred_by_code", data.code);
    if (error) throw error;
    return { count: count ?? 0 };
  });