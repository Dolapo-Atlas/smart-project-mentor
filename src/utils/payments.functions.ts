import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import {
  PLAN_PRICE_EXPECTATIONS,
  PLAN_PRICE_IDS,
  PROGRAMME_ID,
  PROGRAMME_NAME,
} from "@/lib/plans";

type CheckoutSessionResult =
  | { clientSecret: string }
  | { alreadyPaid: true }
  | { error: string };
type PortalSessionResult = { url: string } | { error: string };
/** Live provider amounts, keyed by human-readable price ID (lookup key). */
type PlanPricesResult = Record<string, { amount: number; currency: string }>;

const envSchema = z.enum(["sandbox", "live"]);

/**
 * The authoritative price list: read straight from the payment provider so the
 * paywall can never drift from what Checkout actually charges.
 */
export const getPlanPrices = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ environment: envSchema }).parse(d))
  .handler(async ({ data }): Promise<PlanPricesResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: PLAN_PRICE_IDS,
        active: true,
        limit: 20,
      });
      const out: PlanPricesResult = {};
      for (const price of prices.data) {
        const key = price.lookup_key ?? price.metadata?.["lovable_external_id"];
        // Recurring prices are never valid for Atlas — it is a one-time unlock.
        if (!key || price.unit_amount == null || price.type !== "one_time") continue;
        out[key] = { amount: price.unit_amount, currency: (price.currency ?? "").toUpperCase() };
      }
      return out;
    } catch (error) {
      console.error("plan price lookup failed", error);
      return {};
    }
  });

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

      // Resolve the amount from the provider, never from the client or from
      // any amount stored in the app. Only an ACTIVE, ONE-TIME price may be
      // charged, so a stale or recurring price can never open checkout.
      const prices = await stripe.prices.list({
        lookup_keys: [data.priceId],
        active: true,
        expand: ["data.product"],
      });
      const price = prices.data.find((p) => p.type === "one_time" && p.active);
      if (!price) return { error: "That plan is not available yet. Please try again shortly." };
      if (price.recurring) {
        return { error: "That plan is misconfigured as a subscription. Please contact support." };
      }

      // Fail closed if the provider catalogue ever drifts again. Checkout
      // still charges the provider Price object below; this guard prevents an
      // incorrect active price from ever reaching the learner.
      const expected = PLAN_PRICE_EXPECTATIONS[data.priceId];
      const providerCurrency = (price.currency ?? "").toUpperCase();
      if (
        !expected ||
        price.unit_amount !== expected.amount ||
        providerCurrency !== expected.currency ||
        price.tax_behavior !== "inclusive"
      ) {
        console.error("checkout price safety check failed", {
          priceId: data.priceId,
          providerAmount: price.unit_amount,
          providerCurrency,
          providerTaxBehavior: price.tax_behavior,
          expectedAmount: expected?.amount,
          expectedCurrency: expected?.currency,
        });
        return {
          error: "Checkout is temporarily unavailable because the final payment total does not match the advertised tax-inclusive price. You have not been charged.",
        };
      }

      const { data: profile } = await context.supabase
        .from("profiles")
        .select("*")
        .eq("id", context.userId)
        .maybeSingle();

      const p = (profile ?? {}) as Record<string, unknown>;
      const email = (p["email"] as string | null) ?? undefined;
      const role =
        (p["preferred_role"] as string | null) ??
        (p["role"] as string | null) ??
        (p["career_goal"] as string | null) ??
        "";
      const country = (p["country"] as string | null) ?? "";

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
        // Audit trail: the provider amount this session was opened with.
        expectedAmount: String(price.unit_amount ?? ""),
        expectedCurrency: (price.currency ?? "").toUpperCase(),
      };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        // One-time purchase only. Atlas never creates subscriptions.
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

/**
 * Opens the hosted billing portal so learners can download their receipt and
 * see their payment history. Resolved from the provider customer record (keyed
 * on `metadata.userId`) rather than a subscription row, because Atlas sells a
 * one-time unlock and never creates subscriptions.
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ returnUrl: z.string().url().max(500).optional(), environment: envSchema }).parse(d),
  )
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      if (!/^[a-zA-Z0-9_-]+$/.test(context.userId)) return { error: "Invalid account." };
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${context.userId}'`,
        limit: 1,
      });
      const customerId = found.data[0]?.id;
      if (!customerId) {
        return { error: "We couldn't find a payment on your account yet." };
      }

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