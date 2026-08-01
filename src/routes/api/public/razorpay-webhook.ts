import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const PAID_EVENTS = new Set(["payment_link.paid", "payment.captured", "order.paid"]);
const FAILED_EVENTS = new Set(["payment.failed", "payment_link.cancelled", "payment_link.expired"]);

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(raw) as any;
        const event: string = payload?.event ?? "";
        const reference: string | undefined =
          payload?.payload?.payment_link?.entity?.reference_id ??
          payload?.payload?.payment?.entity?.notes?.reference;
        if (!reference) return new Response("ok");

        const status = PAID_EVENTS.has(event)
          ? "paid"
          : FAILED_EVENTS.has(event)
            ? "failed"
            : null;
        if (!status) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("enrolments")
          .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
          .eq("provider_ref", reference);
        if (error) {
          console.error("razorpay webhook update failed", error);
          return new Response("Update failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});