import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-only helper (no module-scope side effects). Safe to import from other
// *.functions.ts files. Marks a chapter complete by slug for the user's active
// project instance. Idempotent and swallows errors so it never breaks the
// originating action.
export async function tickChapterBySlug(
  supabase: any,
  userId: string,
  slug: string,
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();
    const instanceId = (profile as any)?.current_project_instance_id;
    if (!instanceId) return;
    const { data: inst } = await supabase
      .from("project_instances")
      .select("template_id")
      .eq("id", instanceId)
      .maybeSingle();
    const templateId = (inst as any)?.template_id;
    if (!templateId) return;
    const { data: ch } = await supabase
      .from("project_chapters")
      .select("id")
      .eq("template_id", templateId)
      .eq("slug", slug)
      .maybeSingle();
    const chapterId = (ch as any)?.id;
    if (!chapterId) return;
    // Difficulty gate: a chapter only ticks complete when the user has
    // *also* closed enough tasks. The signal action (e.g. replying to the
    // sponsor) opens the door; doing the work walks them through it.
    // Threshold scales with chapter number: ch 1 = 2 done, ch 2 = 4 done,
    // ch 3 = 6 done, ... ch N = N*2 done tasks (status done or approved).
    const { data: full } = await supabase
      .from("project_chapters")
      .select("id,chapter_number")
      .eq("template_id", templateId)
      .eq("slug", slug)
      .maybeSingle();
    const chapterNumber: number = (full as any)?.chapter_number ?? 1;
    const requiredDone = Math.max(2, chapterNumber * 2);

    const { count: doneCount } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("project_instance_id", instanceId)
      .in("status", ["done", "approved"]);
    const completedTasks = doneCount ?? 0;

    if (completedTasks < requiredDone) {
      // Park the signal as "active + pending" so the UI can hint at it,
      // but do NOT mark the chapter complete yet.
      await supabase.from("chapter_progress").upsert(
        {
          user_id: userId,
          project_instance_id: instanceId,
          chapter_id: chapterId,
          status: "active",
          started_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_instance_id,chapter_id" },
      );
      return;
    }

    await supabase.from("chapter_progress").upsert(
      {
        user_id: userId,
        project_instance_id: instanceId,
        chapter_id: chapterId,
        status: "complete",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_instance_id,chapter_id" },
    );
  } catch (e) {
    console.error("tickChapterBySlug failed", slug, e);
  }
}

export type ChapterRow = {
  id: string;
  chapter_number: number;
  slug: string;
  title: string;
  phase: string;
  summary: string;
  objective: string;
  completion_hint: string | null;
  status: "locked" | "active" | "complete";
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
};

export type ChaptersPayload = {
  chapters: ChapterRow[];
  activeNumber: number | null;
  completedCount: number;
  totalCount: number;
};

// Returns the ordered chapter list for the user's active project, hydrated with
// their progress rows. Chapter 1 is always at least "active"; subsequent chapters
// unlock when the prior one is marked complete.
export const listChapters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChaptersPayload> => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();

    const instanceId = (profile as any)?.current_project_instance_id;
    if (!instanceId) {
      return { chapters: [], activeNumber: null, completedCount: 0, totalCount: 0 };
    }

    const { data: instance } = await supabase
      .from("project_instances")
      .select("template_id")
      .eq("id", instanceId)
      .maybeSingle();

    const templateId = (instance as any)?.template_id;
    if (!templateId) {
      return { chapters: [], activeNumber: null, completedCount: 0, totalCount: 0 };
    }

    const [{ data: defs }, { data: progress }] = await Promise.all([
      supabase
        .from("project_chapters")
        .select("*")
        .eq("template_id", templateId)
        .order("chapter_number", { ascending: true }),
      supabase
        .from("chapter_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("project_instance_id", instanceId),
    ]);

    const progressByChapter = new Map<string, any>();
    (progress ?? []).forEach((p: any) => progressByChapter.set(p.chapter_id, p));

    let activeFound = false;
    const chapters: ChapterRow[] = (defs ?? []).map((d: any) => {
      const p = progressByChapter.get(d.id);
      let status: ChapterRow["status"] = "locked";
      if (p?.status === "complete") {
        status = "complete";
      } else if (p?.status === "active" || (!activeFound && d.chapter_number === 1)) {
        status = "active";
      }
      if (status === "active") activeFound = true;
      return {
        id: d.id,
        chapter_number: d.chapter_number,
        slug: d.slug,
        title: d.title,
        phase: d.phase,
        summary: d.summary,
        objective: d.objective,
        completion_hint: d.completion_hint,
        status,
        score: p?.score ?? null,
        started_at: p?.started_at ?? null,
        completed_at: p?.completed_at ?? null,
      };
    });

    // Promote the chapter right after the highest completed one to "active"
    // when no explicit active row exists yet.
    const lastCompleteIdx = [...chapters].reverse().findIndex((c) => c.status === "complete");
    if (lastCompleteIdx !== -1) {
      const realIdx = chapters.length - 1 - lastCompleteIdx;
      const next = chapters[realIdx + 1];
      if (next && next.status === "locked") next.status = "active";
    }

    const activeNumber = chapters.find((c) => c.status === "active")?.chapter_number ?? null;
    const completedCount = chapters.filter((c) => c.status === "complete").length;

    return {
      chapters,
      activeNumber,
      completedCount,
      totalCount: chapters.length,
    };
  });

// Mark a chapter complete and unlock the next one. Idempotent.
export const completeChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chapterId: string; score?: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_project_instance_id")
      .eq("id", userId)
      .maybeSingle();

    const instanceId = (profile as any)?.current_project_instance_id;
    if (!instanceId) throw new Error("No active project");

    const now = new Date().toISOString();
    await supabase
      .from("chapter_progress")
      .upsert(
        {
          user_id: userId,
          project_instance_id: instanceId,
          chapter_id: data.chapterId,
          status: "complete",
          completed_at: now,
          score: data.score ?? null,
        },
        { onConflict: "user_id,project_instance_id,chapter_id" },
      );

    return { ok: true };
  });