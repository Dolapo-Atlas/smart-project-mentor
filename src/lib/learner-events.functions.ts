import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEARNER_EVENTS, type LearnerEvent } from "./learner-events.shared";

type Payload = {
  event: LearnerEvent;
  projectInstanceId?: string | null;
  props?: Record<string, unknown>;
  campaign?: Record<string, string>;
};

/**
 * Records one step of the learner's journey. Deliberately forgiving: a
 * tracking failure must never break the screen the learner is on, so the
 * handler swallows write errors and reports `{ ok: false }` instead.
 */
export const recordLearnerEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Payload) => {
    if (!input || typeof input.event !== "string") throw new Error("event required");
    if (!LEARNER_EVENTS.includes(input.event)) throw new Error("unknown event");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const campaign = data.campaign && Object.keys(data.campaign).length ? data.campaign : null;

    try {
      await supabase.from("learner_events").insert({
        user_id: userId,
        event: data.event,
        project_instance_id: data.projectInstanceId ?? null,
        props: (data.props ?? {}) as never,
        campaign: (campaign ?? {}) as never,
      });

      // First-touch attribution: stamp the campaign onto the profile once, so
      // the funnel can be split paid vs organic without re-reading events.
      if (campaign) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("campaign")
          .eq("id", userId)
          .maybeSingle();
        const existing = (profile?.campaign ?? {}) as Record<string, unknown>;
        if (!existing || Object.keys(existing).length === 0) {
          await supabase
            .from("profiles")
            .update({ campaign: campaign as never })
            .eq("id", userId);
        }
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });