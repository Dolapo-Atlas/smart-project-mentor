import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Shown immediately after the first-time project brief is closed, so the
 * learner is never left on the dashboard without direction. Purely a
 * transition prompt — it changes no project state.
 */
export function FirstEmailPrompt({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent-orange/15">
            <Mail className="h-5 w-5 text-accent-orange" />
          </div>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            Your Project Manager has just sent you an email.
          </DialogTitle>
          <DialogDescription>
            Read the message and send your first response in Atlas.
          </DialogDescription>
        </DialogHeader>
        <Button
          size="lg"
          className="mt-2 w-full"
          onClick={() => {
            onOpenChange(false);
            navigate({ to: "/app/inbox", search: { onboarding: 1 } });
          }}
        >
          Open Inbox
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          This is your first workplace task.
        </p>
      </DialogContent>
    </Dialog>
  );
}