/**
 * Central registry of "senior PM whispering in your ear" insights.
 *
 * Each entry maps an action or state to two short pieces of copy:
 *   - rationale: WHY the action matters (used in RationaleChip under buttons)
 *   - toast: WHAT just happened in PM terms (used in insightToast after success)
 *
 * These are guidance, not answers. Keep them one sentence, plain English,
 * pitched as if a seasoned PM was mentoring the user in a corridor.
 */

export type InsightKey =
  // Task actions
  | "task.submit"
  | "task.dismiss"
  | "task.escalate"
  | "task.resume"
  | "task.verify_resolution"
  | "task.approve"
  // Time / governance
  | "time.advance"
  | "time.advance.blocked"
  | "time.steerco"
  | "time.golive"
  // Project state
  | "project.pause"
  // Delegation
  | "delegate.ask_pm"
  | "delegate.assign_lead"
  | "delegate.escalate_sponsor"
  | "delegate.meeting"
  // Comms & governance
  | "comms.reply"
  | "raid.log"
  | "raid.escalate"
  | "change.raise"
  | "change.approve"
  | "change.reject"
  // Learning
  | "reflection.save";

export const PM_INSIGHTS: Record<InsightKey, { rationale: string; toast: string }> = {
  "task.submit": {
    rationale:
      "Submitting is a governance signal — you're saying it's good enough for review, not perfect.",
    toast:
      "Submitted for review. In real projects, this is where a reviewer catches gaps you're too close to see.",
  },
  "task.dismiss": {
    rationale:
      "Dismissing is a scope decision. Note the reason so future-you (and auditors) can trace why.",
    toast:
      "Task dismissed. Recording a reason is what turns a judgement call into a defensible decision.",
  },
  "task.escalate": {
    rationale:
      "Escalation is a governance signal, not a failure — you're pulling in authority to unblock, not handing over ownership.",
    toast:
      "Escalated. The owner picks up the block, but the outcome still sits with you — expect to verify their fix.",
  },
  "task.resume": {
    rationale:
      "Resuming closes the loop between 'they came back to me' and 'it's active work again'.",
    toast:
      "Task resumed. Real PMs pick work back up the moment a blocker clears — momentum matters.",
  },
  "task.verify_resolution": {
    rationale:
      "You still own the outcome. Verifying keeps the sponsor's trust in you, not in whoever unblocked you.",
    toast:
      "Resolution verified. Escalation isn't hand-off — checking the fit is what protects the project.",
  },
  "task.approve": {
    rationale:
      "Approval is a quality gate. Once you sign it off, it's on the record — reviewers assume you meant it.",
    toast:
      "Approved. The artifact is now part of your project record and can be referenced by stakeholders.",
  },

  "time.advance": {
    rationale:
      "Time moves the world forward — stakeholders act, sentiment shifts, and unresolved items get louder.",
    toast:
      "Time advanced. Watch the inbox — the simulation just processed reactions to what you left open.",
  },
  "time.advance.blocked": {
    rationale:
      "You can force time forward, but unresolved items don't disappear — they compound into risk.",
    toast:
      "Advanced with open blockers. Expect a health or sentiment hit — real projects punish this the same way.",
  },
  "time.steerco": {
    rationale:
      "Steering Committees judge readiness on evidence — open RAID items, unread inbox and unsigned docs all show up.",
    toast:
      "SteerCo ran. Sponsors form their impression of you from what was visible on the board today.",
  },
  "time.golive": {
    rationale:
      "Go-Live is a one-way door. Anything unresolved today becomes a Day-1 issue for operations.",
    toast:
      "Go-Live triggered. From now on, incidents count against the project — closure evidence matters most.",
  },

  "project.pause": {
    rationale:
      "Pausing preserves state so you can resume later. In real life, paused projects still accrue risk — don't leave it too long.",
    toast:
      "Project paused. Your progress, drafts and simulation state are saved — resume from the Projects screen.",
  },

  "delegate.ask_pm": {
    rationale:
      "Asking the PM is fine occasionally — over-use it and they'll quietly stop covering for you.",
    toast:
      "Handed to the PM. Delegation is a trust economy — spend it on the things that genuinely aren't yours.",
  },
  "delegate.assign_lead": {
    rationale:
      "Assigning the right specialist is usually the best move for technical or governance questions.",
    toast:
      "Assigned to the specialist. Getting the right owner is 80% of resolving a thread cleanly.",
  },
  "delegate.escalate_sponsor": {
    rationale:
      "Reserve sponsor escalation for budget, scope or governance — they lose patience with trivial escalations.",
    toast:
      "Escalated to the Sponsor. Expect them to test whether you'd already exhausted normal channels.",
  },
  "delegate.meeting": {
    rationale:
      "A short review meeting is often faster than three days of email — but send minutes afterwards to close the loop.",
    toast:
      "Meeting drafted. Decisions made verbally only count if the minutes go out inside 24 hours.",
  },

  "comms.reply": {
    rationale:
      "Acknowledge first, defend second. Stakeholders remember the tone more than the detail.",
    toast:
      "Reply sent. Sentiment moves on tone — you'll see it reflected in the stakeholder register.",
  },
  "raid.log": {
    rationale:
      "A risk without an owner and a mitigation is just a worry. Name both before you close the entry.",
    toast:
      "Logged. RAID items only work if they're revisited — expect this back on your review list.",
  },
  "raid.escalate": {
    rationale:
      "Escalating a risk is a decision to make it visible — sponsors expect a recommendation, not just a warning.",
    toast:
      "Risk escalated. You've moved it from your log onto the sponsor's radar — they'll want an ask next.",
  },
  "change.raise": {
    rationale:
      "A change request quantifies impact so the sponsor decides — never raise one without cost, time and a recommendation.",
    toast:
      "Change raised. This is now on the governance record — even if it's rejected, the trail matters.",
  },
  "change.approve": {
    rationale:
      "Approving a change resets the baseline. Update the plan, budget and stakeholders so nothing drifts silently.",
    toast:
      "Change approved. The baseline just moved — cascade it to the schedule, budget and status report.",
  },
  "change.reject": {
    rationale:
      "Rejecting a change is a governance decision too — record the reason so the requester feels heard.",
    toast:
      "Change rejected. Requesters accept 'no' when they see the reasoning — don't skip that step.",
  },

  "reflection.save": {
    rationale:
      "Sixty seconds of reflection now beats an hour trying to remember why you did something six weeks later.",
    toast:
      "Reflection saved. This is the exact language you'll pull out in an interview or a lessons-learned review.",
  },
};

export function getInsight(key: InsightKey) {
  return PM_INSIGHTS[key];
}