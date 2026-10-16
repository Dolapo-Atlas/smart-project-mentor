import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

/**
 * Learner-facing email notices. Each function sends only to the authenticated
 * account's own registered address (or the fixed internal inbox for admin
 * alerts) — the browser never supplies a recipient. Sends go through the
 * managed email helper; outcomes are recorded in email_send_log so the
 * delivery history view keeps working.
 */
async function logSend(
  supabaseAdmin: any,
  row: {
    template_name: string;
    recipient_email: string;
    status: "sent" | "suppressed" | "failed";
    error_message?: string;
  },
) {
  const { error } = await supabaseAdmin.from("email_send_log").insert(row);
  if (error) console.error("email_send_log insert failed", { error });
}

async function sendWithLog(
  supabaseAdmin: any,
  templateName: string,
  recipient: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
) {
  try {
    const result = await sendTemplateEmail(templateName, recipient, {
      templateData,
      idempotencyKey,
    });
    await logSend(supabaseAdmin, {
      template_name: templateName,
      recipient_email: recipient,
      status: result.sent ? "sent" : "suppressed",
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSend(supabaseAdmin, {
      template_name: templateName,
      recipient_email: recipient,
      status: "failed",
      error_message: message.slice(0, 1000),
    });
    throw err;
  }
}

/** Unlock celebration: confirmation to the learner + alert to the Atlas inbox. */
export const sendUnlockNotices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      purchaseId: string;
      amount: string;
      currency: string;
      country?: string;
      paidAt?: string;
      continueUrl?: string;
    }) => data,
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claims: any = context.claims ?? {};
    const email: string = (claims.email ?? "").toString().toLowerCase();
    if (!email) return { ok: false as const };
    const meta = (claims.user_metadata ?? {}) as Record<string, any>;
    const name: string = meta.display_name || meta.full_name || "";

    await sendWithLog(
      supabaseAdmin,
      "unlock-confirmation",
      email,
      {
        name,
        first_name: name.split(/\s+/)[0] ?? "",
        amount_paid: data.amount,
        continue_url: data.continueUrl ?? "",
      },
      `unlock-confirmation-${data.purchaseId}`,
    ).catch((err) => console.error("unlock-confirmation send failed", err));

    await sendWithLog(
      supabaseAdmin,
      "purchase-admin-alert",
      email,
      {
        name,
        email,
        plan: "Atlas Project Readiness Experience",
        amount: data.amount,
        region: data.country ?? "",
        price_id: data.currency,
        started_at: data.paidAt ?? new Date().toISOString(),
      },
      `unlock-admin-${data.purchaseId}`,
    ).catch((err) => console.error("purchase-admin-alert send failed", err));

    return { ok: true as const };
  });

/** Post-payment enrolment confirmation to the learner's own address. */
export const sendEnrolmentConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { reference: string; firstName?: string; amount: string }) => data,
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claims: any = context.claims ?? {};
    const email: string = (claims.email ?? "").toString().toLowerCase();
    if (!email) return { ok: false as const };

    await sendWithLog(
      supabaseAdmin,
      "enrolment-confirmation",
      email,
      {
        name: data.firstName ?? undefined,
        amount: data.amount,
        reference: data.reference,
      },
      `enrolment-confirmation-${data.reference}`,
    ).catch((err) => console.error("enrolment-confirmation send failed", err));

    return { ok: true as const };
  });

/** One-time charter nudge to the learner's registered address. */
export const sendCharterNudgeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      instanceId: string;
      name: string;
      pmName: string;
      projectName: string;
      appUrl: string;
    }) => data,
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claims: any = context.claims ?? {};
    const email: string = (claims.email ?? "").toString().toLowerCase();
    if (!email) return { ok: false as const };

    const result = await sendWithLog(
      supabaseAdmin,
      "charter-nudge",
      email,
      {
        name: data.name,
        pm_name: data.pmName,
        project_name: data.projectName,
        app_url: data.appUrl,
      },
      `charter-nudge-${data.instanceId}`,
    ).catch((err) => {
      console.error("charter-nudge send failed", err);
      return { sent: false as const };
    });

    return { ok: true as const, sent: result.sent };
  });
