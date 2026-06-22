import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdvanceTimeDialog } from "@/components/advance-time-dialog";
import { CalendarDays, CalendarRange, Rocket, FastForward, Flag } from "lucide-react";

type Mode = "day" | "week" | "sprint" | "steerco" | "golive";

export function TimeControls({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("day");

  function trigger(m: Mode) {
    setMode(m);
    setOpen(true);
  }

  const buttons: Array<{ mode: Mode; label: string; icon: React.ComponentType<{ className?: string }>; variant?: "default" | "secondary" | "outline" }> = [
    { mode: "day", label: "Next Day", icon: CalendarDays, variant: "secondary" },
    { mode: "week", label: "Next Week", icon: CalendarRange, variant: "secondary" },
    { mode: "sprint", label: "Begin Sprint", icon: Rocket, variant: "outline" },
    { mode: "steerco", label: "→ Steering Committee", icon: FastForward, variant: "outline" },
    { mode: "golive", label: "→ Go-Live", icon: Flag, variant: "outline" },
  ];

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : ""}`}>
        {buttons.map((b) => (
          <Button
            key={b.mode}
            size={compact ? "sm" : "default"}
            variant={b.variant}
            onClick={() => trigger(b.mode)}
          >
            <b.icon className="mr-2 h-4 w-4" />
            {b.label}
          </Button>
        ))}
      </div>
      <AdvanceTimeDialog open={open} mode={mode} onOpenChange={setOpen} />
    </>
  );
}