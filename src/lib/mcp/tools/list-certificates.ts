import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_certificates",
  title: "List my Atlas certificates",
  description:
    "List the signed-in learner's Atlas completion certificates with grade, score and verification code.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("certificates")
      .select(
        "verification_code, recipient_name, programme_name, project_name, simulated_role, grade, overall_score, certificate_status, completion_date, issued_at",
      )
      .order("issued_at", { ascending: false });
    if (error) return errorResult(error.message);
    if (!data || data.length === 0) return textResult("No certificates issued yet.");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      structuredContent: { certificates: data },
    };
  },
});
