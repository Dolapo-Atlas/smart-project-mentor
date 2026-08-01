import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startCheckout, COUNTRY_META, type CountryKey } from "@/lib/landing.functions";
import { readCampaign, track } from "@/lib/landing-analytics";

const formSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
});

export function EnrolDialog({
  open,
  onOpenChange,
  country,
  price,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  country: CountryKey;
  price: string;
}) {
  const checkout = useServerFn(startCheckout);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = formSchema.safeParse({ fullName, email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    track("checkout_started", { country, price });
    try {
      const res = await checkout({
        data: {
          ...parsed.data,
          country,
          origin: window.location.origin,
          utm: readCampaign(),
        },
      });
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      const messages: Record<string, string> = {
        enrolment_closed: "Enrolment is paused right now. Join the waitlist and we'll email you when places reopen.",
        unsupported_country: "Local checkout isn't available for your region yet. Email hello@atlassim.co and we'll help.",
        gateway_not_configured:
          "Payments are being finalised for this market. Your details are saved — we'll email you the checkout link shortly.",
      };
      setError(messages[res.reason] ?? "We couldn't open checkout. Please try again in a moment.");
    } catch (err) {
      console.error(err);
      toast.error("Checkout failed to open. Please try again.");
      setError("Checkout failed to open. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">
            Enrol in the Atlas Project Readiness Experience
          </DialogTitle>
          <DialogDescription>
            {COUNTRY_META[country].label} pricing · {price} · secure payment
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enrol-name">Full name</Label>
            <Input
              id="enrol-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enrol-email">Email</Label>
            <Input
              id="enrol-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use the email you want on your Atlas account and credential.
            </p>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue to secure payment
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Secure payment · Immediate access · Complete at your own pace
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}