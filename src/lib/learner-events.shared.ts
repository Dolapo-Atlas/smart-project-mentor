/**
 * The steps of a learner's first session, in the order they should happen.
 * Shared by the client tracker, the server writer and the admin funnel so
 * all three agree on spelling and order.
 */
export const LEARNER_EVENTS = [
  "signed_in",
  "onboarding_started",
  "role_selected",
  "orientation_completed",
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

/**
 * Additional in-app events that are recorded for analytics but are NOT part
 * of the first-session funnel (they can happen many times, in any order).
 * Kept separate so the admin funnel ordering stays untouched.
 */
export const SIDE_EVENTS = [
  "stakeholder_workspace_opened",
  "stakeholder_profile_opened",
  "contact_stakeholder_clicked",
  "stakeholder_request_started",
  "stakeholder_request_sent",
  "stakeholder_response_received",
] as const;

export type SideEvent = (typeof SIDE_EVENTS)[number];

/** Any event the client tracker may send. */
export type TrackedEvent = LearnerEvent | SideEvent;

/** Human labels for the admin funnel. */
export const LEARNER_EVENT_LABELS: Record<LearnerEvent, string> = {
  signed_in: "Signed in",
  onboarding_started: "Opened onboarding",
  role_selected: "Chose a role",
  orientation_completed: "Finished orientation",
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
  subscription_activated: "Unlocked full access",
};

/**
 * Events that should only ever count once per learner. Repeats are dropped
 * client-side so a refresh cannot inflate the funnel.
 */
export const ONCE_PER_LEARNER: readonly LearnerEvent[] = [
  "onboarding_started",
  "role_selected",
  "orientation_completed",
  "project_created",
  "brief_opened",
  "brief_closed",
  "first_email_prompt_shown",
  "inbox_opened",
  "first_reply_sent",
  "first_task_completed",
  "unlock_screen_shown",
];