/**
 * Server-only fulfilment for the "unlock full experience" purchase.
 * Called from the verified payment webhooks — never from the client.
 */

/** Marks a purchase paid and grants the buyer full programme access. */
export async function fulfilUnlock(reference: string, status: "paid" | "failed") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: purchase } = await supabaseAdmin
    .from("programme_purchases")
    .select("id, user_id, status")
    .eq("provider_ref", reference)
    .maybeSingle();
  if (!purchase) return;

  await supabaseAdmin
    .from("programme_purchases")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", (purchase as { id: string }).id);

  if (status !== "paid") return;

  const userId = (purchase as { user_id: string }).user_id;
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ access_tier: "full", unlocked_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) console.error("unlock grant failed", error);
}