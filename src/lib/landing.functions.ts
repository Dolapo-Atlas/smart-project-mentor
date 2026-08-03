import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS } from "@/lib/plans";

export type CountryKey = "nigeria" | "india" | "international";

export const COUNTRY_META: Record<CountryKey, { label: string; currency: string; symbol: string; gateway: "paystack" | "razorpay" | null }> = {
  nigeria: { label: "Nigeria", currency: "NGN", symbol: "₦", gateway: "paystack" },
  india: { label: "India", currency: "INR", symbol: "₹", gateway: "razorpay" },
  international: {
    label: "United Kingdom & other markets",
    currency: "GBP",
    symbol: "£",
    gateway: null,
  },
};

/** Public offer payload for the sales page: prices, places left, campaign flags. */
export const getPublicOffer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [settingsRes, paidRes] = await Promise.all([
    supabaseAdmin.from("landing_settings").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("enrolments").select("country").eq("status", "paid"),
  ]);

  const s = settingsRes.data;
  const taken: Record<string, number> = {};
  for (const row of (paidRes.data ?? []) as Array<{ country: string }>) {
    taken[row.country] = (taken[row.country] ?? 0) + 1;
  }

  return {
    prices: {
      // Fall back to the canonical plan prices so a missing settings row can
      // never resurface an old price.
      nigeria: s?.price_ngn ?? PLANS.nigeria.oneTime.amount,
      india: s?.price_inr ?? PLANS.india.oneTime.amount,
      international: s?.price_usd ?? PLANS.international.oneTime.amount,
    },
    foundingPlaces: s?.founding_places ?? 50,
    placesTaken: {
      nigeria: taken["nigeria"] ?? 0,
      india: taken["india"] ?? 0,
      international: taken["international"] ?? 0,
    },
    heroVariant: (s?.hero_variant ?? "interview") as string,
    videoUrl: (s?.video_url ?? null) as string | null,
    enrolmentOpen: s?.enrolment_open ?? true,
    checkoutNote: (s?.checkout_note ?? null) as string | null,
  };
});

const checkoutSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(1).max(120),
  country: z.enum(["nigeria", "india", "international"]),
  origin: z.string().url().max(300),
  utm: z.record(z.string(), z.string().max(200)).default({}),
});

/**
 * Creates a pending enrolment and opens a gateway checkout for the visitor's
 * local currency. Returns `{ ok: false, reason }` instead of throwing so the
 * page can show a clear error state.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("landing_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (settings && settings.enrolment_open === false) {
      return { ok: false as const, reason: "enrolment_closed" };
    }

    const meta = COUNTRY_META[data.country];

    const amount =
      data.country === "nigeria"
        ? (settings?.price_ngn ?? PLANS.nigeria.oneTime.amount)
        : (settings?.price_inr ?? PLANS.india.oneTime.amount);

    const reference = `ATLAS-${data.country.slice(0, 2).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

    const { error: insertError } = await supabaseAdmin.from("enrolments").insert({
      email: data.email,
      full_name: data.fullName,
      country: data.country,
      currency: meta.currency,
      amount,
      provider: "stripe",
      provider_ref: reference,
      status: "lead",
      utm: data.utm,
    });
    if (insertError) {
      console.error("enrolment insert failed", insertError);
      return { ok: false as const, reason: "enrolment_failed" };
    }

    // Atlas now sells inside the product: visitors sign up free, complete the
    // first task, then subscribe from the unlock screen. This records the lead
    // and sends them to sign-up rather than a pre-signup payment page.
    const signupUrl = `${data.origin.replace(/\/$/, "")}/auth?ref=${reference}`;
    return { ok: true as const, url: signupUrl, reference, amount, currency: meta.currency };
  });

/** Status lookup used by the post-payment page. Only exposes non-sensitive fields. */
export const getEnrolmentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ reference: z.string().trim().min(6).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("enrolments")
      .select("status, currency, amount, country, full_name")
      .eq("provider_ref", data.reference)
      .maybeSingle();
    if (!row) return { found: false as const };
    return {
      found: true as const,
      status: row.status as string,
      currency: row.currency as string,
      amount: row.amount as number,
      country: row.country as string,
      firstName: ((row.full_name as string | null) ?? "").trim().split(/\s+/)[0] ?? null,
    };
  });

/** Links a paid enrolment to the signed-in Atlas account. */
export const claimEnrolment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reference: z.string().trim().min(6).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("enrolments")
      .select("id, status, user_id")
      .eq("provider_ref", data.reference)
      .maybeSingle();
    if (!row) return { ok: false as const, reason: "not_found" };
    if (row.status !== "paid") return { ok: false as const, reason: "not_paid" };
    if (row.user_id && row.user_id !== context.userId) {
      return { ok: false as const, reason: "already_claimed" };
    }
    await supabaseAdmin.from("enrolments").update({ user_id: context.userId }).eq("id", row.id);
    // A paid enrolment also grants full in-app access.
    await supabaseAdmin
      .from("profiles")
      .update({
        access_tier: "full",
        access_source: "purchase",
        unlocked_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    return { ok: true as const };
  });

/* ---------------------------- admin controls ---------------------------- */

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

export const getLandingAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [settingsRes, enrolmentsRes, profilesRes, instancesRes, tasksRes, certsRes] =
      await Promise.all([
        supabaseAdmin.from("landing_settings").select("*").eq("id", 1).maybeSingle(),
        supabaseAdmin
          .from("enrolments")
          .select("id, email, full_name, country, currency, amount, provider, status, utm, paid_at, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("project_instances").select("id, status", { count: "exact" }),
        supabaseAdmin.from("tasks").select("user_id, status").eq("status", "done"),
        supabaseAdmin.from("certificates").select("id", { count: "exact", head: true }),
      ]);

    const enrolments = (enrolmentsRes.data ?? []) as any[];
    const started = enrolments.length;
    const paid = enrolments.filter((e) => e.status === "paid").length;
    const accounts = profilesRes.count ?? 0;
    const firstTaskDone = new Set((tasksRes.data ?? []).map((t: any) => t.user_id)).size;
    const completed = (instancesRes.data ?? []).filter((i: any) => i.status === "completed").length;

    return {
      settings: settingsRes.data,
      enrolments,
      funnel: [
        { label: "Checkout started", value: started },
        { label: "Purchase completed", value: paid },
        { label: "Atlas account created", value: accounts },
        { label: "First task completed", value: firstTaskDone },
        { label: "Programme completed", value: completed },
        { label: "Credential generated", value: certsRes.count ?? 0 },
      ],
    };
  });

const settingsSchema = z.object({
  price_ngn: z.number().int().min(0).max(100_000_000),
  price_inr: z.number().int().min(0).max(100_000_000),
  price_usd: z.number().int().min(0).max(100_000),
  founding_places: z.number().int().min(0).max(100_000),
  hero_variant: z.enum(["interview", "confidence", "credential"]),
  video_url: z.string().trim().max(500).nullable(),
  enrolment_open: z.boolean(),
  checkout_note: z.string().trim().max(400).nullable(),
});

export const updateLandingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("landing_settings").update(data).eq("id", 1);
    if (error) throw error;
    return { ok: true as const };
  });