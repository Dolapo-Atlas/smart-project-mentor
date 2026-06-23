import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { STAKEHOLDERS } from "@/lib/stakeholders";
import { ARCHETYPE_SENTIMENT } from "@/lib/pm.functions";
import { applyCompetencyStatus } from "@/lib/learning.functions";

// Map known inbox sender names to stakeholder role keys.
const SENDER_ROLE_BY_NAME: Record<string, string> = {
  "Sarah Williams": "pm",
  "David Okafor": "sponsor",
  "Priya Anand": "finance",
  "James Lin": "tech",
  "CareSoft Ltd": "vendor",
  "Margaret Hollis": "care_home",
  "Rachel Stone": "clinical",
};

// Functional lead for a given sender role (the specialist who should own it).
const FUNCTIONAL_LEAD_BY_ROLE: Record<string, string> = {
  finance: "finance",
  tech: "tech",
  clinical: "clinical",
  vendor: "vendor",
  care_home: "care_home",
};

const Mode = z.enum(["ask_pm", "escalate_sponsor", "assign_lead"]);

function find(role: string) {
  return STAKEHOLDERS.find((s) => s.role === role)!;
}

function delegateReplyBody(opts: {
  delegate: { name: string; title: string; role: string };
  sender: { name: string; role: string };
  subject: string;
  originalBody: string;
}): string {
  const { delegate, sender, subject } = opts;
  const topic = subject.replace(/^re:\s*/i, "");
  switch (delegate.role) {
    case "pm":
      return `Hi ${sender.name.split(" ")[0]},\n\n${opts.originalBody.length > 30 ? "Picking this up from the coordinator — " : ""}I'll take this from here. Let me work through "${topic}" and come back to you with a clear position by end of day. If it touches budget or the steering committee I'll loop David in directly so we don't lose time.\n\nThanks,\nSarah Williams\nProject Manager`;
    case "sponsor":
      return `${sender.name.split(" ")[0]},\n\nThe coordinator has escalated "${topic}" to me. I'll review the impact on cost, scope and the programme board commitment, then come back with a decision. If you have a one-page summary of the trade-offs, send it across — I don't have time to read the full thread.\n\nDavid Okafor\nExecutive Sponsor`;
    case "finance":
      return `Hi ${sender.name.split(" ")[0]},\n\nThis sits with me. I'll pull the latest forecast vs actuals, vendor exposure and the approval route, and circulate a Cost to Complete view. Expect it in the next working day. If anything changes the £500k envelope I'll flag it before sign-off.\n\nPriya Anand\nFinance Lead`;
    case "tech":
      return `Hi ${sender.name.split(" ")[0]},\n\nI'll own the technical assessment on "${topic}" — integrations, migration, downtime window and acceptance criteria. I'll come back with options and a recommendation rather than a single answer so you can choose.\n\nJames Lin\nTechnical Lead`;
    case "clinical":
      return `Hi ${sender.name.split(" ")[0]},\n\nClinical governance will lead on this. I'll map the safety impact, the approval route and the escalation triggers, and confirm what we can sign off versus what needs the wider committee.\n\nRachel Stone\nClinical Governance Lead`;
    case "vendor":
      return `Hello ${sender.name.split(" ")[0]},\n\nThe CareSoft account team will pick this up. We'll confirm whether the request sits inside the agreed scope or needs a formal change request, and respond with a written position.\n\nCareSoft Account Director`;
    case "care_home":
      return `Hi ${sender.name.split(" ")[0]},\n\nI'll cover this from the home's side — staff availability on the floor, training time, and what we need before go-live. I'll come back once I've spoken to the team leads.\n\nMargaret Hollis\nCare Home Manager, Oakwood`;
    default:
      return `Hi ${sender.name.split(" ")[0]},\n\nI've taken this on and will reply shortly.\n\n${delegate.name}`;
  }
}

function systemNote(delegate: { name: string; role: string }, mode: string): string {
  if (mode === "escalate_sponsor") return `${delegate.name} has approved escalation to the Project Board.`;
  if (mode === "ask_pm") return `${delegate.name} has taken ownership of this discussion.`;
  switch (delegate.role) {
    case "tech": return `${delegate.name} will provide a technical assessment.`;
    case "finance": return `${delegate.name} is preparing a finance position.`;
    case "clinical": return `${delegate.name} will lead the clinical governance review.`;
    case "vendor": return `${delegate.name} (CareSoft) has accepted the action.`;
    case "care_home": return `${delegate.name} will respond from the care home side.`;
    default: return `${delegate.name} has taken this on.`;
  }
}

function isStrategicEscalation(subject: string, body: string): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return /(budget|cost|forecast|scope|change request|governance|board|steering|risk|deadline|go.?live|sponsor)/.test(text);
}

async function bumpSentiment(
  supabase: any,
  userId: string,
  name: string,
  delta: number,
  fallbackRole: string,
): Promise<number> {
  const { data: existing } = await supabase
    .from("stakeholder_relationships")
    .select("sentiment,interaction_count,role")
    .eq("user_id", userId)
    .eq("stakeholder_name", name)
    .maybeSingle();
  const baseline = ARCHETYPE_SENTIMENT[name] ?? 0;
  const current = existing?.sentiment ?? baseline;
  const next = Math.max(-100, Math.min(100, current + delta));
  await supabase.from("stakeholder_relationships").upsert(
    {
      user_id: userId,
      stakeholder_name: name,
      role: existing?.role || fallbackRole,
      sentiment: next,
      interaction_count: (existing?.interaction_count ?? 0) + 1,
      last_interaction: new Date().toISOString(),
    },
    { onConflict: "user_id,stakeholder_name" },
  );
  return current;
}

