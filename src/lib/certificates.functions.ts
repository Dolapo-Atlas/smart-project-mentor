import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Eligibility + preview data for the signed-in learner (no write). */
export const getCertificateStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { buildCertificatePayload } = await import("@/lib/certificate-data.server");
    const { qrDataUrl, verificationUrl } = await import("@/lib/certificates.server");

    const { data: existing } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("certificate_status", "valid")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        issued: true as const,
        certificate: existing,
        qrCodeUrl: await qrDataUrl(existing.verification_code),
        verificationUrl: verificationUrl(existing.verification_code),
        eligible: true,
        reason: undefined as string | undefined,
        preview: null as any,
      };
    }

    const payload = await buildCertificatePayload(supabase, userId);
    return {
      issued: false as const,
      certificate: null as any,
      qrCodeUrl: null as string | null,
      verificationUrl: null as string | null,
      eligible: payload.eligible,
      reason: payload.reason,
      preview: payload,
    };
  });

/** Issues the credential server-side. Idempotent: one valid cert per run. */
export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { buildCertificatePayload } = await import("@/lib/certificate-data.server");
    const { generateVerificationCode, qrDataUrl, verificationUrl } = await import(
      "@/lib/certificates.server"
    );

    const payload = await buildCertificatePayload(supabase, userId);
    if (!payload.eligible) {
      throw new Error(payload.reason ?? "Not eligible for a certificate yet.");
    }

    const { data: existing } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("project_instance_id", payload.projectInstanceId!)
      .eq("certificate_status", "valid")
      .maybeSingle();

    if (existing) {
      return {
        certificate: existing,
        qrCodeUrl: await qrDataUrl(existing.verification_code),
        verificationUrl: verificationUrl(existing.verification_code),
      };
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = generateVerificationCode();
      const { data, error } = await supabase
        .from("certificates")
        .insert({
          user_id: userId,
          project_instance_id: payload.projectInstanceId,
          outcome_id: payload.outcomeId,
          recipient_name: payload.recipientName,
          simulated_role: payload.simulatedRole,
          programme_name: payload.programmeName,
          project_name: payload.projectName,
          simulated_budget: payload.simulatedBudget,
          simulated_timeline: payload.simulatedTimeline,
          completion_date: payload.completionDate,
          overall_score: payload.overallScore,
          grade: payload.grade,
          performance_breakdown: payload.performanceBreakdown,
          competencies: payload.competencies,
          strengths: payload.strengths,
          development_areas: payload.developmentAreas,
          verification_code: code,
        })
        .select("*")
        .single();
      if (!error && data) {
        return {
          certificate: data,
          qrCodeUrl: await qrDataUrl(data.verification_code),
          verificationUrl: verificationUrl(data.verification_code),
        };
      }
      lastError = error;
      // Unique violation on the per-run index means a parallel request won.
      if ((error as any)?.code === "23505") {
        const { data: raced } = await supabase
          .from("certificates")
          .select("*")
          .eq("user_id", userId)
          .eq("project_instance_id", payload.projectInstanceId!)
          .eq("certificate_status", "valid")
          .maybeSingle();
        if (raced) {
          return {
            certificate: raced,
            qrCodeUrl: await qrDataUrl(raced.verification_code),
            verificationUrl: verificationUrl(raced.verification_code),
          };
        }
      }
    }
    console.error("certificate issue failed", lastError);
    throw new Error(
      "We could not generate your certificate right now. Your completion record is safe. Please try again.",
    );
  });

/** One controlled name correction: supersedes the old credential, issues a new one. */
export const correctCertificateName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ recipientName: z.string().trim().min(2).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generateVerificationCode, qrDataUrl, verificationUrl } = await import(
      "@/lib/certificates.server"
    );

    const { data: current } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("certificate_status", "valid")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!current) throw new Error("No certificate to correct yet.");

    const { count } = await supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("project_instance_id", current.project_instance_id as string);
    if ((count ?? 1) > 1) {
      throw new Error("A name correction has already been used for this credential.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = generateVerificationCode();
    const { data: reissued, error } = await supabaseAdmin
      .from("certificates")
      .insert({
        ...current,
        id: undefined,
        recipient_name: data.recipientName,
        verification_code: code,
        certificate_status: "valid",
        issued_at: new Date().toISOString(),
        created_at: undefined,
        updated_at: undefined,
        superseded_by: null,
      })
      .select("*")
      .single();
    if (error) throw error;

    await supabaseAdmin
      .from("certificates")
      .update({ certificate_status: "superseded", superseded_by: reissued.id })
      .eq("id", current.id);

    return {
      certificate: reissued,
      qrCodeUrl: await qrDataUrl(code),
      verificationUrl: verificationUrl(code),
    };
  });

/** Public credential lookup used by the verification page, certificate and report. */
export const getPublicCredential = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ code: z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9-]+$/) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { qrDataUrl, verificationUrl } = await import("@/lib/certificates.server");

    const { data: row, error } = await supabaseAdmin
      .from("certificates")
      .select(
        "id, recipient_name, simulated_role, programme_name, project_name, simulated_budget, simulated_timeline, completion_date, issued_at, overall_score, grade, performance_breakdown, competencies, strengths, development_areas, verification_code, certificate_status, superseded_by",
      )
      .eq("verification_code", data.code.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!row) return { found: false as const };

    let supersededByCode: string | null = null;
    if (row.superseded_by) {
      const { data: next } = await supabaseAdmin
        .from("certificates")
        .select("verification_code")
        .eq("id", row.superseded_by)
        .maybeSingle();
      supersededByCode = next?.verification_code ?? null;
    }

    return {
      found: true as const,
      certificate: { ...row, superseded_by: undefined },
      supersededByCode,
      qrCodeUrl: await qrDataUrl(row.verification_code),
      verificationUrl: verificationUrl(row.verification_code),
    };
  });