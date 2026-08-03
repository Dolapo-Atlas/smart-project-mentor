import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import { PLAN_PRICE_IDS, PROGRAMME_ID, PROGRAMME_NAME } from "@/lib/plans";

type CheckoutSessionResult =
  | { clientSecret: string }
  | { alreadyPaid: true }
  | { error: string };
type PortalSessionResult = { url: string } | { error: string };

const envSchema = z.enum(["sandbox", "live"]);

const checkoutSchema = z.object({
  priceId: z.string().refine((v) => PLAN_PRICE_IDS.includes(v), "Unknown plan"),
  returnUrl: z.string().url().max(500),
  environment: envSchema,
});

/**
 * Resolves (or creates) the payment-provider customer for this learner, with
 * `metadata.userId` set so later reads can find them by search.
 */
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

/** Opens an embedded one-time checkout for the signed-in learner. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      // Never charge a learner who already owns the programme.
      const { getAccessState } = await import("@/lib/access.server");
      const access = await getAccessState(context.supabase, context.userId);
      if (access.tier === "full") return { alreadyPaid: true };

      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) return { error: "That plan is not available yet. Please try again shortly." };

      const { data: profile } = await context.supabase
        .from("profiles")
        .select("*")
        .eq("id", context.userId)
        .maybeSingle();

      const email = (profile?.["email"] as string | null) ?? undefined;
      const role =
        (profile?.["preferred_role"] as string | null) ??
        (profile?.["role"] as string | null) ??
        "";
      const country =
        (profile?.["country"] as string | null) ??
        (profile?.["region"] as string | null) ??
        "";

      const customerId = await resolveOrCreateCustomer(stripe, {
        email,
        userId: context.userId,
      });

      const metadata: Record<string, string> = {
        userId: context.userId,
        userEmail: email ?? "",
        programmeId: PROGRAMME_ID,
        programmeName: PROGRAMME_NAME,
        selectedRole: role,
        selectedCountry: country,
        selectedCurrency: (price.currency ?? "").toUpperCase(),
        priceId: data.priceId,
      };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        // UK seller: the provider handles tax calculation, filing and
        // remittance, fraud, disputes and buyer support.
        managed_payments: { enabled: true },
        metadata,
        payment_intent_data: { description: PROGRAMME_NAME, metadata },
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("checkout session failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Opens the hosted billing portal so learners can manage or cancel. */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ returnUrl: z.string().url().max(500).optional(), environment: envSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerId = (sub?.stripe_customer_id as string | undefined) ?? null;
    if (!customerId) return { error: "We couldn't find a subscription on your account." };

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      console.error("portal session failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });