import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Free-preview / paid-access state for the signed-in learner. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccessState } = await import("@/lib/access.server");
    return getAccessState(context.supabase, context.userId);
  });

const unlockSchema = z.object({
  country: z.enum(["nigeria", "india", "international"]),
  origin: z.string().url().max(300),
});

/** Prices for the unlock screen, in the learner's local currency. */
export const getUnlockPricing = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("landing_settings")
    .select("price_ngn, price_inr, price_usd, checkout_note")
    .eq("id", 1)
    .maybeSingle();
  return {
    nigeria: data?.price_ngn ?? 20000,
    india: data?.price_inr ?? 1499,
    international: data?.price_usd ?? 10,
    checkoutNote: (data?.checkout_note ?? null) as string | null,
  };
});

/**
 * Opens a checkout session for the full experience and records a pending
 * purchase. Returns `{ ok: false, reason }` instead of throwing so the unlock
 * screen can show a clear state.
 */
export const startUnlockCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => unlockSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initPaystack, initRazorpay, gatewayConfigured } = await import("@/lib/payments.server");

    const CURRENCY = { nigeria: "NGN", india: "INR", international: "GBP" } as const;
    const GATEWAY = { nigeria: "paystack", india: "razorpay", international: null } as const;

    const { data: settings } = await supabaseAdmin
      .from("landing_settings")
      .select("price_ngn, price_inr, price_usd")
      .eq("id", 1)
      .maybeSingle();

    const amount =
      data.country === "nigeria"
        ? (settings?.price_ngn ?? 20000)
        : data.country === "india"
          ? (settings?.price_inr ?? 1499)
          : (settings?.price_usd ?? 10);

    const gateway = GATEWAY[data.country];
    const reference = `ATLAS-UNLOCK-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

    const { error: insertError } = await supabaseAdmin.from("programme_purchases").insert({
      user_id: context.userId,
      provider: gateway ?? "pending",
      provider_ref: reference,
      amount,
      currency: CURRENCY[data.country],
      country: data.country,
      status: "pending",
    });
    if (insertError) {
      console.error("unlock purchase insert failed", insertError);
      return { ok: false as const, reason: "purchase_failed" };
    }

    if (!gateway || !gatewayConfigured(gateway)) {
      return { ok: false as const, reason: "gateway_not_configured", reference };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const email = (profile?.email as string | null) ?? `${context.userId}@atlassim.co`;

    const callbackUrl = `${data.origin.replace(/\/$/, "")}/app/unlock?ref=${reference}`;
    const result =
      gateway === "paystack"
        ? await initPaystack({
            email,
            amountMajor: amount,
            reference,
            callbackUrl,
            metadata: { reference, country: data.country, kind: "unlock" },
          })
        : await initRazorpay({
            email,
            name: (profile?.display_name as string | null) ?? null,
            amountMajor: amount,
            reference,
            callbackUrl,
            notes: { reference, country: data.country, kind: "unlock" },
          });

    if (!result.ok || !result.url) {
      return { ok: false as const, reason: result.error ?? "gateway_error", reference };
    }
    return { ok: true as const, url: result.url, reference };
  });