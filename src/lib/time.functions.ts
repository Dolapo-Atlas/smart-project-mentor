import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ARCHETYPE_SENTIMENT } from "./pm.functions";
import { generateStakeholderMessage } from "./sim.functions";

const ModeSchema = z.enum(["day", "week", "sprint", "steerco", "golive"]);

const PHASE_ORDER = [
  "initiation",
  "planning",
  "execution",
  "monitoring",
  "go-live",
  "closure",
] as const;
type Phase = (typeof PHASE_ORDER)[number];

type StoryBeat = { at: string; beat: string };

export const getReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [tasks, inbox, docs, meetings, raids, rels] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,status,priority")
        .eq("user_id", userId)
        .neq("status", "done"),
      supabase
        .from("inbox_messages")
        .select("id,subject,sender_name")
        .eq("user_id", userId)
        .eq("read", false),
      supabase
        .from("documents")
        .select("id,title,status")
        .eq("user_id", userId)
        .eq("status", "pending"),
      supabase
        .from("meetings")
        .select("id,title,held,minutes,ai_summary,decisions,minutes_sent_at")
        .eq("user_id", userId)
        .eq("held", true),
      supabase
        .from("raid_items")
        .select("id,title,kind,severity,status")
        .eq("user_id", userId)
        .eq("status", "open")
        .eq("severity", "high"),
      supabase
        .from("stakeholder_relationships")
        .select("stakeholder_name,sentiment")
        .eq("user_id", userId)
        .lt("sentiment", -20),
    ]);

    const meetingsMissingMinutes = (meetings.data ?? []).filter((m) => !m.minutes_sent_at);

    const openTasks = tasks.data ?? [];
    const unread = inbox.data ?? [];
    const unsubmitted = docs.data ?? [];
    const highRisks = raids.data ?? [];
    const frustrated = (rels.data ?? []).map((r) => ({
      name: r.stakeholder_name,
      sentiment: r.sentiment,
    }));

    const blockerCount =
      openTasks.length +
      unread.length +
      unsubmitted.length +
      meetingsMissingMinutes.length +
      highRisks.length +
      frustrated.length;

    return {
      openTasks: openTasks.map((t) => ({ id: t.id, title: t.title })),
      unreadInbox: unread.map((m) => ({ id: m.id, from: m.sender_name, subject: m.subject })),
      unsubmittedDocs: unsubmitted.map((d) => ({ id: d.id, title: d.title })),
      meetingsMissingMinutes: meetingsMissingMinutes.map((m) => ({ id: m.id, title: m.title })),
      openHighRisks: highRisks.map((r) => ({ id: r.id, title: r.title, kind: r.kind })),
      frustratedStakeholders: frustrated,
      missingApprovals: meetingsMissingMinutes.length, // proxy
      blockerCount,
    };
  });

