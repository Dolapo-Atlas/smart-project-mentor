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
  type PlanInterval,
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

const INCLUDES = [
  "The full Digital Care Records project, initiation through closure",
  "Every deliverable template — charter, schedule, WBS, RAID, RACI, reports",
  "Live stakeholders, escalations and Steering Committee gates",
  "AI reviewer feedback on everything you submit",
  "Your full performance report",
  "Your verifiable Atlas credential on atlassim.co",
];

/**
 * Shown once the free preview is complete. Presentation + checkout only —
 * it does not touch simulation logic.
 */
export function UnlockScreen({ compact = false }: { compact?: boolean }) {
  const fetchPricing = useServerFn(getUnlockPricing);
  const [region, setRegion] = useState<PlanRegion>(() => guessRegion());
  const [interval, setInterval] = useState<PlanInterval>("monthly");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: pricing } = useQuery({
    queryKey: ["unlock-pricing"],
    queryFn: () => fetchPricing(),
  });

  const plan = useMemo(() => planFor(region, interval), [region, interval]);
  const monthly = PLANS[region].monthly;
  const configured = paymentsConfigured();

  function openCheckout() {
    trackLearner("unlock_checkout_started", {
      props: { country: region, interval, priceId: plan.priceId },
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
        Free preview complete
      </span>

      <h2 className="mt-5 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.02em]">
        You have just done real project work. Continue the full Digital Care Records
        experience.
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        You have met your stakeholders, closed your first task and seen the consequence of
        your decision. Unlocking takes you all the way through initiation, planning,
        execution and closure — with feedback at every gate and a credential at the end.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
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

      <div className="mt-4 inline-flex rounded-full border border-border bg-background/70 p-1">
        {(["monthly", "yearly"] as PlanInterval[]).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setInterval(i);
              setCheckoutOpen(false);
            }}
            className={[
              "rounded-full px-4 py-1.5 text-sm capitalize transition-colors",
              interval === i
                ? "bg-accent-orange text-accent-orange-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {i}
            {i === "yearly" && (
              <span className="ml-2 text-[11px] uppercase tracking-[0.14em] opacity-80">
                2 months free
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-end gap-3">
        <span className="font-display text-[clamp(2.2rem,5vw,3.2rem)] font-medium leading-none">
          {formatPlanPrice(plan)}
        </span>
        <span className="pb-2 text-sm text-muted-foreground">
          per {interval === "monthly" ? "month" : "year"}
          {interval === "yearly" && ` · ${formatPlanPrice(monthly)}/month billed monthly`}
        </span>
      </div>

      <ul className="mt-7 grid gap-3 sm:grid-cols-2">
        {INCLUDES.map((i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
            <Check className="mt-1 h-4 w-4 shrink-0 text-accent-orange" aria-hidden />
            <span>{i}</span>
          </li>
        ))}
      </ul>

      {!checkoutOpen ? (
        <>
          <Button
            size="lg"
            onClick={openCheckout}
            disabled={!configured}
            className="group mt-8 w-full gap-2 rounded-full bg-accent-orange text-accent-orange-foreground hover:bg-accent-orange/90"
          >
            Unlock the full experience
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {configured
              ? "Cancel any time · Your progress and preview work are kept · Complete at your own pace"
              : "Checkout is being switched on. Email hello@atlassim.co and we'll unlock your account today."}
          </p>
        </>
      ) : (
        <StripeEmbeddedCheckout
          priceId={plan.priceId}
          returnUrl={`${window.location.origin}/app/unlock?session_id={CHECKOUT_SESSION_ID}`}
        />
      )}
      {pricing?.checkoutNote && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{pricing.checkoutNote}</p>
      )}
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Not ready yet?{" "}
        <Link to="/app" className="underline underline-offset-4 hover:text-foreground">
          Look around your workspace
        </Link>{" "}
        — your preview work stays exactly where it is.
      </p>
    </section>
  );
}