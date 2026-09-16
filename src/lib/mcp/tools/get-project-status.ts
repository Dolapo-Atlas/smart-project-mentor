import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, errorResult } from "../supabase";

export default defineTool({
  name: "get_project_status",
  title: "Get project status",
  description:
    "Get the current day, phase, health, progress and next milestone for one of the learner's simulation projects.",
  inputSchema: {
    project_instance_id: z
      .string()
      .describe("The project instance id, as returned by list_projects."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_instance_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data: instance, error: instanceError } = await supabase
      .from("project_instances")
      .select("id, display_name, template_id, current_phase, status, progress_pct, completed_at")
      .eq("id", project_instance_id)
      .maybeSingle();
    if (instanceError) return errorResult(instanceError.message);
    if (!instance) return errorResult("Project not found for this account.");

    const { data: state } = await supabase
      .from("simulation_state")
      .select(
        "project_name, company, phase, chapter, current_day, current_week, health, progress, reputation, next_milestone",
      )
      .eq("project_instance_id", project_instance_id)
      .maybeSingle();

    const summary = { project: instance, simulation: state ?? null };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
