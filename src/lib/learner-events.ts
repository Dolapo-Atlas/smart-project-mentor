import { supabase } from "@/integrations/supabase/client";
import { recordLearnerEvent } from "./learner-events.functions";
import { readCampaign, track } from "./landing-analytics";
import {
  LEARNER_EVENTS,
  ONCE_PER_LEARNER,
  type LearnerEvent,
  type TrackedEvent,
} from "./learner-events.shared";

/**
 * Client-side tracker for the in-app journey.
 *
 * Fire-and-forget by design: nothing here is awaited by the UI and every
 * failure is swallowed. Tracking must never block or break a learner's screen.
 */

function seenKey(userId: string, event: TrackedEvent) {
  return `atlas.ev.${userId}.${event}`;
}

function alreadySent(userId: string, event: TrackedEvent) {
  if (!ONCE_PER_LEARNER.includes(event as LearnerEvent)) return false;
  try {
    return window.localStorage.getItem(seenKey(userId, event)) === "1";
  } catch {
    return false;
  }
}

function markSent(userId: string, event: TrackedEvent) {
  if (!ONCE_PER_LEARNER.includes(event as LearnerEvent)) return;
  try {
    window.localStorage.setItem(seenKey(userId, event), "1");
  } catch {
    /* storage unavailable */
  }
}

export function trackLearner(
  event: TrackedEvent,
  options: { projectInstanceId?: string | null; props?: Record<string, unknown> } = {},
) {
  if (typeof window === "undefined") return;

  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      if (alreadySent(userId, event)) return;
      markSent(userId, event);

      // Mirror funnel steps to the ad platforms so campaigns can optimise
      // toward learners who actually start work, not merely sign up.
      if (LEARNER_EVENTS.includes(event as LearnerEvent)) {
        track(event as LearnerEvent, { ...(options.props ?? {}) });
      }

      await recordLearnerEvent({
        data: {
          event,
          projectInstanceId: options.projectInstanceId ?? null,
          props: options.props ?? {},
          campaign: readCampaign(),
        },
      });
    } catch {
      /* tracking is never fatal */
    }
  })();
}