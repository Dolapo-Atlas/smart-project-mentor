import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitReflection } from "@/lib/learning.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const CHIPS = ["What worked", "What I'd change", "Stakeholder insight", "Skill practised", "For interviews"];

/**
 * Post-review reflection: opens after a task is approved so the user captures
 * their own takeaways (not the AI's). Saves into reflection_entries linked to
 * the task, tagged for later browsing in the Learning Journey.
 */
export function ReflectionDialog({
  open,
  onOpenChange,
  task,
  prompt,
  suggestedTags,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: { id: string; title: string } | null;
  prompt: string;
  suggestedTags?: string[];
}) {
  const [answer, setAnswer] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const submitFn = useServerFn(submitReflection);

  useEffect(() => {
    if (open) {
      setAnswer("");
      setTags(suggestedTags ?? []);
    }
  }, [open, suggestedTags]);

  const save = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          prompt,
          answer: answer.trim(),
          task_id: task?.id,
          tags,
          trigger_kind: "post_review",
        },
      }),
    onSuccess: () => {
      toast.success("Reflection saved to your Learning Journey.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const toggle = (chip: string) =>
    setTags((t) => (t.includes(chip) ? t.filter((x) => x !== chip) : [...t, chip]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-orange" /> Reflect for 60 seconds
          </DialogTitle>
          <DialogDescription>
            {task ? `Approved: ${task.title}` : "Capture what you're taking from this task."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">{prompt}</div>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="A few honest sentences — future-you (or an interviewer) will thank you."
            className="min-h-[120px]"
          />
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  tags.includes(c)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || answer.trim().length < 3}
          >
            Save reflection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}