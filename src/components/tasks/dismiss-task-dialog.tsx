import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REASONS = [
  { value: "not_relevant", label: "Not relevant" },
  { value: "duplicate", label: "Duplicate" },
  { value: "deferred", label: "Deferred" },
  { value: "other", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export function DismissTaskDialog({
  open,
  onOpenChange,
  taskTitle,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  taskTitle: string;
  busy?: boolean;
  onConfirm: (reason: Reason, note?: string) => void;
}) {
  const [reason, setReason] = useState<Reason>("not_relevant");
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setReason("not_relevant");
          setNote("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dismiss task</DialogTitle>
          <DialogDescription>
            "{taskTitle}" will be removed from your active board. Dismissed tasks do
            not count as completed and won't block chapter progression.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Reason</label>
            <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for your future self…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(reason, note.trim() || undefined)}
            disabled={busy}
          >
            {busy ? "Dismissing…" : "Dismiss task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}