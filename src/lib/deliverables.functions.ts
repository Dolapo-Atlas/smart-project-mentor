import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Deliverable = {
  id: string;
  artifact_type: string;
  title: string;
  status: string;
  version: number;
  is_latest: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  reviewer_name: string | null;
  project_name: string | null;
  content_markdown: string | null;
  payload: Record<string, string>;
  review_result: {
    score?: number;
    decision?: string;
    comment?: string;
    required_changes?: string[];
    strengths?: string[];
  } | null;
};

export const listDeliverables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Deliverable[]> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();
    let q = supabase
      .from("project_artifacts")
      .select(
        "id,artifact_type,title,status,version,is_latest,submitted_at,approved_at,reviewer_name,project_name,content_markdown,payload,review_result",
      )
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false });
    if (profile?.current_project_instance_id) {
      q = q.eq("project_instance_id", profile.current_project_instance_id);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Deliverable[];
  });

export const getDeliverable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<Deliverable | null> => {
    const { data: row, error } = await context.supabase
      .from("project_artifacts")
      .select(
        "id,artifact_type,title,status,version,is_latest,submitted_at,approved_at,reviewer_name,project_name,content_markdown,payload,review_result",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return (row ?? null) as unknown as Deliverable | null;
  });