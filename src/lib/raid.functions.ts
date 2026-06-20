import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Kind = z.enum(["risk", "assumption", "issue", "dependency"]);
const Sev = z.enum(["low", "medium", "high", "critical"]);
const Status = z.enum(["open", "mitigating", "closed"]);
const Rag = z.enum(["green", "amber", "red"]);
const Area = z.enum([
  "scope", "schedule", "budget", "quality", "resources", "stakeholders", "risks",
]);

type RaidRow = {
  id: string;
  kind: "risk" | "assumption" | "issue" | "dependency";
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  likelihood: "low" | "medium" | "high" | "critical";
  status: "open" | "mitigating" | "closed";
  owner: string | null;
  mitigation: string | null;
};

function isVendorRelated(text: string): boolean {
  return /\b(caresoft|vendor|supplier|third[- ]party)\b/i.test(text);
}
function isScheduleRelated(text: string): boolean {
  return /\b(schedule|timeline|deadline|milestone|delay|slip)\b/i.test(text);
}
function isClinicalRelated(text: string): boolean {
  return /\b(clinical|clinician|nurse|care staff|adoption|governance|safety)\b/i.test(text);
}

function buildStakeholderReaction(item: RaidRow, firstName: string) {
  const blob = `${item.title}\n${item.description ?? ""}`;
  const isHigh = ["high", "critical"].includes(item.severity) ||
    ["high", "critical"].includes(item.likelihood);

  // Vendor dependency
  if (item.kind === "dependency" && isVendorRelated(blob)) {
    return {
      sender_name: "CareSoft Ltd",
      sender_role: "Vendor — Digital Care Records Platform",
      subject: `Re: ${item.title}`,
      tone: "neutral" as const,
      body:
`Hi ${firstName},

We note the dependency logged against CareSoft configuration. Our team can provide an updated milestone position, but we will need final data migration requirements from Northbridge before confirming dates.

Please share the agreed scope and migration cut-off so we can align our delivery plan.

Regards,
CareSoft Ltd`,
    };
  }

  // Schedule risk
  if (item.kind === "risk" && isScheduleRelated(blob)) {
    return {
      sender_name: "Sarah Williams",
      sender_role: "Project Manager, Northbridge Health Services",
      subject: `Re: ${item.title}`,
      tone: "neutral" as const,
      body:
`Hi ${firstName},

Thanks for logging this. Please make sure the risk is reflected in the RAG status and included in the next status report. I'd like to see the owner, mitigation and the trigger that would cause us to escalate.

Thanks,
Sarah`,
    };
  }

  // Clinical adoption / governance risk
  if (item.kind === "risk" && (isClinicalRelated(blob) || isHigh)) {
    return {
      sender_name: "Rachel Stone",
      sender_role: "Clinical Governance Lead",
      subject: `Re: ${item.title}`,
      tone: "supportive" as const,
      body:
`Hi ${firstName},

Thanks for logging this risk. I agree this needs active management. Please confirm the owner, mitigation actions, and escalation trigger before the next governance review.

If safety or clinical readiness is in scope, route the mitigation through me before it goes to the sponsor.

Regards,
Rachel Stone
Clinical Governance Lead`,
    };
  }

  // Issue (always reacts)
  if (item.kind === "issue") {
    return {
      sender_name: "Sarah Williams",
      sender_role: "Project Manager, Northbridge Health Services",
      subject: `Re: ${item.title}`,
      tone: "urgent" as const,
      body:
`Hi ${firstName},

Logged. Treat this as live — I want an owner and a same-week action assigned. If it is going to slip into next reporting cycle, flag it so I can brief David before he hears it elsewhere.

Thanks,
Sarah`,
    };
  }

  // Generic high-sev fallback
  if (isHigh) {
    return {
      sender_name: "Sarah Williams",
      sender_role: "Project Manager, Northbridge Health Services",
      subject: `Re: ${item.title}`,
      tone: "neutral" as const,
      body:
`Hi ${firstName},

Thanks for logging this. Given the severity/likelihood, please confirm the owner, mitigation and the escalation trigger so we can reflect it in the next status report.

Thanks,
Sarah`,
    };
  }
  return null;
}

