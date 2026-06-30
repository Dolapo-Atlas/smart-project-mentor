import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAILS = ["rasaqdolapo@gmail.com", "fuhad.dolapo@gmail.com"];

function isAdminClaims(claims: any): boolean {
  const email = (claims?.email ?? "").toString().toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

export const approveSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; note?: string }) => data)
  .handler(async ({ data, context }) => {
    if (!isAdminClaims(context.claims)) {
      throw new Response("Forbidden", { status: 403 });
    }
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Response("Email required", { status: 400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("signup_allowlist")
      .upsert({ email, note: data.note ?? "approved via admin" }, { onConflict: "email" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllowlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdminClaims(context.claims)) {
      throw new Response("Forbidden", { status: 403 });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("signup_allowlist")
      .select("email");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.email.toLowerCase());
  });