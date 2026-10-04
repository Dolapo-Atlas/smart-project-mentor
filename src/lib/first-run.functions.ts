import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Read-only check for the day-one gate: on a brand new project instance the
 * learner must read the Project Manager's welcome email and reply to it before
 * any other module opens. Derived entirely from existing rows — this function
 * mutates nothing and does not touch progression, gates or scoring.
 */
export const getFirstEmailGate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();

    const instanceId: string | null = profile?.current_project_instance_id ?? null;
    const empty = {
      instanceId: null as string | null,
      required: false,
      replied: true,
      hasWelcomeEmail: false,
      welcomeSender: null as string | null,
      welcomeSubject: null as string | null,
      welcomeRead: false,
      phase: "initiation",
      day: 1,
    };
    if (!instanceId) return empty;

    const [stateRes, instRes, sentRes, inboxRes] = await Promise.all([
      supabase
        .from("simulation_state")
        .select("phase, current_day")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .maybeSingle(),
      supabase
        .from("project_instances")
        .select("status")
        .eq("id", instanceId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("comms_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .eq("direction", "outbound"),
      supabase
        .from("inbox_messages")
        .select("id, sender_name, subject, read, created_at")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .order("created_at", { ascending: true })
        .limit(1),
    ]);

    const status = String(instRes.data?.status ?? "active").toLowerCase();
    const phase = String(stateRes.data?.phase ?? "initiation").toLowerCase();
    const day = Number(stateRes.data?.current_day ?? 1);
    const replied = (sentRes.count ?? 0) > 0;
    const welcome = (inboxRes.data ?? [])[0] as any | undefined;

    const required =
      !replied &&
      !!welcome &&
      phase.startsWith("init") &&
      status !== "completed" &&
      status !== "archived";

    return {
      instanceId,
      required,
      replied,
      hasWelcomeEmail: !!welcome,
      welcomeSender: welcome?.sender_name ?? null,
      welcomeSubject: welcome?.subject ?? null,
      welcomeRead: !!welcome?.read,
      phase,
      day,
    };
  });

const NUDGE_SUBJECT = "Quick nudge: the Project Charter";

/**
 * If the learner replied to the welcome email more than ~20 hours ago and has
 * not started the charter, the Project Manager sends one friendly follow-up.
 * Sent at most once per project run.
 */
export const nudgeStalledCharter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id, preferred_name, first_name")
      .eq("id", userId)
      .maybeSingle();
    const instanceId: string | null = profile?.current_project_instance_id ?? null;
    if (!instanceId) return { sent: false };

    const [firstReply, charter, existing, welcome] = await Promise.all([
      supabase
        .from("comms_messages")
        .select("created_at")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .eq("direction", "outbound")
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("project_charters")
        .select("completion_pct")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .maybeSingle(),
      supabase
        .from("inbox_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .eq("subject", NUDGE_SUBJECT),
      supabase
        .from("inbox_messages")
        .select("sender_name, sender_role")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId)
        .order("created_at", { ascending: true })
        .limit(1),
    ]);

    const replyAt = firstReply.data?.[0]?.created_at;
    if (!replyAt) return { sent: false };
    if (Date.now() - new Date(replyAt).getTime() < 20 * 60 * 60 * 1000) return { sent: false };
    if ((charter.data?.completion_pct ?? 0) > 0) return { sent: false };
    if ((existing.count ?? 0) > 0) return { sent: false };

    const sender = welcome.data?.[0];
    const name = profile?.preferred_name || profile?.first_name || "there";
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      project_instance_id: instanceId,
      sender_name: sender?.sender_name ?? "Project Manager",
      sender_role: sender?.sender_role ?? "Project Manager",
      subject: NUDGE_SUBJECT,
      body: `Hi ${name},\n\nThanks again for your reply yesterday. The next thing I need from you is a first go at the Project Charter.\n\nDon't worry about getting it perfect. Just start with the purpose: what problem is this project solving, and why now? Two or three sentences is plenty. The step-by-step builder will walk you through the rest.\n\nShout if anything is unclear.`,
      tone: "supportive",
      read: false,
    } as never);
    return { sent: true };
  });