function nextPhase(current: string): Phase | null {
  const i = PHASE_ORDER.indexOf(current as Phase);
  if (i < 0 || i >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[i + 1];
}

function degradeHealth(h: string, deltaNeg: number): string {
  if (deltaNeg <= 0) return h;
  if (h === "green") return deltaNeg >= 2 ? "red" : "amber";
  if (h === "amber") return "red";
  return h;
}

function improveHealth(h: string): string {
  if (h === "red") return "amber";
  if (h === "amber") return "green";
  return h;
}

export const advanceTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mode: ModeSchema,
        force: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Readiness check
    const readiness = await getReadiness();
    if (!data.force && readiness.blockerCount > 0 && data.mode !== "day") {
      return { blocked: true, readiness };
    }

    const daysMap: Record<typeof data.mode, number> = {
      day: 1,
      week: 7,
      sprint: 14,
      steerco: 14,
      golive: 60,
    };
    const days = daysMap[data.mode];

    const { data: state } = await supabase
      .from("simulation_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!state) throw new Error("No simulation state");

    const startDay = state.current_day ?? 1;
    const newDay = startDay + days;
    const newWeek = Math.floor((newDay - 1) / 7) + 1;
    const newSprint = Math.floor((newDay - 1) / 14) + 1;

    const beats: StoryBeat[] = [];
    const newEmails: string[] = [];
    let healthChange: { from: string; to: string } | null = null;
    const sentimentDeltas: Record<string, number> = {};
    let reputationDelta = 0;

    // ---- Consequences ----

    // 1. High-risk RAIDs left open → degrade health, sponsor unhappy
    if (readiness.openHighRisks.length > 0) {
      const before = state.health;
      const after = degradeHealth(before, readiness.openHighRisks.length);
      if (after !== before) {
        healthChange = { from: before, to: after };
        beats.push({
          at: new Date().toISOString(),
          beat: `${readiness.openHighRisks.length} high-severity RAID items remained open. Project health moved ${before} → ${after}.`,
        });
      }
      sentimentDeltas["David Okafor"] = (sentimentDeltas["David Okafor"] ?? 0) - 5;
      sentimentDeltas["Sarah Williams"] = (sentimentDeltas["Sarah Williams"] ?? 0) - 3;
      reputationDelta -= 3;
    } else {
      // No high risks: small reputation boost & potential health recovery
      reputationDelta += 1;
      if (data.mode !== "day" && state.health !== "green") {
        const after = improveHealth(state.health);
        if (after !== state.health) {
          healthChange = { from: state.health, to: after };
          beats.push({
            at: new Date().toISOString(),
            beat: `Risks under control. Health improved ${state.health} → ${after}.`,
          });
        }
      }
    }

    // 2. Unread inbox → reputation hit + escalation email
    if (readiness.unreadInbox.length >= 3) {
      reputationDelta -= 2;
      sentimentDeltas["Sarah Williams"] = (sentimentDeltas["Sarah Williams"] ?? 0) - 2;
      beats.push({
        at: new Date().toISOString(),
        beat: `${readiness.unreadInbox.length} stakeholder messages went unanswered while time advanced.`,
      });
    }

    // 3. Frustrated stakeholders compound
    for (const s of readiness.frustratedStakeholders) {
      sentimentDeltas[s.name] = (sentimentDeltas[s.name] ?? 0) - 3;
    }

    // 4. Phase advancement check
    let newPhase: string = state.phase;
    if (readiness.blockerCount === 0) {
      const np = nextPhase(state.phase);
      if (np && (data.mode === "sprint" || data.mode === "steerco" || data.mode === "golive")) {
        newPhase = np;
        beats.push({
          at: new Date().toISOString(),
          beat: `Phase advanced: ${state.phase} → ${np}.`,
        });
        sentimentDeltas["David Okafor"] = (sentimentDeltas["David Okafor"] ?? 0) + 4;
        reputationDelta += 4;
      }
    }

    // ---- Apply sentiment deltas ----
    for (const [name, delta] of Object.entries(sentimentDeltas)) {
      if (delta === 0) continue;
      const { data: existing } = await supabase
        .from("stakeholder_relationships")
        .select("sentiment,interaction_count")
        .eq("user_id", userId)
        .eq("stakeholder_name", name)
        .maybeSingle();
      const baseline = ARCHETYPE_SENTIMENT[name] ?? 0;
      const cur = existing?.sentiment ?? baseline;
      const next = Math.max(-100, Math.min(100, cur + delta));
      await supabase.from("stakeholder_relationships").upsert(
        {
          user_id: userId,
          stakeholder_name: name,
          sentiment: next,
          interaction_count: (existing?.interaction_count ?? 0) + 1,
        },
        { onConflict: "user_id,stakeholder_name" },
      );
    }

    // ---- Update simulation state ----
    const story = Array.isArray(state.story_log) ? (state.story_log as StoryBeat[]) : [];
    const updatedStory = [...story, ...beats].slice(-50);
    const newHealth = healthChange?.to ?? state.health;

    await supabase
      .from("simulation_state")
      .update({
        current_day: newDay,
        current_week: newWeek,
        current_sprint: newSprint,
        phase: newPhase,
        health: newHealth,
        reputation: Math.max(0, Math.min(100, (state.reputation ?? 50) + reputationDelta)),
        story_log: updatedStory,
        last_advanced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // ---- Generate at least one stakeholder email per advance ----
    try {
      const emailCount = data.mode === "day" ? 1 : data.mode === "week" ? 2 : 3;
      for (let i = 0; i < emailCount; i++) {
        const msg = await generateStakeholderMessage();
        if (msg) newEmails.push(`${msg.sender_name}: ${msg.subject}`);
      }
    } catch {
      // non-fatal
    }

    return {
      blocked: false,
      summary: {
        days,
        fromDay: startDay,
        toDay: newDay,
        phase: newPhase,
        healthChange,
        sentimentDeltas,
        reputationDelta,
        newEmails,
        beats,
      },
    };
  });

export const getNextAction = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const readiness = await getReadiness();
    const { data: state } = await supabase
      .from("simulation_state")
      .select("phase,current_day,current_week,health")
      .eq("user_id", userId)
      .maybeSingle();

    // Priority order: frustrated stakeholder > unread > high risk > minutes > docs > tasks
    let title = "Send a weekly status report";
    let reason = "Inbox is quiet. Brief the sponsor before they ask.";
    let cta = "Write report";
    let to = "/app/reports";

    if (readiness.frustratedStakeholders.length > 0) {
      const s = readiness.frustratedStakeholders[0];
      title = `Repair relationship with ${s.name}`;
      reason = `${s.name} is at sentiment ${s.sentiment}. Acknowledge their concern, address it directly.`;
      cta = "Open stakeholder";
      to = "/app/stakeholders";
    } else if (readiness.unreadInbox.length > 0) {
      const m = readiness.unreadInbox[0];
      title = `Reply to ${m.from} — "${m.subject}"`;
      reason = "Stakeholder is waiting on you. Reply to keep trust.";
      cta = "Open inbox";
      to = "/app/inbox";
    } else if (readiness.openHighRisks.length > 0) {
      title = `Mitigate ${readiness.openHighRisks.length} high-severity risk${readiness.openHighRisks.length === 1 ? "" : "s"}`;
      reason = "Open high-severity RAID items will degrade project health on next time advance.";
      cta = "Open RAID log";
      to = "/app/risk";
    } else if (readiness.meetingsMissingMinutes.length > 0) {
      title = `Send minutes for "${readiness.meetingsMissingMinutes[0].title}"`;
      reason = "Minutes need to be captured and sent to attendees before this stops showing as open.";
      cta = "Open meeting";
      to = "/app/meetings";
    } else if (readiness.unsubmittedDocs.length > 0) {
      title = `Submit "${readiness.unsubmittedDocs[0].title}" for review`;
      reason = "Document is pending. Get it in front of the review panel.";
      cta = "Open documents";
      to = "/app/documents";
    } else if (readiness.openTasks.length > 0) {
      title = `Finish: ${readiness.openTasks[0].title}`;
      reason = "Next deliverable on your plan.";
      cta = "Open tasks";
      to = "/app/tasks";
    }

    return {
      phase: state?.phase ?? "initiation",
      day: state?.current_day ?? 1,
      week: state?.current_week ?? 1,
      health: state?.health ?? "amber",
      action: { title, reason, cta, to },
      blockerCount: readiness.blockerCount,
    };
  });