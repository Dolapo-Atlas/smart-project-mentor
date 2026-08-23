/**
 * "The 18:00 Friday Crisis" — a 3-minute public mini-simulation.
 *
 * Everything here is deterministic content + scoring: no LLM calls, no server
 * round-trips, so the experience loads and resolves instantly on a phone.
 */

export type D1 = "A" | "B" | "C";
export type D2 = "A" | "B" | "C";

export const CHALLENGE_PATH = "/challenge/friday-crisis";
export const CHALLENGE_URL = `https://atlassim.co${CHALLENGE_PATH}`;

export const DECISION_ONE: { id: D1; text: string }[] = [
  {
    id: "A",
    text: "Understood. I’ll get the team onto it this weekend and we’ll have it ready for Tuesday.",
  },
  {
    id: "B",
    text: "We can’t do that. The scope is already agreed and Tuesday’s release will proceed as planned.",
  },
  {
    id: "C",
    text: "I understand this is important to the client. Before I commit the team, I need to assess the impact on scope, timeline, resources and delivery risk. I’ll come back to you with the available options.",
  },
];

export const DECISION_TWO: { id: D2; text: string }[] = [
  {
    id: "A",
    text: "We should keep Tuesday’s release unchanged and discuss live chat after launch.",
  },
  {
    id: "B",
    text: "We can’t responsibly commit full live chat for Tuesday. We can include the Contact Us option in Tuesday’s release and assess full live chat as a controlled change for a later release.",
  },
  {
    id: "C",
    text: "I’ll escalate this to the project sponsor and ask them to decide whether we should accept the additional risk.",
  },
];

export type ReplyFeedback = {
  heading: string;
  replyFrom: string;
  replyRole: string;
  replyText: string;
  points: { positive: boolean; text: string }[];
};

export const DECISION_ONE_FEEDBACK: Record<D1, ReplyFeedback> = {
  A: {
    heading: "You committed before assessing the impact.",
    replyFrom: "Priya Menon",
    replyRole: "Engineering Lead",
    replyText:
      "We haven’t estimated this. Live chat touches authentication, notifications and support workflows. I can’t confirm Tuesday without assessing it.",
    points: [
      { positive: true, text: "Responded quickly to the stakeholder" },
      { positive: false, text: "Committed before assessing feasibility" },
      { positive: false, text: "Introduced uncontrolled scope" },
      { positive: false, text: "Created potential schedule, quality and resource risk" },
    ],
  },
  B: {
    heading: "You protected the existing scope — but shut the conversation down.",
    replyFrom: "Dave Okonjo",
    replyRole: "VP of Sales",
    replyText: "This is coming directly from the client. I need options, not just a no.",
    points: [
      { positive: true, text: "Protected the existing commitment" },
      { positive: true, text: "Avoided making an unsupported promise" },
      { positive: false, text: "Didn’t explore the business need" },
      { positive: false, text: "Offered no alternative or path forward" },
    ],
  },
  C: {
    heading: "You avoided committing before understanding the impact.",
    replyFrom: "Dave Okonjo",
    replyRole: "VP of Sales",
    replyText:
      "I understand, but I need something tonight. The client is expecting an answer. What can we offer them?",
    points: [
      { positive: true, text: "Acknowledged stakeholder priority" },
      { positive: true, text: "Avoided premature commitment" },
      { positive: true, text: "Protected the team from an unassessed change" },
      { positive: true, text: "Created space to evaluate trade-offs" },
    ],
  },
};

export const DECISION_TWO_FEEDBACK: Record<D2, ReplyFeedback> = {
  A: {
    heading: "You protected delivery, but left the need unanswered.",
    replyFrom: "Dave Okonjo",
    replyRole: "VP of Sales",
    replyText:
      "So I go back to the client with nothing? There was something we could have offered them.",
    points: [
      { positive: true, text: "Protected the committed Tuesday release" },
      { positive: true, text: "Avoided unassessed delivery risk" },
      { positive: false, text: "Didn’t address the stakeholder’s underlying need" },
      { positive: false, text: "Left a viable, low-risk alternative on the table" },
    ],
  },
  B: {
    heading: "You protected the release and answered the need.",
    replyFrom: "Dave Okonjo",
    replyRole: "VP of Sales",
    replyText:
      "That gives me something I can take back to the client tonight. Let’s proceed with that option and review live chat properly.",
    points: [
      { positive: true, text: "Protected the committed release" },
      { positive: true, text: "Met part of the client’s immediate need" },
      { positive: true, text: "Routed full live chat through controlled change" },
      { positive: true, text: "Gave the stakeholder a decision they could act on" },
    ],
  },
  C: {
    heading: "You escalated — without a recommendation.",
    replyFrom: "Amara Bello",
    replyRole: "Project Sponsor",
    replyText: "What do you recommend?",
    points: [
      { positive: true, text: "Recognised the decision carried real risk" },
      { positive: true, text: "Involved the right level of authority" },
      { positive: false, text: "Transferred the decision instead of framing it" },
      { positive: false, text: "Escalated without context, options or a recommendation" },
    ],
  },
};

export type Scores = {
  stakeholder: number;
  change: number;
  delivery: number;
  communication: number;
  total: number;
};

export const DIMENSIONS = [
  { key: "stakeholder", label: "Stakeholder Judgement" },
  { key: "change", label: "Change & Scope Judgement" },
  { key: "delivery", label: "Delivery Judgement" },
  { key: "communication", label: "Communication" },
] as const;

