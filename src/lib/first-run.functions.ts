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
