import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function resolvePriceId(item: any): string {
  return (
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id ||
    "unknown"
  );
}

function iso(seconds?: number | null): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/** Grants paid programme access. Only ever called from a verified event. */
async function grantAccess(supabase: any, userId: string, source: "purchase") {
  const { error } = await supabase
    .from("profiles")
    .update({
      access_tier: "full",
      access_source: source,
      unlocked_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) console.error("programme unlock failed", error);
}

/**
 * Removes paid access after a refund or chargeback — but never demotes an
 * account whose access came from grandfathering or an admin grant.
 */
async function revokeAccess(supabase: any, userId: string, reason: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("access_source")
    .eq("id", userId)
    .maybeSingle();
  if (profile && profile.access_source !== "purchase") {
    console.log("access retained despite", reason, "- source:", profile?.access_source);
    return;
  }
  const { error } = await supabase
    .from("profiles")
    .update({ access_tier: "free", access_source: "none", unlocked_at: null })
    .eq("id", userId);
  if (error) console.error("access revoke failed", error);
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("subscription webhook without userId metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const supabase = await admin();

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: item?.price?.product ?? "unknown",
      price_id: resolvePriceId(item),
      status: subscription.status,
      current_period_start: iso(item?.current_period_start ?? subscription.current_period_start),
      current_period_end: iso(item?.current_period_end ?? subscription.current_period_end),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  // Mirror onto the profile so existing access checks and the unlock screen
  // reflect the purchase immediately.
  if (["active", "trialing", "past_due"].includes(subscription.status)) {
    await grantAccess(supabase, userId, "purchase");
  }
}

async function markCanceled(subscription: any, env: StripeEnv) {
  const supabase = await admin();
  const item = subscription.items?.data?.[0];
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      current_period_end: iso(item?.current_period_end ?? subscription.current_period_end),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  const endsAt = iso(item?.current_period_end ?? subscription.current_period_end);
  // Only drop the profile flag once the paid period has actually elapsed.
  if (userId && (!endsAt || new Date(endsAt).getTime() <= Date.now())) {
    await supabase.from("profiles").update({ access_tier: "free" }).eq("id", userId);
  }
}

/**
 * One-time programme purchase. Access is granted ONLY here, from a
 * signature-verified provider event — never from the success redirect.
 * Idempotent: the purchase row is keyed on the payment reference.
 */
async function fulfilOneTimePurchase(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("checkout session without userId metadata", session.id);
    return;
  }
  // Unpaid = delayed-notification method still settling; wait for the async event.
  if (session.payment_status === "unpaid") return;

  const supabase = await admin();

  const reference: string =
    (typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id) || session.id;

  // Record the purchase so the learner (and you) have a durable receipt.
  const { error: purchaseError } = await supabase.from("programme_purchases").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_ref: reference,
      amount: session.amount_total ?? 0,
      currency: (session.currency ?? "gbp").toUpperCase(),
      country: session.metadata?.selectedCountry || "",
      status: "paid",
      paid_at: new Date().toISOString(),
      metadata: {
        environment: env,
        session_id: session.id,
        customer: session.customer ?? null,
        price_id: session.metadata?.priceId ?? null,
        role: session.metadata?.selectedRole ?? null,
        email: session.customer_details?.email ?? session.metadata?.userEmail ?? null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_ref" },
  );
  if (purchaseError) console.error("purchase record failed", purchaseError);

  await grantAccess(supabase, userId, "purchase");
}

/** Delayed payment failed after checkout — keep the record, grant nothing. */
async function markPaymentFailed(session: any) {
  const supabase = await admin();
  const reference: string =
    (typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id) || session.id;
  await supabase
    .from("programme_purchases")
    .update({ status: "failed", paid_at: null, updated_at: new Date().toISOString() })
    .eq("provider_ref", reference);
}

/** Refund or chargeback on a charge: remove access when it was bought. */
async function handleChargeReversal(
  charge: any,
  kind: "refund" | "dispute",
) {
  const supabase = await admin();
  const reference: string =
    (typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id) || charge.id;

  const { data: purchase } = await supabase
    .from("programme_purchases")
    .select("id, user_id, amount")
    .eq("provider_ref", reference)
    .maybeSingle();

  const amountRefunded = Number(charge.amount_refunded ?? charge.amount ?? 0);
  const now = new Date().toISOString();

  if (purchase) {
    await supabase
      .from("programme_purchases")
      .update({
        status: kind === "dispute" ? "disputed" : "refunded",
        amount_refunded: amountRefunded,
        ...(kind === "refund" ? { refunded_at: now } : { disputed_at: now }),
        updated_at: now,
      })
      .eq("id", purchase.id);
  }

  // A partial refund keeps access; a full refund or a chargeback removes it.
  const fullyReversed =
    kind === "dispute" || !purchase || amountRefunded >= Number(purchase.amount ?? 0);

  const userId = purchase?.user_id ?? charge.metadata?.userId;
  if (userId && fullyReversed) await revokeAccess(supabase, userId, kind);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfilOneTimePurchase(event.data.object, env);
      break;
    case "checkout.session.async_payment_failed":
      await markPaymentFailed(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeReversal(event.data.object, "refund");
      break;
    case "charge.dispute.created":
    case "charge.dispute.closed":
      await handleChargeReversal(
        event.data.object?.charge
          ? { ...event.data.object, id: event.data.object.charge }
          : event.data.object,
        "dispute",
      );
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    default:
      console.log("Unhandled payment event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook with invalid env parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});