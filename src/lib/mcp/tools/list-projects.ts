import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "List my simulation projects",
  description:
    "List the signed-in learner's Atlas simulation projects with phase, status and progress.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("project_instances")
      .select(
        "id, display_name, template_id, current_phase, status, progress_pct, started_at, completed_at, last_active_at",
      )
      .order("last_active_at", { ascending: false });
    if (error) return errorResult(error.message);
    if (!data || data.length === 0) return textResult("No simulation projects yet.");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      structuredContent: { projects: data },
    };
  },
});
