import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, Mail, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getEnrolmentStatus, claimEnrolment } from "@/lib/landing.functions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { initTrackers, track } from "@/lib/landing-analytics";

export const Route = createFileRoute("/enrol/success")({
  ssr: false,
  validateSearch: (s) => z.object({ ref: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Your first assignment is ready | Atlas" },
      {
        name: "description",
        content:
          "Your Atlas Project Readiness Experience is confirmed. Open your first workplace assignment as Project Coordinator.",
      },
      { property: "og:title", content: "Your first assignment is ready | Atlas" },
      {
        property: "og:description",
        content: "Start your first day as Project Coordinator inside Atlas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnrolSuccess,
});

function EnrolSuccess() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getEnrolmentStatus);
  const claim = useServerFn(claimEnrolment);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    initTrackers();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  const statusQuery = useQuery({
    queryKey: ["enrolment-status", ref],
    queryFn: () => fetchStatus({ data: { reference: ref! } }),
    enabled: Boolean(ref),
    refetchInterval: (q) =>
      q.state.data && "status" in q.state.data && q.state.data.status === "pending" ? 4000 : false,
  });

  const data = statusQuery.data;
  const paid = Boolean(data?.found && data.status === "paid");

  useEffect(() => {
    if (!paid || !data?.found) return;
    track("purchase_completed", { reference: ref, amount: data.amount, currency: data.currency });
    if (!signedIn) return;
    (async () => {
      await claim({ data: { reference: ref! } }).catch(() => null);
      const { data: session } = await supabase.auth.getUser();
      const email = session.user?.email;
      if (email) {
        await sendTransactionalEmail({
          templateName: "enrolment-confirmation",
          recipientEmail: email,
          idempotencyKey: `enrolment-confirmation-${ref}`,
          templateData: {
            name: data.firstName ?? undefined,
            amount: `${data.currency} ${data.amount.toLocaleString()}`,
            reference: ref,
          },
        }).catch(() => null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, signedIn]);

  if (!ref) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          We couldn't find a payment reference. If you have just paid, check your email for the
          confirmation link.
        </p>
        <Button asChild className="mt-6">
          <Link to="/project-readiness">Back to enrolment</Link>
        </Button>
      </Shell>
    );
  }

  if (statusQuery.isLoading || !data) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment…
        </div>
      </Shell>
    );
  }

  if (!data.found) {
    return (
      <Shell>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <p className="text-sm text-muted-foreground">
            We can't find that enrolment reference. If you were charged, email hello@atlassim.co with
            reference {ref} and we'll sort it out.
          </p>
        </div>
      </Shell>
    );
  }

  if (data.status === "pending") {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-medium">Payment is being confirmed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page updates automatically. Bank transfers can take a minute or two. Keep this tab
          open — reference {ref}.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Waiting for your payment provider…
        </div>
      </Shell>
    );
  }

  if (data.status !== "paid") {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-medium">Payment didn't complete</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your payment was cancelled or declined, so you have not been charged for access. You can
          try again — reference {ref}.
        </p>
        <Button asChild className="mt-6">
          <Link to="/project-readiness">Try again</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">Payment confirmed</span>
      </div>
      <h1 className="mt-4 font-display text-3xl font-medium">Your first assignment is ready</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Welcome to your first day as Project Coordinator on the Digital Care Records Rollout.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent-orange" />
          <div className="min-w-0">
            <p className="font-medium">Task 1: Read and respond to the stakeholder email</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your Programme Manager has sent you an email that requires a response. Read it,
              understand what is being asked and reply. This takes under five minutes.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-destructive">
              Needed today
            </p>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-muted">
          <div className="h-2 w-[8%] rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Step 1 of your first day</p>

        {signedIn === false ? (
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => {
              track("account_created", { reference: ref });
              navigate({ to: "/auth" });
            }}
          >
            Create your Atlas account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => {
              track("first_task_started", { reference: ref });
              navigate({ to: "/app/inbox" });
            }}
          >
            Open Email
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Once you respond, Atlas shows how your decision affected the project. Atlas provides
        simulated workplace experience and does not represent employment.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 py-16">{children}</div>
    </div>
  );
}