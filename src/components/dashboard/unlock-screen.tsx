import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUnlockPricing } from "@/lib/access.functions";
import { trackLearner } from "@/lib/learner-events";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import {
  PLANS,
  type PlanRegion,
  formatPlanPrice,
  guessRegion,
  planFor,
} from "@/lib/plans";
import { paymentsConfigured } from "@/lib/stripe";

const REGIONS: Array<{ key: PlanRegion; label: string }> = [
  { key: "nigeria", label: "Nigeria" },
  { key: "india", label: "India" },
  { key: "international", label: "UK & other markets" },
];

const ACHIEVE = [
  "Build practical judgement by working through realistic project situations",
  "Learn how to respond when stakeholders disagree, priorities change or delivery is under pressure",
  "Practise making decisions instead of memorising theoretical answers",
  "Become more confident explaining how you would handle real project challenges",
  "Strengthen the way you speak about risks, issues, scope, stakeholders and delivery",
  "Identify where your project judgement is strong and where it still needs work",
  "Develop concrete simulated-project examples you can discuss honestly in interviews",
  "Understand how your decisions affect project health, stakeholder confidence and delivery",
  "Receive structured feedback on your performance throughout the experience",
  "Complete the programme with a final performance report and verifiable Atlas credential",
];

const INCLUDES = [
  "Complete Project Charter",
  "Full Digital Care Records Rollout experience",
  "Stakeholder emails and workplace decisions",
  "RAID management",
  "Project tasks and deliverables",
  "Risks, issues and changing priorities",
  "Decision consequences",
  "Performance scoring and feedback",
  "Final performance report",
  "Verifiable Atlas credential",
];

/**
 * The single Atlas paywall panel. Presentation + checkout only — it does not
 * touch simulation logic. Shown at the locked half of the Project Charter.
 */
export function UnlockScreen({
  compact = false,
  returnUrl,
  onReturnToWorkspace,
}: {
  compact?: boolean;
  /** Where the provider sends the learner back to after payment. */
  returnUrl?: string;
  /** Optional handler for the secondary "Return to Workspace" action. */
  onReturnToWorkspace?: () => void;
}) {
  const fetchPricing = useServerFn(getUnlockPricing);
  const [region, setRegion] = useState<PlanRegion>(() => guessRegion());
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: pricing } = useQuery({
    queryKey: ["unlock-pricing"],
    queryFn: () => fetchPricing(),
  });

  const plan = useMemo(() => planFor(region), [region]);
  const configured = paymentsConfigured();

  function openCheckout() {
    trackLearner("unlock_checkout_started", {
      props: { country: region, priceId: plan.priceId },
    });
    setCheckoutOpen(true);
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-accent-orange/25 bg-card p-6 shadow-[0_40px_120px_-60px_rgba(11,19,43,0.45)] sm:p-9 ${
        compact ? "" : "mx-auto max-w-3xl"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 80% at 92% 0%, color-mix(in oklab, var(--accent-orange) 14%, transparent), transparent 70%)",
        }}
      />
      <span className="inline-flex items-center gap-2 rounded-full border border-accent-orange/30 bg-accent-orange/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-orange">
        <Lock className="h-3 w-3" aria-hidden />
        Locked section
      </span>

      <h2 className="mt-5 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.02em]">
        You’ve started the project. Now complete the work.
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        You have read the project brief, responded to your first stakeholder email and
        started the Project Charter. Unlock the full Atlas experience to complete the
        charter, manage the project and receive your final performance report and
        verifiable Atlas credential.
      </p>

      <div className="mt-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          What full access helps you achieve
        </div>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {ACHIEVE.map((i) => (
            <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed">
              <Check className="mt-1 h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          What full access includes
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {INCLUDES.map((i) => (
            <li
              key={i}
              className="rounded-full border border-border bg-background/70 px-3 py-1 text-[13px] text-foreground/85"
            >
              {i}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {REGIONS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              setRegion(c.key);
              setCheckoutOpen(false);
            }}
            className={[
              "rounded-full border px-4 py-2 text-sm transition-colors",
              region === c.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-end gap-3">
        <span className="font-display text-[clamp(2.2rem,5vw,3.2rem)] font-medium leading-none">
          {formatPlanPrice(plan)}
        </span>
        <span className="pb-2 text-sm text-muted-foreground">
          One-time payment. No subscription.
        </span>
      </div>

      {!checkoutOpen ? (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={openCheckout}
              disabled={!configured}
              className="group flex-1 gap-2 rounded-full bg-accent-orange text-accent-orange-foreground hover:bg-accent-orange/90"
            >
              Unlock and Complete the Project Charter
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            {onReturnToWorkspace ? (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                onClick={onReturnToWorkspace}
              >
                Return to Workspace
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/app">Return to Workspace</Link>
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {configured
              ? "Your project progress and everything you have already written are kept."
              : "Checkout is being switched on. Email hello@atlassim.co and we'll unlock your account today."}
          </p>
        </>
      ) : (
        <StripeEmbeddedCheckout
          priceId={plan.priceId}
          returnUrl={
            returnUrl ??
            `${window.location.origin}/app/charter?checkout=success&session_id={CHECKOUT_SESSION_ID}`
          }
        />
      )}
      {pricing?.checkoutNote && (
        <p className="mt-2 text-xs text-muted-foreground">{pricing.checkoutNote}</p>
      )}
    </section>
  );
}
