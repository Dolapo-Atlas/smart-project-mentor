import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import { AlertTriangle, PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyAccess } from "@/lib/access.functions";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";
import { trackLearner } from "@/lib/learner-events";
import { formatMinor } from "@/lib/money";

/**
 * Purchase lifecycle surface for the workspace: a one-off unlock celebration,
 * and a notice if a payment was reversed. Atlas sells a single one-time unlock,
 * so there is no renewal, dunning or cancellation state to show.
 * Presentation only — access rules live in access.server.ts.
 */
/** Only celebrate a purchase that completed in the last few minutes. */
const CELEBRATION_WINDOW_MS = 15 * 60 * 1000;

function justPaid(paidAt: string | null | undefined) {
  if (!paidAt) return false;
  const t = Date.parse(paidAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < CELEBRATION_WINDOW_MS;
}

export function SubscriptionNotices() {
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess() });
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const firedRef = useRef<string | null>(null);

  const purchase = access?.purchase ?? null;
  const reversed = Boolean(purchase?.refundedAt || purchase?.disputedAt);

  // First time we see a paid purchase for this learner, celebrate once and send
  // the confirmation + admin notification. Keyed on the purchase row so reloads
  // never double-fire.
  useEffect(() => {
    if (!purchase || purchase.status !== "paid") return;
    // The celebration belongs to the moment of purchase only. Without this the
    // banner reappears on every sign-in whenever localStorage was cleared or the
    // learner logs in from another device/browser.
    if (!justPaid(purchase.paidAt)) return;
    if (typeof window === "undefined") return;
    if (firedRef.current === purchase.id) return;
    const key = `atlas.unlock-welcomed.${purchase.id}`;
    if (window.localStorage.getItem(key) === "1") return;
    firedRef.current = purchase.id;
    window.localStorage.setItem(key, "1");

    setCelebrating(true);
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 }, ticks: 260 });
    trackLearner("subscription_activated", {
      props: { amount: purchase.amount, currency: purchase.currency },
    });

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user?.email) return;
      const name =
        (user.user_metadata?.display_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        "";
      // Amount and currency come from the confirmed payment record only.
      const amount = formatMinor(purchase.amount, purchase.currency);
      const origin = window.location.origin;
      await sendTransactionalEmail({
        templateName: "unlock-confirmation",
        recipientEmail: user.email,
        idempotencyKey: `unlock-confirmation-${purchase.id}`,
        templateData: {
          name,
          first_name: name.split(/\s+/)[0] ?? "",
          amount_paid: amount,
          // Deep link back to the saved Project Charter position.
          continue_url: `${origin}/app/charter`,
        },
      });
      await sendTransactionalEmail({
        templateName: "purchase-admin-alert",
        recipientEmail: user.email,
        idempotencyKey: `unlock-admin-${purchase.id}`,
        templateData: {
          name,
          email: user.email,
          plan: "Atlas Project Readiness Experience",
          amount,
          region: purchase.country ?? "",
          price_id: purchase.currency,
          started_at: purchase.paidAt ?? new Date().toISOString(),
        },
      });
    })();
  }, [purchase]);

  if (!purchase) return null;
  if (!celebrating && !(reversed && !dismissed)) return null;

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
                {formatMinor(purchase.amount, purchase.currency)}, paid once — nothing renews. Everything
                from the preview is still here, and the rest of the project, every template, the
                Steering Committee gates and your credential are now open. We've emailed your
                receipt.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setCelebrating(false)}>
                  Back to my project
                </Button>
                <Button size="sm" variant="secondary" className="border border-border" asChild>
                  <Link to="/app/account">View my receipt</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reversed && !dismissed ? (
        <div className="atlas-rise flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium">Your payment was reversed.</p>
              <p className="text-sm text-muted-foreground">
                Your work is safe and stays on your account. Unlock again any time to carry on where
                you stopped.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/app/unlock">Unlock again</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
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
