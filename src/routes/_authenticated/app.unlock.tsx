import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UnlockScreen } from "@/components/dashboard/unlock-screen";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getMyAccess } from "@/lib/access.functions";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { trackLearner } from "@/lib/learner-events";
import { formatMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/app/unlock")({
  component: UnlockPage,
  head: () => ({
    meta: [
      { title: "Unlock the full Atlas experience | Atlas" },
      {
        name: "description",
        content:
          "Continue the Atlas Digital Care Records workplace experience end to end, with AI feedback, Steering Committee gates and a verifiable credential.",
      },
      { property: "og:title", content: "Unlock the full Atlas experience" },
      {
        property: "og:description",
        content:
          "Continue the Digital Care Records project from initiation to closure and earn your Atlas credential.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function UnlockPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const openPortal = useServerFn(createPortalSession);
  const { data: access, isLoading } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
    // While a payment is confirming, keep checking.
    refetchInterval: (q) => (q.state.data?.tier === "full" ? false : 5000),
  });

  useEffect(() => {
    if (access && access.tier !== "full") trackLearner("unlock_screen_shown");
  }, [access]);

  const returningFromCheckout =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).has("session_id") ||
      new URLSearchParams(window.location.search).has("ref"));

  async function manageBilling() {
    try {
      const res = await openPortal({
        data: {
          returnUrl: `${window.location.origin}/app/unlock`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      window.open(res.url, "_blank");
    } catch {
      toast.error("We couldn't open your receipt just then.");
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (access?.tier === "full") {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent-orange" aria-hidden />
        <h1 className="mt-5 font-display text-3xl font-medium tracking-[-0.02em]">
          You have full access
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          The whole Digital Care Records project is open to you — every phase, every
          deliverable, every gate, right through to your credential.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/app">Back to my project</Link>
          </Button>
          {access.purchase?.status === "paid" && paymentsConfigured() && (
            <Button size="lg" variant="outline" className="rounded-full" onClick={manageBilling}>
              View my receipt
            </Button>
          )}
        </div>
        {access.purchase?.status === "paid" && (
          <p className="mt-4 text-sm text-muted-foreground">
            {formatMinor(access.purchase.amount, access.purchase.currency)} paid once. No
            subscription — nothing renews automatically.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <PaymentTestModeBanner />
      {returningFromCheckout && (
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
          Confirming your payment. This page will update by itself — it usually takes a few
          seconds.
        </div>
      )}
      <UnlockScreen />
    </div>
  );
}