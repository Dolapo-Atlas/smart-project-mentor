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
    await supabase
      .from("profiles")
      .update({ access_tier: "full", unlocked_at: new Date().toISOString() })
      .eq("id", userId);
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

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
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