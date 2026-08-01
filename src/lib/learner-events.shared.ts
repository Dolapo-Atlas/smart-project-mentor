/**
 * The steps of a learner's first session, in the order they should happen.
 * Shared by the client tracker, the server writer and the admin funnel so
 * all three agree on spelling and order.
 */
export const LEARNER_EVENTS = [
  "signed_in",
  "onboarding_started",
  "role_selected",
  "project_created",
  "brief_opened",
  "brief_closed",
  "first_email_prompt_shown",
  "inbox_opened",
  "first_reply_sent",
  "first_task_completed",
  "day_advanced",
  "unlock_screen_shown",
  "unlock_checkout_started",
  "subscription_activated",
] as const;

export type LearnerEvent = (typeof LEARNER_EVENTS)[number];

/** Human labels for the admin funnel. */
export const LEARNER_EVENT_LABELS: Record<LearnerEvent, string> = {
  signed_in: "Signed in",
  onboarding_started: "Opened onboarding",
  role_selected: "Chose a role",
  project_created: "Started a project",
  brief_opened: "Opened the brief",
  brief_closed: "Finished the brief",
  first_email_prompt_shown: "Saw the email prompt",
  inbox_opened: "Opened the inbox",
  first_reply_sent: "Sent first reply",
  first_task_completed: "Completed first task",
  day_advanced: "Advanced the clock",
  unlock_screen_shown: "Saw the unlock screen",
  unlock_checkout_started: "Started checkout",
  subscription_activated: "Subscribed",
};

/**
 * Events that should only ever count once per learner. Repeats are dropped
 * client-side so a refresh cannot inflate the funnel.
 */
export const ONCE_PER_LEARNER: readonly LearnerEvent[] = [
  "onboarding_started",
  "role_selected",
  "project_created",
  "brief_opened",
  "brief_closed",
  "first_email_prompt_shown",
  "inbox_opened",
  "first_reply_sent",
  "first_task_completed",
  "unlock_screen_shown",
];