async function recomputeRiskRag(supabase: any, userId: string) {
  const { data: items } = await supabase
    .from("raid_items")
    .select("kind,severity,status")
    .eq("user_id", userId);
  const openRisks = (items ?? []).filter(
    (r: any) => r.kind === "risk" && r.status !== "closed",
  );
  const highOpen = openRisks.filter((r: any) =>
    ["high", "critical"].includes(r.severity),
  );
  let rag: "green" | "amber" | "red" = "green";
  if (highOpen.length >= 3) rag = "red";
  else if (openRisks.length >= 2) rag = "amber";
  await supabase
    .from("workstream_rag")
    .upsert(
      { user_id: userId, area: "risks", rag, note: `${openRisks.length} open risk(s), ${highOpen.length} high severity` },
      { onConflict: "user_id,area" },
    );
}

async function maybeAutoSubmitRaidTask(supabase: any, userId: string) {
  const { data: items } = await supabase
    .from("raid_items")
    .select("kind")
    .eq("user_id", userId);
  const kinds = new Set((items ?? []).map((i: any) => i.kind));
  if (!(kinds.has("risk") && kinds.has("assumption") && kinds.has("dependency"))) return false;
  const { data: task } = await supabase
    .from("tasks")
    .select("id,status,title")
    .eq("user_id", userId)
    .ilike("title", "%RAID Log%")
    .maybeSingle();
  if (!task) return false;
  if (task.status === "submitted" || task.status === "done") return false;
  await supabase.from("tasks").update({ status: "in_progress" }).eq("id", task.id);
  return true;
}

export const listRaid = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("raid_items")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: Kind,
      title: z.string().min(1),
      description: z.string().optional(),
      severity: Sev.default("medium"),
      likelihood: Sev.default("medium"),
      owner: z.string().optional(),
      due_date: z.string().optional(),
      mitigation: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("raid_items")
      .insert({ user_id: context.userId, ...data })
      .select()
      .single();
    if (error) throw error;

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("first_name,preferred_name")
      .eq("id", context.userId)
      .maybeSingle();
    const firstName = profile?.preferred_name?.trim() || profile?.first_name || "there";

    const reaction = buildStakeholderReaction(row as RaidRow, firstName);
    let emailed = false;
    if (reaction) {
      await context.supabase.from("inbox_messages").insert({
        user_id: context.userId,
        ...reaction,
      });
      emailed = true;
    }

    await recomputeRiskRag(context.supabase, context.userId);
    await maybeAutoSubmitRaidTask(context.supabase, context.userId);

    return row;
  });

export const updateRaidStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: Status }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("raid_items")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    await recomputeRiskRag(context.supabase, context.userId);
    return { ok: true };
  });

export const deleteRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("raid_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    await recomputeRiskRag(context.supabase, context.userId);
    return { ok: true };
  });

export const submitRaidLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: items } = await supabase
      .from("raid_items")
      .select("id")
      .eq("user_id", userId);
    if ((items ?? []).length < 3) {
      throw new Error("Add at least 3 RAID entries before submitting.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name,preferred_name")
      .eq("id", userId)
      .maybeSingle();
    const firstName = profile?.preferred_name?.trim() || profile?.first_name || "there";

    const { data: task } = await supabase
      .from("tasks")
      .select("id,status")
      .eq("user_id", userId)
      .ilike("title", "%RAID Log%")
      .maybeSingle();
    if (task && task.status !== "done") {
      await supabase.from("tasks").update({ status: "submitted" }).eq("id", task.id);
    }

    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: "Sarah Williams",
      sender_role: "Project Manager, Northbridge Health Services",
      subject: "Initial RAID Log Review",
      tone: "supportive",
      body:
`Hi ${firstName},

Thanks for building the initial RAID log.

I can see you have captured early risks, assumptions and dependencies. Please make sure each item has a clear owner, mitigation action and escalation trigger before governance review.

Regards,
Sarah`,
    });

    const { data: s } = await supabase
      .from("simulation_state")
      .select("progress")
      .eq("user_id", userId)
      .maybeSingle();
    await supabase
      .from("simulation_state")
      .update({
        progress: Math.min(100, (s?.progress ?? 0) + 4),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return { ok: true };
  });

export const listRag = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workstream_rag")
      .select("*")
      .eq("user_id", context.userId);
    if (error) throw error;
    return data ?? [];
  });

export const upsertRag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ area: Area, rag: Rag, note: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workstream_rag")
      .upsert(
        { user_id: context.userId, ...data },
        { onConflict: "user_id,area" },
      )
      .select()
      .single();
    if (error) throw error;
    return row;
  });