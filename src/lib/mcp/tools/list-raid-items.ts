import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_raid_items",
  title: "List RAID log entries",
  description:
    "List the learner's RAID log entries (risks, assumptions, issues, dependencies), optionally filtered to one project.",
  inputSchema: {
    project_instance_id: z.string().optional().describe("Limit to one project instance id."),
    kind: z.string().optional().describe("Limit to one RAID kind, e.g. risk or issue."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_instance_id, kind }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("raid_items")
      .select(
        "id, kind, title, description, status, severity, likelihood, priority, owner, mitigation, due_date, project_instance_id",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (project_instance_id) query = query.eq("project_instance_id", project_instance_id);
    if (kind) query = query.eq("kind", kind as never);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    if (!data || data.length === 0) return textResult("No matching RAID entries.");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      structuredContent: { raid_items: data },
    };
  },
});
