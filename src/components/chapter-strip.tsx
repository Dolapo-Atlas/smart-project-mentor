import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChapters, type ChapterRow } from "@/lib/chapters.functions";
import { Check, Lock, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 12-chapter progress strip. Pinned to the top of Home so the user always
// knows where they are in the narrative arc and what the next beat is.
export function ChapterStrip() {
  const fetchChapters = useServerFn(listChapters);
  const { data } = useQuery({
    queryKey: ["chapters"],
    queryFn: () => fetchChapters(),
  });

  if (!data || data.totalCount === 0) return null;

  const { chapters, activeNumber, completedCount, totalCount } = data;
  const active = chapters.find((c) => c.chapter_number === activeNumber) ?? null;
  const percent = Math.round((completedCount / totalCount) * 100);

  return (
    <section className="rounded-lg border border-border bg-card/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Story arc · {completedCount} of {totalCount} complete
          </div>
          <div className="mt-1 font-display text-lg font-medium">
            {active
              ? `Chapter ${active.chapter_number}: ${active.title}`
              : completedCount === totalCount
              ? "All chapters complete"
              : "Pick up the next chapter"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{percent}% through the arc</div>
      </div>

      {/* Beads — one dot per chapter, color-coded by state */}
      <TooltipProvider delayDuration={120}>
        <ol className="mt-4 flex w-full items-center gap-1.5">
          {chapters.map((c) => (
            <Tooltip key={c.id}>
              <TooltipTrigger asChild>
                <li className="flex flex-1 cursor-default flex-col items-center gap-1">
                  <ChapterBead chapter={c} />
                  <span
                    className={`hidden text-[10px] md:block ${
                      c.status === "active"
                        ? "font-medium text-foreground"
                        : c.status === "complete"
                        ? "text-foreground/60"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {c.chapter_number}
                  </span>
                </li>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                <div className="font-medium">
                  Ch. {c.chapter_number} · {c.title}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">
                  {c.phase} · {c.status}
                </div>
                <div className="mt-1 opacity-90">{c.summary}</div>
                {c.status !== "complete" && c.completion_hint ? (
                  <div className="mt-1 italic opacity-80">→ {c.completion_hint}</div>
                ) : null}
              </TooltipContent>
            </Tooltip>
          ))}
        </ol>
      </TooltipProvider>

      {active ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-background/40 p-3 text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Objective
          </div>
          <div className="mt-1">{active.objective}</div>
          {active.completion_hint ? (
            <div className="mt-1 text-xs text-muted-foreground">→ {active.completion_hint}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ChapterBead({ chapter }: { chapter: ChapterRow }) {
  const base =
    "flex h-6 w-full min-w-6 items-center justify-center rounded-full border text-[10px] transition";
  if (chapter.status === "complete") {
    return (
      <span className={`${base} border-primary/60 bg-primary text-primary-foreground`}>
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (chapter.status === "active") {
    return (
      <span
        className={`${base} border-primary bg-primary/15 text-primary shadow-[0_0_0_3px_rgba(0,0,0,0.04)]`}
      >
        <Sparkles className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className={`${base} border-border/60 bg-muted/40 text-muted-foreground`}>
      <Lock className="h-2.5 w-2.5" />
    </span>
  );
}