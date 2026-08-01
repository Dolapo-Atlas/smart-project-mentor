import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Declared locally (duplicated with the server utility) so this client module
 * has no cross-tree imports into server-only code.
 */
type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/**
 * Derive the environment from the token PREFIX, never from its mere presence.
 * A missing/unknown token is a configuration error (published before go-live
 * finished) — fail loudly rather than silently routing to live.
 */
function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Payments are not configured for this build. Complete go-live in your Lovable project to enable production checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

/** True when checkout can be opened at all in this build. */
export function paymentsConfigured(): boolean {
  return Boolean(
    clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_"),
  );
}