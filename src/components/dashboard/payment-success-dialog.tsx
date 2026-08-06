import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getMyAccess } from "@/lib/access.functions";
import { formatMinor } from "@/lib/money";

/**
 * Immediate post-checkout confirmation. Presentation only — it reads the
 * existing access state and never changes entitlement. It opens as soon as the
 * learner returns from the payment provider (`checkout=success` / `session_id`)
 * so nobody is left wondering whether the payment went through.
 */
export function PaymentSuccessDialog() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const search = useRouterState({ select: (s) => s.location.search }) as Record<string, unknown>;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const returning =
    search?.checkout === "success" || typeof search?.session_id === "string";

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (returning) setOpen(true);
  }, [returning]);

  const { data: access } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
    enabled: returning,
    refetchInterval: (q) => (q.state.data?.tier === "full" ? false : 3000),
  });

  const confirmed = access?.tier === "full";
  const paid =
    access?.purchase?.status === "paid"
      ? formatMinor(access.purchase.amount, access.purchase.currency)
      : null;

  // Once confirmed, refresh anything gated so the workspace opens up behind
  // the dialog.
  useEffect(() => {
    if (!confirmed) return;
    qc.invalidateQueries({ queryKey: ["access"] });
    qc.invalidateQueries({ queryKey: ["charter"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }, [confirmed, qc]);

  function dismiss() {
    setOpen(false);
    // Strip the provider's return params so the dialog doesn't reappear.
    navigate({ to: pathname, search: {}, replace: true }).catch(() => {});
  }

  if (!returning) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent-orange/15">
            {confirmed ? (
              <CheckCircle2 className="h-5 w-5 text-accent-orange" aria-hidden />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-accent-orange" aria-hidden />
            )}
          </div>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            {confirmed ? "Payment received." : "Confirming your payment…"}
          </DialogTitle>
          <DialogDescription>
            {confirmed
              ? "Your full Atlas experience is now unlocked — every phase, deliverable and gate, right through to your credential."
              : "This takes a few seconds. You can leave this open — it will update by itself."}
          </DialogDescription>
        </DialogHeader>

        {confirmed && paid && (
          <p className="text-sm text-muted-foreground">
            {paid} paid once. One-time payment — nothing renews automatically.
          </p>
        )}

        <Button size="lg" className="mt-2 w-full" disabled={!confirmed} onClick={dismiss}>
          {confirmed ? "Continue my project" : "Confirming…"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
