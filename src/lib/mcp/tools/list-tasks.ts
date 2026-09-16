import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List project tasks",
  description:
    "List the learner's simulation tasks, optionally filtered to one project and/or one status (todo, in_progress, submitted, done).",
  inputSchema: {
    project_instance_id: z.string().optional().describe("Limit to one project instance id."),
    status: z.string().optional().describe("Limit to a single task status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_instance_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, category, due_at, submitted_at, completed_at, project_instance_id",
      )
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(200);
    if (project_instance_id) query = query.eq("project_instance_id", project_instance_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    if (!data || data.length === 0) return textResult("No matching tasks.");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      structuredContent: { tasks: data },
    };
  },
});
