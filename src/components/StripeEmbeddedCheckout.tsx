import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

interface Props {
  priceId: string;
  returnUrl?: string;
}

/** Inline, PCI-compliant checkout form. No redirect, no custom card fields. */
export function StripeEmbeddedCheckout({ priceId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId,
        returnUrl: returnUrl || window.location.href,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if ("alreadyPaid" in result) {
      throw new Error("You already have full access — no further payment is needed.");
    }
    if (!result.clientSecret) throw new Error("Checkout could not be opened.");
    return result.clientSecret;
  };

  return (
    <div id="checkout" className="mt-6">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}