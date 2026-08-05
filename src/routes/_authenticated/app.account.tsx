import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  Loader2,
  LockKeyhole,
  Mail,
  ReceiptText,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyAccess, deleteMyAccount } from "@/lib/access.functions";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_authenticated/app/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Your Atlas account and purchase | Atlas" },
      {
        name: "description",
        content:
          "See your Atlas access status, your programme purchase and receipt, update your sign-in email or close your account.",
      },
      { property: "og:title", content: "Your Atlas account and purchase" },
      {
        property: "og:description",
        content: "Access status, receipts and account controls for your Atlas workplace experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function money(amount: number, currency: string): string {
  // Provider amounts are in minor units.
  const value = amount / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AccountPage() {
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getMyAccess);
  const openPortal = useServerFn(createPortalSession);
  const removeAccount = useServerFn(deleteMyAccount);

  const { data: access, isLoading } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
  });

  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function changeEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your new inbox — we've sent a confirmation link.");
    setNewEmail("");
  }

  async function openReceipts() {
    if (!paymentsConfigured()) {
      toast.error("Receipts aren't available in this build yet.");
      return;
    }
    setPortalLoading(true);
    try {
      const res = await openPortal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/app/account`,
        },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open your receipts.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function deleteAccount() {
    if (confirmDelete !== "DELETE") return;
    setDeleting(true);
    try {
      await removeAccount({ data: {} } as never);
      await supabase.auth.signOut();
      toast.success("Your account and all its data have been deleted.");
      void navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete your account.");
    } finally {
      setDeleting(false);
    }
  }

  const purchase = access?.purchase ?? null;
  const paid = access?.tier === "full";

  return (
    <div className="space-y-6">
      <PaymentTestModeBanner />

      <header>
        <h1 className="font-display text-3xl font-medium tracking-tight">Your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access, payment and sign-in details for your Atlas workplace experience.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            document
              .getElementById("close-account")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete my account
        </Button>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your account…
        </div>
      ) : (
        <>
          {/* Access */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              {paid ? (
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium">
                  {paid ? "Full experience unlocked" : "Free preview"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paid
                    ? `Every phase, template, Steering Committee gate and your credential are open.${
                        access?.unlockedAt ? ` Unlocked ${when(access.unlockedAt)}.` : ""
                      }`
                    : "You can read the brief, answer your first stakeholder email and start the Charter. Unlock to carry the project through to closure and earn your credential."}
                </p>
                {paid && access?.accessSource === "grandfathered" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Included as an early Atlas account — no payment needed.
                  </p>
                ) : null}
                {!paid ? (
                  <Button size="sm" className="mt-4" asChild>
                    <Link to="/app/unlock">Unlock the full experience</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          {/* Purchase */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium">Purchase</h2>
                {purchase ? (
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Amount</dt>
                      <dd className="font-medium">{money(purchase.amount, purchase.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Paid</dt>
                      <dd className="font-medium">{when(purchase.paidAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="font-medium capitalize">{purchase.status}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="font-medium">One-time purchase — no renewal</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No payment on this account yet.
                  </p>
                )}

                {purchase?.refundedAt ? (
                  <p className="mt-3 text-sm text-amber-600">
                    Refunded {when(purchase.refundedAt)}.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-border"
                    onClick={openReceipts}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    View receipts
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="mailto:support@atlassim.co?subject=Atlas%20refund%20request">
                      <Mail className="mr-2 h-4 w-4" />
                      Request a refund
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Sign-in email */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-medium">Sign-in email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Currently {email || "—"}. We'll email a confirmation link to the new address before
              anything changes.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="new-email" className="text-xs">
                  New email
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button onClick={changeEmail} disabled={savingEmail || !newEmail.trim()}>
                {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update email
              </Button>
            </div>
          </section>

          {/* Danger zone */}
          <section
            id="close-account"
            className="scroll-mt-24 rounded-xl border border-destructive/30 bg-destructive/5 p-5"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium">Close your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This permanently deletes your account, your project, your documents and your
                  credential. It can't be undone, and it doesn't issue a refund — email support for
                  that first. Type <span className="font-mono font-medium">DELETE</span> to confirm.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    placeholder="DELETE"
                    className="sm:max-w-[180px]"
                    aria-label="Type DELETE to confirm"
                  />
                  <Button
                    variant="destructive"
                    onClick={deleteAccount}
                    disabled={deleting || confirmDelete !== "DELETE"}
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete my account
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
