import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import { AlertTriangle, CalendarClock, CreditCard, PartyPopper, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMyAccess } from "@/lib/access.functions";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";
import { planFromPriceId } from "@/lib/plan-lookup";
import { trackLearner } from "@/lib/learner-events";

function formatDate(iso: string | null): string {
  if (!iso) return "the end of your paid period";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Subscription lifecycle surface for the workspace: a one-time unlock
 * celebration, a dunning banner while a renewal is retrying, and a wind-down
 * banner once a cancellation is scheduled. Presentation only — access rules
 * still live in access.server.ts.
 */
export function SubscriptionNotices() {
  const fetchAccess = useServerFn(getMyAccess);
  const openPortal = useServerFn(createPortalSession);
  const { data: access } = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess() });
  const [celebrating, setCelebrating] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const firedRef = useRef<string | null>(null);

  const sub = access?.subscription ?? null;
  const plan = planFromPriceId(sub?.priceId);

  // First time we see a live subscription for this learner, celebrate once and
  // send the welcome + admin notification. Keyed on the subscription row so a
  // later resubscribe celebrates again, but reloads never double-fire.
  useEffect(() => {
    if (!sub) return;
    if (typeof window === "undefined") return;
    if (!["active", "trialing"].includes(sub.status)) return;
    if (firedRef.current === sub.id) return;
    const key = `atlas.sub-welcomed.${sub.id}`;
    if (window.localStorage.getItem(key) === "1") return;
    firedRef.current = sub.id;
    window.localStorage.setItem(key, "1");

    setCelebrating(true);
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 }, ticks: 260 });
    trackLearner("subscription_activated", {
      props: { priceId: sub.priceId, status: sub.status },
    });

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user?.email) return;
      const name =
        (user.user_metadata?.display_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        "";
      await sendTransactionalEmail({
        templateName: "subscription-welcome",
        recipientEmail: user.email,
        idempotencyKey: `sub-welcome-${sub.id}`,
        templateData: { name, plan: plan?.label, amount: plan?.amount },
      });
      await sendTransactionalEmail({
        templateName: "subscription-admin-alert",
        recipientEmail: user.email,
        idempotencyKey: `sub-admin-${sub.id}`,
        templateData: {
          name,
          email: user.email,
          plan: plan?.label,
          amount: plan?.amount,
          region: plan?.region,
          price_id: sub.priceId,
          started_at: new Date().toISOString(),
        },
      });
    })();
  }, [sub, plan]);

  async function manageBilling() {
    if (!paymentsConfigured()) {
      toast.error("Billing isn't available in this build yet.");
      return;
    }
    try {
      const res = await openPortal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/app`,
        },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open billing.");
    }
  }

  const pastDue = sub?.status === "past_due";
  const windingDown =
    Boolean(sub) &&
    (sub!.cancelAtPeriodEnd || sub!.status === "canceled") &&
    Boolean(sub!.currentPeriodEnd) &&
    new Date(sub!.currentPeriodEnd as string).getTime() > Date.now();

  if (!sub) return null;

  return (
    <div className="space-y-3">
      {celebrating ? (
        <div className="atlas-rise relative overflow-hidden rounded-xl border border-primary/30 bg-primary/10 p-5">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setCelebrating(false)}
            className="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-medium tracking-tight">
                Full experience unlocked.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan ? `${plan.label} · ${plan.amount}. ` : ""}
                Everything from the preview is still here — the rest of the project, every
                template, the Steering Committee gates and your credential are now open. We've
                emailed you a confirmation.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setCelebrating(false)}>
                  Back to my project
                </Button>
                <Button size="sm" variant="secondary" className="border border-border" asChild>
                  <Link to="/app/unlock">Manage subscription</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pastDue ? (
        <div className="atlas-rise flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium">
                Your last payment didn't go through.
              </p>
              <p className="text-sm text-muted-foreground">
                Nothing is locked — you keep full access while we retry. Update your card to keep
                it that way.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={manageBilling} className="shrink-0">
            <CreditCard className="mr-2 h-4 w-4" />
            Update card
          </Button>
        </div>
      ) : null}

      {windingDown && !dismissedBanner ? (
        <div className="atlas-rise flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Your access ends on {formatDate(sub.currentPeriodEnd)}.
              </p>
              <p className="text-sm text-muted-foreground">
                You can carry on as normal until then. Your work is kept either way — resubscribe
                any time and pick up exactly where you stopped.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" onClick={manageBilling}>
              Resubscribe
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissedBanner(true)}
              className="text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}