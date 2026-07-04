import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { applyCompetencyStatus } from "./learning.functions";
import { ARCHETYPE_SENTIMENT_BY_ROLE } from "./pm.functions";
import { loadRoster, DEFAULT_ROSTER, type RosterMember } from "./roster";
import {
  generateStakeholderReply,
  isStakeholderAIAvailable,
  type ThreadMessage,
} from "./stakeholder-ai.server";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

// Legacy export kept so existing UI imports keep compiling; live UI should
// call `useRoster()` from `@/lib/roster` for the active project's cast.
export const STAKEHOLDERS: { role: string; name: string; title: string }[] = DEFAULT_ROSTER.map(
  (m) => ({ role: m.role, name: m.name, title: m.title }),
);

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

type Reply = z.infer<typeof ReplySchema>;

type RaidItemSummary = {
  title: string;
  kind: string;
  severity: string;
  likelihood?: string | null;
  status: string;
  owner?: string | null;
  mitigation?: string | null;
};

type ProjectEvidence = {
  firstName: string;
  raidItems: RaidItemSummary[];
  openTasks: Array<{ title: string; status: string }>;
  pendingDocs: Array<{ title: string; status: string }>;
  attachmentDetail: string;
  evidenceSummary: string;
};

function isRaidMessage(subject: string, body: string, attachmentKind?: string | null, attachmentLabel?: string | null) {
  const text = `${subject} ${body} ${attachmentKind ?? ""} ${attachmentLabel ?? ""}`.toLowerCase();
  return /\braid\b|risk log|risk register|assumption|dependency|dependencies|issue log/.test(text);
}

function isCompletionClaim(subject: string, body: string) {
  const text = `${subject} ${body}`.toLowerCase();
  return /\b(updated|uploaded|attached|completed|done|closed|resolved|no pending|nothing pending|all clear)\b/.test(text);
}

function missingRaidControlItems(items: RaidItemSummary[]) {
  return items.filter((item) => {
    if (item.status === "closed") return false;
    return !item.owner?.trim() || !item.mitigation?.trim();
  });
}

function openHighRaidItems(items: RaidItemSummary[]) {
  return items.filter((item) => item.status !== "closed" && ["high", "critical"].includes(item.severity));
}

function buildEvidenceSummary(evidence: ProjectEvidence) {
  const total = evidence.raidItems.length;
  const open = evidence.raidItems.filter((item) => item.status !== "closed").length;
  const highOpen = openHighRaidItems(evidence.raidItems).length;
  const missingControls = missingRaidControlItems(evidence.raidItems).length;
  return [
    `RAID log: ${total} item(s), ${open} open/mitigating, ${highOpen} open high/critical, ${missingControls} open item(s) missing owner or mitigation.`,
    `Open tasks: ${evidence.openTasks.length ? evidence.openTasks.map((task) => `${task.title} (${task.status})`).join("; ") : "none"}.`,
    `Pending document reviews: ${evidence.pendingDocs.length ? evidence.pendingDocs.map((doc) => doc.title).join("; ") : "none"}.`,
    evidence.attachmentDetail ? `Attachment selected: ${evidence.attachmentDetail}.` : "No attachment selected.",
  ].join("\n");
}

function evidenceAwareReply(
  stakeholder: { role: string; name: string; title: string },
  subject: string,
  body: string,
  attachmentKind: string | undefined,
  attachmentLabel: string | undefined,
  evidence: ProjectEvidence,
): Reply | null {
  const raidEmail = isRaidMessage(subject, body, attachmentKind, attachmentLabel);
  if (!raidEmail || stakeholder.role !== "pm") return null;

  const subjectLine = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
  const missingControls = missingRaidControlItems(evidence.raidItems);
  const highOpen = openHighRaidItems(evidence.raidItems);
  const saysComplete = isCompletionClaim(subject, body);
  const hasUsefulRaid = evidence.raidItems.length >= 3;

  if (hasUsefulRaid && missingControls.length === 0 && highOpen.length === 0) {
    return {
      sender_role: stakeholder.title,
      subject: subjectLine,
      sentiment: "positive",
      body: `Hi ${evidence.firstName},

Thanks — I can see the updated RAID log now. The items have owners/mitigations recorded and there are no open high or critical RAID items blocking this from my side.

Please keep it current as decisions change, but you don't need to re-upload or chase me on this thread. This clears the RAID follow-up for governance.

${stakeholder.name}
${stakeholder.title}`,
    };
  }

  if (hasUsefulRaid && missingControls.length === 0) {
    return {
      sender_role: stakeholder.title,
      subject: subjectLine,
      sentiment: "neutral",
      body: `Hi ${evidence.firstName},

Thanks — I can see the updated RAID log. The entries are controlled with owners and mitigations; the only thing I need is for the ${highOpen.length} remaining high/critical item(s) to stay visible in the next status report until they are closed.

No re-upload needed. Keep the escalation triggers clear and we'll use this version for governance.

${stakeholder.name}
${stakeholder.title}`,
    };
  }

  if (hasUsefulRaid && missingControls.length > 0) {
    return {
      sender_role: stakeholder.title,
      subject: subjectLine,
      sentiment: saysComplete ? "concerned" : "neutral",
      body: `Hi ${evidence.firstName},

Thanks — I can see the RAID update. It is in the right place, so no need to re-upload it.

Before I can treat it as complete for governance, please add the missing owner or mitigation details for: ${missingControls.slice(0, 3).map((item) => item.title).join("; ")}${missingControls.length > 3 ? ` and ${missingControls.length - 3} more` : ""}.

${stakeholder.name}
${stakeholder.title}`,
    };
  }

  return null;
}