/** [stakeholder, change, delivery, communication] out of 25 each. */
const MATRIX: Record<string, [number, number, number, number]> = {
  CB: [24, 25, 24, 25],
  CA: [20, 19, 21, 18],
  CC: [18, 17, 16, 19],
  BB: [18, 20, 19, 15],
  BA: [12, 16, 16, 10],
  BC: [13, 13, 14, 11],
  AB: [16, 15, 15, 16],
  AC: [12, 11, 10, 12],
  AA: [11, 10, 12, 10],
};

export function scoreChallenge(d1: D1, d2: D2): Scores {
  const [stakeholder, change, delivery, communication] = MATRIX[`${d1}${d2}`] ?? [0, 0, 0, 0];
  return {
    stakeholder,
    change,
    delivery,
    communication,
    total: stakeholder + change + delivery + communication,
  };
}

export type Tier = {
  label: string;
  blurb: string;
};

export function tierFor(total: number): Tier {
  if (total >= 85)
    return {
      label: "Strong Project Judgement",
      blurb:
        "You held the line on delivery while still giving the business something real to work with.",
    };
  if (total >= 70)
    return {
      label: "Developing Project Judgement",
      blurb: "Your instincts are sound. The gap is in how you convert pressure into options.",
    };
  if (total >= 50)
    return {
      label: "Project Judgement Under Pressure",
      blurb: "You reacted to the pressure more than you managed it. That is a learnable skill.",
    };
  return {
    label: "The Pressure Got You",
    blurb: "Late-notice requests are where projects quietly break. This is exactly what to practise.",
  };
}

export function strongestDimension(s: Scores) {
  return DIMENSIONS.reduce(
    (best, d) => (s[d.key] > s[best.key] ? d : best),
    DIMENSIONS[0] as (typeof DIMENSIONS)[number],
  );
}

export type Verdict = { strength: string; watchOut: string; takeaway: string };

const VERDICTS: Record<string, Verdict> = {
  CB: {
    strength:
      "You refused to commit the team to work nobody had assessed, then came back with a controlled option instead of a blocker. That is how experienced coordinators handle late scope.",
    watchOut:
      "Verbal agreement is not a change record. If this option never gets written up, tested and re-baselined, Tuesday still bites you.",
    takeaway:
      "Strong project judgement is not saying no. It is refusing to guess, then returning fast with options a stakeholder can act on.",
  },
  CA: {
    strength:
      "You bought time before committing, so the team was never exposed to an unestimated change.",
    watchOut:
      "Once the assessment showed a safe partial option, holding the release unchanged left Dave with nothing to take to the client.",
    takeaway:
      "Assessment is only half the job. The value lands when you translate the assessment into an offer.",
  },
  CC: {
    strength:
      "You paused a risky commitment and recognised the decision belonged above your authority.",
    watchOut:
      "You escalated the problem rather than a recommendation, so the sponsor handed it straight back to you.",
    takeaway: "Escalate with context, options and a recommendation — never with an open question.",
  },
  BB: {
    strength:
      "You never made a promise the team couldn’t keep, and you landed on the option that protected Tuesday while meeting part of the need.",
    watchOut:
      "Your first response closed the conversation. Stakeholders who feel blocked route around you next time.",
    takeaway: "Protect the plan, but keep the relationship open. The first reply sets the tone.",
  },
  BA: {
    strength: "You defended the agreed scope and kept the committed release intact.",
    watchOut:
      "Twice you answered a business need with a refusal, even after a low-risk alternative existed.",
    takeaway:
      "A defensible no still needs a path forward, or it reads as unwillingness rather than control.",
  },
  BC: {
    strength: "You avoided an unsupported commitment and sought the right authority.",
    watchOut:
      "You went from a flat refusal to handing the decision upward, without ever exploring the middle ground.",
    takeaway:
      "Most late-notice requests have a smaller, safer version. Find it before you refuse or escalate.",
  },
  AB: {
    strength:
      "You recovered well. Once engineering pushed back you chose the controlled, partial option rather than defending your promise.",
    watchOut:
      "The original commitment was made before anyone had estimated the work — and your team, not you, absorbed that risk.",
    takeaway:
      "Never commit a date on behalf of people who haven’t assessed the work. Recovery costs more than a pause.",
  },
  AC: {
    strength: "You were responsive to the stakeholder and eventually involved the sponsor.",
    watchOut:
      "You committed first and escalated later — the sponsor inherited a promise already made in your name.",
    takeaway:
      "Escalation cannot undo a commitment. Assess, then commit, and escalate with a recommendation.",
  },
  AA: {
    strength: "You engaged the request quickly instead of ignoring it.",
    watchOut:
      "You promised the weekend, then reversed to no change — leaving Dave, the client and the team all misaligned.",
    takeaway:
      "Speed without assessment is not responsiveness. Buy an hour, get an estimate, then answer.",
  },
};

export function verdictFor(d1: D1, d2: D2): Verdict {
  return VERDICTS[`${d1}${d2}`] ?? VERDICTS['CB']!;
}

export function linkedInText(total: number, tier: string) {
  return `I scored ${total}/100 on Atlas’s “The 18:00 Friday Crisis” — ${tier}.

18:00 Friday. Launch is Tuesday. Sales wants live chat added over the weekend. One decision, three minutes.

Can you beat my score? ${CHALLENGE_URL}`;
}
