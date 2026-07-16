import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { pauseActiveProject } from "@/lib/projects.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function PauseProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pauseFn = useServerFn(pauseActiveProject);
  const [busy, setBusy] = useState(false);

  const pause = useMutation({
    mutationFn: () => pauseFn(),
    onMutate: () => setBusy(true),
    onSuccess: async () => {
      // Progress, drafts and simulation state remain in Supabase — nothing to
      // snapshot. Clearing the active pointer just hides the dashboard until
      // the user resumes from the projects screen.
      await qc.invalidateQueries({ queryKey: ["active-project"] });
      await qc.invalidateQueries({ queryKey: ["overview"] });
      onOpenChange(false);
      toast.success("Project paused — you can resume any time.");
      navigate({ to: "/app/projects" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to pause"),
    onSettled: () => setBusy(false),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pause this project?</AlertDialogTitle>
          <AlertDialogDescription>
            Your progress, drafts and current project state will be saved. You can resume from
            this point later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              pause.mutate();
            }}
          >
            {busy ? "Pausing…" : "Pause project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}