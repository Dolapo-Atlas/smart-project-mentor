import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a registered app email through the transactional send route using the
 * signed-in user's Supabase session.
 */
export async function sendTransactionalEmail(input: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "not_authenticated" as const };

  const res = await fetch("/lovable/email/transactional/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Email send failed [${res.status}]: ${body}`);
    return { ok: false, error: body };
  }
  return { ok: true as const };
}