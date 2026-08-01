/**
 * Server-only payment gateway helpers.
 *  - Nigeria (NGN) -> Paystack
 *  - India   (INR) -> Razorpay
 * Secrets are read inside each function (env is injected per request).
 */

export type Gateway = "paystack" | "razorpay";

export interface InitResult {
  ok: boolean;
  url?: string;
  reference?: string;
  error?: string;
}

export function gatewayConfigured(gateway: Gateway): boolean {
  if (gateway === "paystack") return Boolean(process.env["PAYSTACK_SECRET_KEY"]);
  return Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]);
}

export async function initPaystack(input: {
  email: string;
  amountMajor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitResult> {
  const key = process.env["PAYSTACK_SECRET_KEY"];
  if (!key) return { ok: false, error: "not_configured" };

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountMajor * 100), // kobo
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok || !body?.status) {
    console.error(`Paystack init failed [${res.status}]`, body);
    return { ok: false, error: body?.message ?? `paystack_${res.status}` };
  }
  return { ok: true, url: body.data.authorization_url as string, reference: input.reference };
}

export async function initRazorpay(input: {
  email: string;
  name?: string | null;
  amountMajor: number;
  reference: string;
  callbackUrl: string;
  notes: Record<string, string>;
}): Promise<InitResult> {
  const id = process.env["RAZORPAY_KEY_ID"];
  const secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!id || !secret) return { ok: false, error: "not_configured" };

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(input.amountMajor * 100), // paise
      currency: "INR",
      accept_partial: false,
      description: "Atlas Project Readiness Experience",
      reference_id: input.reference,
      customer: { email: input.email, name: input.name ?? undefined },
      notify: { email: true, sms: false },
      callback_url: input.callbackUrl,
      callback_method: "get",
      notes: input.notes,
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok || !body?.short_url) {
    console.error(`Razorpay init failed [${res.status}]`, body);
    return { ok: false, error: body?.error?.description ?? `razorpay_${res.status}` };
  }
  return { ok: true, url: body.short_url as string, reference: input.reference };
}