import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as React from "react";
import { render } from "react-email";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "Atlas";
const SENDER_DOMAIN = "notify.atlassim.co";
const FROM_DOMAIN = "atlassim.co";

/**
 * Called on every authenticated app load. Ensures a profile row exists
 * (the auth trigger normally handles this), refreshes last_login_at /
 * last_active_at, and — on the user's first login — notifies the Atlas
 * admin via the existing email pipeline.
 */
export const recordSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const claims: any = context.claims ?? {};
    const email: string = (claims.email ?? "").toString().toLowerCase();
    const meta = (claims.user_metadata ?? {}) as Record<string, any>;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, email, avatar_url, country, last_login_at, display_name, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    const isFirstLogin = !existing || !existing.last_login_at;
    const now = new Date().toISOString();
    // Throttle login alerts so a returning user in one sitting doesn't spam us.
    const lastLoginMs = existing?.last_login_at ? Date.parse(existing.last_login_at) : 0;
    const shouldNotifyLogin =
      isFirstLogin || Date.now() - lastLoginMs > 60 * 60 * 1000;

    const display =
      existing?.display_name ||
      meta.full_name || meta.name || meta.display_name ||
      (email ? email.split("@")[0] : "New user");
    const first_name = existing?.first_name || meta.given_name || meta.first_name || display.split(" ")[0];
    const last_name = existing?.last_name || meta.family_name || meta.last_name || null;
    const avatar_url = existing?.avatar_url || meta.avatar_url || meta.picture || null;
    const country = existing?.country || meta.country || meta.locale || null;

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: email || existing?.email || null,
          display_name: display,
          first_name,
          last_name,
          avatar_url,
          country,
          last_login_at: now,
          last_active_at: now,
        },
        { onConflict: "id" },
      );

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "beta_tester" }, { onConflict: "user_id,role" });

    if (shouldNotifyLogin) {
      try {
        const tpl = TEMPLATES["early-access-signup"];
        const recipients = ["rasaqdolapo@gmail.com", "fuhad.dolapo@gmail.com"];
        if (tpl && email) {
          const templateData = {
            name: display,
            email,
            desired_role: "Beta Tester",
            country: country ?? "—",
            experience_level: "—",
            submitted_at: now,
          };
          const element = React.createElement(tpl.component, templateData);
          const html = await render(element);
          const text = await render(element, { plainText: true });
          const baseSubject =
            typeof tpl.subject === "function" ? tpl.subject(templateData) : tpl.subject;
          const subject = isFirstLogin
            ? `New Atlas user: ${display}`
            : `Atlas login: ${display}`;
          void baseSubject;
          const slot = new Date(now).toISOString().slice(0, 13); // hourly bucket
          for (const recipient of recipients) {
            const messageId = crypto.randomUUID();
            await supabaseAdmin.from("email_send_log").insert({
              message_id: messageId,
              template_name: isFirstLogin ? "new-user-signup" : "user-login",
              recipient_email: recipient,
              status: "pending",
            });
            await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                message_id: messageId,
                to: recipient,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: "transactional",
                label: isFirstLogin ? "new-user-signup" : "user-login",
                idempotency_key: isFirstLogin
                  ? `new-user-${userId}-${recipient}`
                  : `login-${userId}-${slot}-${recipient}`,
                queued_at: now,
              },
            });
          }
        }
      } catch (err) {
        console.error("login notify failed", err);
      }
    }

    return { ok: true, firstLogin: isFirstLogin };
  });

export const touchActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) return { isAdmin: false };
    return { isAdmin: !!data };
  });