export const delegateInboxMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      inbox_id: z.string().uuid(),
      mode: Mode,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load original inbox message
    const { data: orig, error: oErr } = await supabase
      .from("inbox_messages")
      .select("*")
      .eq("id", data.inbox_id)
      .eq("user_id", userId)
      .single();
    if (oErr || !orig) throw new Error("Message not found");

    const senderRoleKey = SENDER_ROLE_BY_NAME[orig.sender_name] ?? "stakeholder";
    const sender = { name: orig.sender_name, role: senderRoleKey };

    // Pick the delegate
    let delegateRole: string;
    if (data.mode === "ask_pm") delegateRole = "pm";
    else if (data.mode === "escalate_sponsor") delegateRole = "sponsor";
    else {
      const lead = FUNCTIONAL_LEAD_BY_ROLE[senderRoleKey];
      // If sender is already the relevant lead, escalate to PM instead
      delegateRole = lead && lead !== senderRoleKey ? lead : "pm";
    }
    const delegate = find(delegateRole);

    const subject = orig.subject.startsWith("Re:") ? orig.subject : `Re: ${orig.subject}`;
    const body = delegateReplyBody({
      delegate,
      sender,
      subject,
      originalBody: orig.body ?? "",
    });

    // Comms thread: coordinator hand-off + delegate reply
    const threadId = crypto.randomUUID();
    await supabase.from("comms_messages").insert([
      {
        user_id: userId,
        thread_id: threadId,
        direction: "outbound",
        from_role: "coordinator",
        to_roles: [delegateRole],
        msg_type: "Request",
        subject: `Handover: ${orig.subject}`,
        body: `Hi ${delegate.name.split(" ")[0]},\n\nCan you take ownership of the thread below from ${orig.sender_name}? Original subject: "${orig.subject}".\n\nThanks.`,
      },
      {
        user_id: userId,
        thread_id: threadId,
        direction: "inbound",
        from_role: delegateRole,
        to_roles: ["coordinator", senderRoleKey],
        msg_type: data.mode === "escalate_sponsor" ? "Escalation" : "Update",
        subject,
        body,
        sentiment: "neutral",
      },
    ]);

    // Inbox: reply from the delegate (so user sees the response)
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: delegate.name,
      sender_role: delegate.title,
      subject,
      body,
      tone: "supportive",
    });

    // Inbox: system note
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      sender_name: "Project Update",
      sender_role: "System",
      subject: systemNote(delegate, data.mode),
      body: `${systemNote(delegate, data.mode)}\n\nOriginal request from ${orig.sender_name}: "${orig.subject}".`,
      tone: "neutral",
    });

    // Mark original as read
    await supabase
      .from("inbox_messages")
      .update({ read: true })
      .eq("id", data.inbox_id)
      .eq("user_id", userId);

    // Sentiment changes — when the sender is already frustrated, a proper
    // delegation is a real recovery action: someone senior or the right
    // specialist has taken ownership.
    const { data: senderRel } = await supabase
      .from("stakeholder_relationships")
      .select("sentiment")
      .eq("user_id", userId)
      .eq("stakeholder_name", orig.sender_name)
      .maybeSingle();
    const senderSentiment = senderRel?.sentiment ?? ARCHETYPE_SENTIMENT[orig.sender_name] ?? 0;
    const frustrated = senderSentiment < -20;

    const justified = isStrategicEscalation(orig.subject ?? "", orig.body ?? "");
    if (data.mode === "ask_pm") {
      await bumpSentiment(supabase, userId, orig.sender_name, frustrated ? +25 : +6, orig.sender_role);
      // Check recent Sarah delegations this week
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("inbox_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("sender_name", "Project Update")
        .ilike("subject", "%Sarah Williams%")
        .gte("created_at", since);
      const overload = (count ?? 0) >= 3;
      await bumpSentiment(supabase, userId, "Sarah Williams", overload ? -8 : -1, "Project Manager");
    } else if (data.mode === "escalate_sponsor") {
      if (justified) {
        await bumpSentiment(supabase, userId, orig.sender_name, frustrated ? +20 : +6, orig.sender_role);
        await bumpSentiment(supabase, userId, "David Okafor", +1, "Executive Sponsor");
      } else {
        await bumpSentiment(supabase, userId, "David Okafor", -6, "Executive Sponsor");
        await bumpSentiment(supabase, userId, orig.sender_name, -2, orig.sender_role);
      }
    } else {
      await bumpSentiment(supabase, userId, orig.sender_name, frustrated ? +30 : +10, orig.sender_role);
    }

    // Competency micro-tick
    try {
      const ticks = ["p5.stakeholder_emails", "p2.managing_difficult_stakeholders"];
      if (data.mode === "escalate_sponsor") ticks.push("p2.escalation_routes", "p2.executive_sponsors");
      await applyCompetencyStatus(supabase, userId, ticks, "mastered");
    } catch (e) {
      console.error("delegate micro-tick failed", e);
    }

    return {
      ok: true,
      delegate_name: delegate.name,
      delegate_role: delegate.title,
      system_note: systemNote(delegate, data.mode),
    };
  });