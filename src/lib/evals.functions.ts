import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";
function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/**
 * Golden cases. Each one runs a single AI call, then a separate "judge" call
 * scores the response against the expected behaviour on a 1-5 rubric. A case
 * passes when score >= 4.
 */
type EvalCase = {
  id: string;
  category: "mentor" | "stakeholder" | "domain-guard";
  prompt: string;
  expected: string; // what a good answer must do/avoid
  /** Build the AI response under test. */
  run: () => Promise<string>;
};

const PROJECT_CONTEXT = `Project: Digital Care Records (DCR) rollout for a UK care-home group.
Phase: Execution. Sponsor: COO. Vendor: Caremarker. End users: care home staff.`;

function mentorRun(question: string, area: string, what: string) {
  return async () => {
    const { text } = await generateText({
      model: getModel(),
      prompt: `Learner is on the "${area}" screen of Atlas. ${PROJECT_CONTEXT}
Screen purpose: ${what}

The learner asks: ${question}

Answer as a calm, senior PM mentor. 4-6 sentences max. Tie the answer to the
current screen and project context where relevant. No bullet headers.`,
    });
    return text.trim();
  };
}

function stakeholderReplyRun(stakeholderRole: string, learnerEmail: string) {
  return async () => {
    const { text } = await generateText({
      model: getModel(),
      prompt: `${PROJECT_CONTEXT}

You are the ${stakeholderRole} on this project. Reply to the project coordinator's
email below in 3-5 sentences, in character. Stay in the DCR domain; never mention
CRM, e-commerce, or unrelated systems.

Coordinator email:
"""${learnerEmail}"""`,
    });
    return text.trim();
  };
}

const CASES: EvalCase[] = [
  {
    id: "mentor-charter-is-initiation",
    category: "mentor",
    prompt: "Is drafting the project charter a change request?",
    expected:
      "Must say NO. The charter is an Initiation document that establishes the project. A change request only exists once a baseline has been set.",
    run: mentorRun(
      "Is drafting the project charter a change request?",
      "Tasks",
      "Pick the next task and submit it.",
    ),
  },
  {
    id: "mentor-rag-amber",
    category: "mentor",
    prompt: "When should I set Schedule RAG to Amber instead of Red?",
    expected:
      "Amber = trending off plan but recoverable with current team. Red = will miss the date without sponsor intervention. Must reference recoverability.",
    run: mentorRun(
      "When should I set Schedule RAG to Amber instead of Red?",
      "Project Health (RAG)",
      "Set Overall, Scope, Schedule, Budget RAG with rationale.",
    ),
  },
  {
    id: "mentor-frontline-pushback",
    category: "mentor",
    prompt: "Care home managers say DCR will slow them down. What do I do first?",
    expected:
      "Must propose listening / discovery (visit, shadow, focus group) before defending the system. Should mention stakeholder sentiment, not just training.",
    run: mentorRun(
      "Care home managers say DCR will slow them down. What do I do first?",
      "Stakeholders",
      "Check sentiment and recover relationships.",
    ),
  },
  {
    id: "stakeholder-cco-clinical-tone",
    category: "stakeholder",
    prompt: "CCO reply to a request for clinical sign-off of DCR templates.",
    expected:
      "Must sound like a Chief Clinical Officer: references patient safety, clinical governance, audit, or staff competence. Must NOT agree to sign off unconditionally — should ask for evidence or pilot data.",
    run: stakeholderReplyRun(
      "Chief Clinical Officer (CCO)",
      "Hi, please can you sign off the DCR clinical templates this week so we can start the pilot? Thanks.",
    ),
  },
  {
    id: "stakeholder-vendor-scope-push",
    category: "stakeholder",
    prompt: "Vendor replies to a request to absorb extra integration work.",
    expected:
      "Must push back politely on scope, reference contract / change control / cost, and propose a CR rather than silently agreeing. Tone: account manager, not engineer.",
    run: stakeholderReplyRun(
      "Caremarker vendor account manager",
      "Can you also include the integration with our existing rota system in the current SOW? It looks small.",
    ),
  },
  {
    id: "domain-guard-no-crm",
    category: "domain-guard",
    prompt: "Stakeholder briefing about the DCR rollout — must NOT mention CRM.",
    expected:
      "Response must stay in the DCR / care-records domain. Must NOT mention CRM, Salesforce, e-commerce, retail, or unrelated industries.",
    run: async () => {
      const { text } = await generateText({
        model: getModel(),
        prompt: `${PROJECT_CONTEXT}
Write a 4-sentence stakeholder briefing summarising progress this week.
Stay strictly in the care records / DCR domain.`,
      });
      return text.trim();
    },
  },
];

const JudgeSchema = z.object({
  score: z.number().int().min(1).max(5),
  notes: z.string().max(400),
});

async function judge(c: EvalCase, response: string) {
  const { object } = await generateObject({
    model: getModel(),
    schema: JudgeSchema,
    prompt: `You are an evaluator. Score the AI response on a 1-5 rubric:
5 = fully meets the expected behaviour, no issues.
4 = meets the core behaviour with minor gaps.
3 = partial — touches the point but misses key element.
2 = mostly wrong direction.
1 = wrong, off-topic, or violates expected behaviour.

Expected behaviour:
${c.expected}

Prompt to the AI:
${c.prompt}

AI response:
"""${response}"""

Return score and 1-2 sentence notes explaining the score.`,
  });
  return object;
}

export const listEvalRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_eval_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });

export const listEvalResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ai_eval_results")
      .select("*")
      .eq("run_id", data.runId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const runEvalSuite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: run, error: runErr } = await supabase
      .from("ai_eval_runs")
      .insert({ user_id: userId, suite: "core", total: CASES.length, passed: 0, avg_score: 0 })
      .select("*")
      .single();
    if (runErr) throw runErr;

    let passed = 0;
    let sum = 0;
    const rows: any[] = [];
    for (const c of CASES) {
      let response = "";
      let score = 1;
      let notes = "";
      try {
        response = await c.run();
        const j = await judge(c, response);
        score = j.score;
        notes = j.notes;
      } catch (e: any) {
        notes = `Error: ${e?.message ?? String(e)}`;
        response = response || "(no response)";
      }
      const ok = score >= 4;
      if (ok) passed += 1;
      sum += score;
      rows.push({
        run_id: run.id,
        user_id: userId,
        case_id: c.id,
        category: c.category,
        prompt: c.prompt,
        response,
        expected: c.expected,
        score,
        passed: ok,
        judge_notes: notes,
      });
    }

    await supabase.from("ai_eval_results").insert(rows);
    const avg = +(sum / CASES.length).toFixed(2);
    await supabase
      .from("ai_eval_runs")
      .update({ passed, avg_score: avg })
      .eq("id", run.id);

    return { runId: run.id, total: CASES.length, passed, avgScore: avg };
  });