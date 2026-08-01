import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(raw) as any;
        const reference: string | undefined = payload?.data?.reference;
        if (!reference) return new Response("ok");

        const status =
          payload.event === "charge.success"
            ? "paid"
            : payload.event === "charge.failed"
              ? "failed"
              : null;
        if (!status) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("enrolments")
          .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
          .eq("provider_ref", reference);
        if (error) {
          console.error("paystack webhook update failed", error);
          return new Response("Update failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});