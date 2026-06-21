import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { applyCompetencyStatus } from "./learning.functions";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

export const STAKEHOLDERS: { role: string; name: string; title: string }[] = [
  { role: "pm", name: "Sarah Williams", title: "Project Manager" },
  { role: "sponsor", name: "David Okafor", title: "Executive Sponsor" },
  { role: "finance", name: "Priya Anand", title: "Finance Lead" },
  { role: "tech", name: "James Lin", title: "Technical Lead" },
  { role: "vendor", name: "CareSoft Ltd", title: "Vendor — Implementation" },
  { role: "care_home", name: "Margaret Hollis", title: "Care Home Manager, Oakwood" },
  { role: "clinical", name: "Rachel Stone", title: "Clinical Governance Lead" },
];

const MsgType = z.enum(["Update", "Escalation", "Request", "FYI"]);
const AttachKind = z.enum(["document", "status_report", "raid", "change_request", "budget", "gate", "none"]);

export const listComms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("comms_messages")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listAttachables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [docs, reports, raid, changes, gates] = await Promise.all([
      context.supabase.from("documents").select("id,title,status").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("status_reports").select("id,week_start,rag_summary").eq("user_id", uid).order("week_start", { ascending: false }).limit(10),
      context.supabase.from("raid_items").select("id,title,kind,severity").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("change_requests").select("id,title,status").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("phase_gates").select("id,phase,status").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      documents: docs.data ?? [],
      status_reports: reports.data ?? [],
      raid_items: raid.data ?? [],
      change_requests: changes.data ?? [],
      phase_gates: gates.data ?? [],
    };
  });

const ReplySchema = z.object({
  sender_role: z.string(),
  subject: z.string(),
  body: z.string(),
  sentiment: z.enum(["positive", "neutral", "pushback", "concerned", "ignored"]),
});

function fallbackReply(
  stakeholder: { role: string; name: string; title: string },
  subject: string,
  attachmentLabel?: string,
): z.infer<typeof ReplySchema> {
  const topic = attachmentLabel ? ` and the attached ${attachmentLabel}` : "";
  const bodyByRole: Record<string, string> = {
    pm: `I have reviewed your note${topic}. Please convert the key points into dated actions, then show me which items need sponsor or governance input before Friday.\n\nThanks,\nSarah`,
    clinical: `I have picked this up${topic}. Before clinical governance can support it, I need the safety impact, approval route, and escalation triggers made explicit.\n\nRachel Stone`,
    sponsor: `I have seen your update${topic}. What I need next is a concise decision-ready view: options, risk, cost, recommendation, and the consequence of waiting.\n\nDavid Okafor`,
    finance: `I have reviewed the update${topic}. Please send the cost implication, forecast movement, and any approval required before this is treated as agreed.\n\nPriya Anand`,
    tech: `I have checked this from the technical side${topic}. The next version needs to call out migration, downtime, integration ownership, and acceptance criteria.\n\nJames Lin`,
    vendor: `We have reviewed the request${topic}. Please confirm whether this is within the agreed scope or should be handled as a formal change request.\n\nCareSoft Ltd`,
    care_home: `I have read the update${topic}. Please make sure the plan reflects staff availability on the floor, training time, and what happens if the home is not ready.\n\nMargaret Hollis`,
  };
  return {
    sender_role: stakeholder.title,
    subject: `Re: ${subject}`,
    body: bodyByRole[stakeholder.role] ?? `I have reviewed your note${topic}. Please send the next actions and owner list when ready.\n\n${stakeholder.name}`,
    sentiment: ["clinical", "finance", "care_home"].includes(stakeholder.role) ? "concerned" : "neutral",
  };
}

function isPlaceholderReply(body: string): boolean {
  const cleaned = body.trim().toLowerCase();
  return cleaned.startsWith("thanks for the note") || cleaned.includes("come back to you shortly");
}

