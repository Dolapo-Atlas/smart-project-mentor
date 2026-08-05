import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { ATLAS_SIGNATURE, ATLAS_WHAT_TO_EXPECT } from "@/lib/atlas-voice";

export function HowAtlasWorksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            What to expect
          </DialogTitle>
          <DialogDescription>
            This is a realistic workplace simulation — not a course.
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-3">
          {ATLAS_WHAT_TO_EXPECT.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-orange/15 text-accent-orange">
                <Check className="h-3 w-3" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p>
            You are not expected to know everything. Atlas exists so you can
            learn by doing.
          </p>
          <p className="mt-2 font-medium text-foreground">{ATLAS_SIGNATURE}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}