function fallbackReply(
  stakeholder: { role: string; name: string; title: string },
  subject: string,
  attachmentLabel?: string,
): Reply {
  const topic = attachmentLabel ? ` and the attached ${attachmentLabel}` : "";
  const bodyByRole: Record<string, string> = {
    pm: `I have reviewed your note${topic}. Please convert the key points into dated actions, then show me which items need sponsor or governance input before Friday.`,
    clinical: `I have picked this up${topic}. Before governance can support it, I need the safety impact, approval route, and escalation triggers made explicit.`,
    sponsor: `I have seen your update${topic}. What I need next is a concise decision-ready view: options, risk, cost, recommendation, and the consequence of waiting.`,
    finance: `I have reviewed the update${topic}. Please send the cost implication, forecast movement, and any approval required before this is treated as agreed.`,
    tech: `I have checked this from the technical side${topic}. The next version needs to call out migration, downtime, integration ownership, and acceptance criteria.`,
    vendor: `We have reviewed the request${topic}. Please confirm whether this is within the agreed scope or should be handled as a formal change request.`,
    operations: `I have read the update${topic}. Please make sure the plan reflects on-the-ground operations, staffing, and what happens if a site is not ready.`,
    admin: `Noted${topic}. Before I can sign this off, the audit trail and compliance points need to be clean.`,
    care_home: `I have read the update${topic}. Please make sure the plan reflects staff availability on the floor, training time, and what happens if the home is not ready.`,
  };
  const lead = bodyByRole[stakeholder.role] ?? `I have reviewed your note${topic}. Please send the next actions and owner list when ready.`;
  return {
    sender_role: stakeholder.title,
    subject: `Re: ${subject}`,
    body: `${lead}\n\n${stakeholder.name}\n${stakeholder.title}`,
    sentiment: ["clinical", "finance", "care_home", "operations"].includes(stakeholder.role) ? "concerned" : "neutral",
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

    const [
      { data: state },
      { data: profile },
      { data: raidItems },
      { data: openTasks },
      { data: pendingDocs },
      { data: attachedDoc },
      { data: attachedRaid },
    ] = await Promise.all([
      supabase
        .from("simulation_state")
        .select("project_name,phase,health,reputation,progress")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("first_name,preferred_name")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("raid_items")
        .select("title,kind,severity,likelihood,status,owner,mitigation")
        .eq("user_id", uid),
      supabase
        .from("tasks")
        .select("title,status")
        .eq("user_id", uid)
        .neq("status", "done"),
      supabase
        .from("documents")
        .select("title,status")
        .eq("user_id", uid)
        .eq("status", "pending"),
      data.attachment_kind === "document" && data.attachment_ref
        ? supabase
            .from("documents")
            .select("title,status,quality_score")
            .eq("user_id", uid)
            .eq("id", data.attachment_ref)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      data.attachment_kind === "raid" && data.attachment_ref
        ? supabase
            .from("raid_items")
            .select("title,kind,severity,likelihood,status,owner,mitigation")
            .eq("user_id", uid)
            .eq("id", data.attachment_ref)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const firstName = profile?.preferred_name?.trim() || profile?.first_name || "there";
    const attachmentDetail = attachedDoc
      ? `${attachedDoc.title} (${attachedDoc.status}${typeof attachedDoc.quality_score === "number" ? `, score ${attachedDoc.quality_score}` : ""})`
      : attachedRaid
        ? `${attachedRaid.kind}: ${attachedRaid.title} (${attachedRaid.status}, ${attachedRaid.severity})`
        : data.attachment_label ?? "";
    const evidence: ProjectEvidence = {
      firstName,
      raidItems: (raidItems ?? []) as RaidItemSummary[],
      openTasks: (openTasks ?? []) as Array<{ title: string; status: string }>,
      pendingDocs: (pendingDocs ?? []) as Array<{ title: string; status: string }>,
      attachmentDetail,
      evidenceSummary: "",
    };
    evidence.evidenceSummary = buildEvidenceSummary(evidence);

    const roster = await loadRoster(supabase, uid);
    const stakeholders: RosterMember[] = roster.filter((s) => data.to_roles.includes(s.role));
    const { data: recentReplies } = await supabase
      .from("inbox_messages")
      .select("sender_name,subject,body")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(8);

    for (const sh of stakeholders) {
      const projectName = state?.project_name ?? "the programme";
      const prompt = `You are simulating "${sh.name}, ${sh.title}" on the "${projectName}" project.
Project state: phase=${state?.phase}, health=${state?.health}, reputation=${state?.reputation}/100, progress=${state?.progress}/100.

Current workspace evidence you can see:
${evidence.evidenceSummary}

The project coordinator just sent you this ${data.msg_type.toLowerCase()} email:
Subject: ${data.subject}
Body:
${data.body}
${data.attachment_label ? `Attached: ${data.attachment_kind} — ${data.attachment_label}` : "No attachment."}
Recent inbox replies to avoid repeating: ${JSON.stringify(recentReplies ?? [])}

Write a realistic reply FROM ${sh.name} (${sh.title}) to the coordinator. Stay in character for their role (${sh.role}):
- pm: checks process, RAID, deadlines, owners.
- sponsor: busy, expects clarity, can be impatient.
- finance: pushes back on cost/value, asks for forecasts and approval routes.
- tech: talks integrations, data, downtime, acceptance criteria.
- vendor: defends commercials and scope, references contract.
- operations / care_home: talks about staff, floor reality, readiness, training.
- admin: process and compliance, what is owed for audit.
- clinical: patient safety, governance, escalation triggers.
Stay grounded in the "${projectName}" project domain — do NOT invent unrelated context.

Use the workspace evidence above. If the coordinator says something is updated, attached, completed, or has no pending items and the evidence supports that, acknowledge it and do not claim you cannot see the file, central folder, RAID log, or pending action. Do not invent missing artefacts.
Only disagree, push back, ask hard questions, or escalate when there is a specific unresolved gap in the evidence (for example missing owner, missing mitigation, open high/critical RAID item, pending document review, or open task). If the evidence resolves the issue, be positive or neutral.
2-4 short paragraphs. Sign off with name & role. Do not use generic placeholder wording like "Thanks for the note — I'll come back to you shortly".
Choose sentiment honestly: positive, neutral, pushback, concerned, or ignored (if ignored, body is a short auto-reply / out of office).`;

      // Pull recent conversation history between this coordinator and this
      // stakeholder role so Gemini has thread context. Falls through cleanly
      // if the query errors — history is a nice-to-have for the AI path.
      let history: ThreadMessage[] = [];
      try {
        const { data: prior } = await supabase
          .from("comms_messages")
          .select("direction,from_role,to_roles,subject,body,created_at")
          .eq("user_id", uid)
          .or(`from_role.eq.${sh.role},to_roles.cs.{${sh.role}}`)
          .order("created_at", { ascending: true })
          .limit(20);
        history = (prior ?? []).map((m) => ({
          direction: m.direction === "outbound" ? "outbound" : "inbound",
          from: m.direction === "outbound" ? "Coordinator" : sh.name,
          subject: m.subject ?? "",
          body: m.body ?? "",
        }));
      } catch {
        history = [];
      }

      let out: Reply;
      // Priority 1: deterministic evidence-aware reply (existing behaviour
      // for RAID governance emails). Keeps proven UX unchanged.
      const deterministic = evidenceAwareReply(
        { role: sh.role, name: sh.name, title: sh.title },
        data.subject,
        data.body,
        data.attachment_kind,
        data.attachment_label,
        evidence,
      );
      if (deterministic) {
        out = deterministic;
      } else {
        // Priority 2: Gemini in-character reply with thread history.
        // Priority 3: existing Lovable-Gateway generateObject path.
        // Priority 4: static per-role fallback.
        try {
          if (isStakeholderAIAvailable()) {
            const gem = await generateStakeholderReply({
              stakeholder: { role: sh.role, name: sh.name, title: sh.title },
              project: {
                projectName,
                phase: state?.phase,
                health: state?.health,
                reputation: state?.reputation,
                progress: state?.progress,
                evidenceSummary: evidence.evidenceSummary,
                attachmentDetail: evidence.attachmentDetail,
              },
              learnerMessage: {
                subject: data.subject,
                body: data.body,
                msgType: data.msg_type,
                attachmentKind: data.attachment_kind,
                attachmentLabel: data.attachment_label,
              },
              history,
            });
            out = ReplySchema.parse(gem);
          } else {
            throw new Error("Gemini not configured");
          }
        } catch (gemErr) {
          console.warn("[comms] Gemini stakeholder reply failed, falling back:", gemErr);
          try {
            out = (await generateObject({ model: getModel(), prompt, schema: ReplySchema })).object;
          } catch {
            out = fallbackReply({ role: sh.role, name: sh.name, title: sh.title }, data.subject, data.attachment_label);
          }
        }
      }

      if (isPlaceholderReply(out.body) || (recentReplies ?? []).some((m) => m.sender_name === sh.name && m.body.trim().toLowerCase() === out.body.trim().toLowerCase())) {
        out = fallbackReply({ role: sh.role, name: sh.name, title: sh.title }, data.subject, data.attachment_label);
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
        tone: out.sentiment === "pushback" ? "frustrated" : out.sentiment === "concerned" ? "curious" : out.sentiment === "positive" ? "supportive" : "neutral",
      });

      // Replies are acknowledgements only — the real shift in stakeholder
      // sentiment, health and reputation comes from completing the linked
      // tasks (see closeTaskWithReview in tasks.functions.ts).
      const delta =
        out.sentiment === "positive" ? 2 :
        out.sentiment === "neutral" ? 1 :
        out.sentiment === "concerned" ? -1 :
        out.sentiment === "pushback" ? -2 :
        0;
      const { data: existing } = await supabase
        .from("stakeholder_relationships")
        .select("sentiment,interaction_count,role")
        .eq("user_id", uid)
        .eq("stakeholder_name", sh.name)
        .maybeSingle();
      const baseline = ARCHETYPE_SENTIMENT_BY_ROLE[sh.role] ?? 0;
      const nextSentiment = Math.max(-100, Math.min(100, (existing?.sentiment ?? baseline) + delta));
      await supabase.from("stakeholder_relationships").upsert(
        {
          user_id: uid,
          stakeholder_name: sh.name,
          role: existing?.role || sh.title,
          sentiment: nextSentiment,
          interaction_count: (existing?.interaction_count ?? 0) + 1,
          last_interaction: new Date().toISOString(),
        },
        { onConflict: "user_id,project_instance_id,stakeholder_name" },
      );
    }

    // Action-based micro-ticks: tick competencies for sending the right kind
    // of email to the right stakeholder. Always counts as mastered — these
    // are soft skills, demonstrated by doing.
    const micro: string[] = ["p5.stakeholder_emails"];
    if (data.msg_type === "Escalation" && data.to_roles.includes("sponsor")) {
      micro.push("p2.escalation_routes", "p2.executive_sponsors");
    }
    if (data.to_roles.includes("care_home")) {
      micro.push("p2.managing_difficult_stakeholders");
    }
    if (data.to_roles.includes("vendor")) {
      micro.push("p2.vendor_management", "p6.vendor_coordination");
    }
    if (data.msg_type === "Update" && data.to_roles.includes("sponsor")) {
      micro.push("p5.executive_briefings");
    }
    try {
      await applyCompetencyStatus(supabase, uid, micro, "mastered");
    } catch (e) {
      console.error("learning journey micro-tick failed", e);
    }

    // Chapter trigger: first reply to the sponsor OR PM closes the kickoff
    // chapter. The welcome email is usually from the PM, so accept either.
    if (data.to_roles.includes("sponsor") || data.to_roles.includes("pm")) {
      try {
        const { tickChapterBySlug } = await import("@/lib/chapters.functions");
        await tickChapterBySlug(supabase, uid, "kickoff");
      } catch (e) {
        console.error("chapter tick (kickoff) failed", e);
      }
    }

    return { ok: true, thread_id: threadId, replies: stakeholders.length };
  });

// Action-based micro-ticks moved into sendComm: tick relevant competencies
// based on recipient + message type. Mastered is sticky upstream.