export const sendComm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      to_roles: z.array(z.string()).min(1),
      msg_type: MsgType,
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(5000),
      attachment_kind: AttachKind.optional(),
      attachment_ref: z.string().optional(),
      attachment_label: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const uid = context.userId;
    const threadId = crypto.randomUUID();

    const { error: insErr } = await supabase.from("comms_messages").insert({
      user_id: uid,
      thread_id: threadId,
      direction: "outbound",
      from_role: "coordinator",
      to_roles: data.to_roles,
      msg_type: data.msg_type,
      subject: data.subject,
      body: data.body,
      attachment_kind: data.attachment_kind && data.attachment_kind !== "none" ? data.attachment_kind : null,
      attachment_ref: data.attachment_ref ?? null,
      attachment_label: data.attachment_label ?? null,
    });
    if (insErr) throw insErr;

    const { data: state } = await supabase
      .from("simulation_state")
      .select("project_name,phase,health,reputation,progress")
      .eq("user_id", uid)
      .maybeSingle();

    const stakeholders = STAKEHOLDERS.filter((s) => data.to_roles.includes(s.role));
    const { data: recentReplies } = await supabase
      .from("inbox_messages")
      .select("sender_name,subject,body")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(8);

    for (const sh of stakeholders) {
      const prompt = `You are simulating "${sh.name}, ${sh.title}" on the "${state?.project_name ?? "Digital Care Records Rollout"}" project.
Project state: phase=${state?.phase}, health=${state?.health}, reputation=${state?.reputation}/100, progress=${state?.progress}/100.

The project coordinator just sent you this ${data.msg_type.toLowerCase()} email:
Subject: ${data.subject}
Body:
${data.body}
${data.attachment_label ? `Attached: ${data.attachment_kind} — ${data.attachment_label}` : "No attachment."}
Recent inbox replies to avoid repeating: ${JSON.stringify(recentReplies ?? [])}

Write a realistic reply FROM ${sh.name} (${sh.title}) to the coordinator. Stay in character:
- Finance pushes back on cost/value, asks for forecasts.
- Sponsor is busy, expects clarity, can be impatient.
- Vendor deflects blame, references contract.
- Care home manager talks about staff/floor reality.
- Clinical lead worries about patient safety & governance.
- PM checks process, RAID, deadlines.
- Tech lead talks integrations, data migration, downtime.

About 40% of the time the reply should DISAGREE, push back, ask hard questions, or escalate. Don't make everyone helpful.
2-4 short paragraphs. Sign off with name & role. Do not use generic placeholder wording like "Thanks for the note — I'll come back to you shortly".
Choose sentiment honestly: positive, neutral, pushback, concerned, or ignored (if ignored, body is a short auto-reply / out of office).`;

      let out: z.infer<typeof ReplySchema>;
      try {
        const res = await generateObject({ model: getModel(), prompt, schema: ReplySchema });
        out = res.object;
      } catch {
        out = fallbackReply(sh, data.subject, data.attachment_label);
      }

      if (isPlaceholderReply(out.body) || (recentReplies ?? []).some((m) => m.sender_name === sh.name && m.body.trim().toLowerCase() === out.body.trim().toLowerCase())) {
        out = fallbackReply(sh, data.subject, data.attachment_label);
      }

      await supabase.from("comms_messages").insert({
        user_id: uid,
        thread_id: threadId,
        direction: "inbound",
        from_role: sh.role,
        to_roles: ["coordinator"],
        msg_type: "Update",
        subject: out.subject,
        body: out.body,
        sentiment: out.sentiment,
      });

      await supabase.from("inbox_messages").insert({
        user_id: uid,
        sender_name: sh.name,
        sender_role: sh.title,
        subject: out.subject,
        body: out.body,
        tone: out.sentiment === "pushback" || out.sentiment === "concerned" ? "frustrated" : out.sentiment === "positive" ? "supportive" : "neutral",
      });
    }

    return { ok: true, thread_id: threadId, replies: stakeholders.length };
  });
