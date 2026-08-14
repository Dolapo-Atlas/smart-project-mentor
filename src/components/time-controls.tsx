import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionChip, ChipGroupLabel, type ChipTone } from "@/components/dashboard/action-chip";
import { AdvanceTimeDialog } from "@/components/advance-time-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, CalendarRange, Rocket, FastForward, Flag, ChevronDown } from "lucide-react";

type Mode = "day" | "week" | "sprint" | "steerco" | "golive";

const BUTTONS: Array<{
  mode: Mode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "outline";
  tone: ChipTone;
}> = [
  { mode: "day", label: "Next Day", icon: CalendarDays, variant: "secondary", tone: "neutral" },
  { mode: "week", label: "Next Week", icon: CalendarRange, variant: "secondary", tone: "neutral" },
  { mode: "sprint", label: "Begin Sprint", icon: Rocket, variant: "outline", tone: "orange" },
  { mode: "steerco", label: "Steering Committee", icon: FastForward, variant: "outline", tone: "navy" },
  { mode: "golive", label: "Go-Live", icon: Flag, variant: "outline", tone: "green" },
];

// Desktop shows all controls in a row. Tablet/mobile shows the primary
// (Next Day) + one secondary (Next Week), and pushes the rest into a
// "More controls" dropdown so the toolbar never gets crowded.
export function TimeControls({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("day");

  function trigger(m: Mode) {
    setMode(m);
    setOpen(true);
  }

  // Allows other surfaces (e.g. Day in Review) to open a specific time control.
  useEffect(() => {
    function onExternal(e: Event) {
      const m = (e as CustomEvent).detail as Mode;
      if (!m) return;
      setMode(m);
      setTimeout(() => setOpen(true), 250);
    }
    window.addEventListener("atlas:advance-time", onExternal);
    return () => window.removeEventListener("atlas:advance-time", onExternal);
  }, []);

  const primary = BUTTONS[0];
  const secondary = BUTTONS[1];
  const overflow = BUTTONS.slice(2);

  return (
    <>
      <div className="space-y-3">
        {!compact && <ChipGroupLabel>Simulation clock</ChipGroupLabel>}

        {/* Desktop: full row of soft tinted chips */}
        <div className="hidden flex-wrap gap-2 lg:flex">
          {BUTTONS.map((b) => (
            <ActionChip key={b.mode} tone={b.tone} icon={b.icon} onClick={() => trigger(b.mode)}>
              {b.label}
            </ActionChip>
          ))}
        </div>

        {/* Tablet / mobile: 2-up grid (primary + secondary) + More menu */}
        <div className="lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            <ActionChip block tone={primary.tone} icon={primary.icon} onClick={() => trigger(primary.mode)}>
              {primary.label}
            </ActionChip>
            <ActionChip block tone={secondary.tone} icon={secondary.icon} onClick={() => trigger(secondary.mode)}>
              {secondary.label}
            </ActionChip>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs font-semibold text-muted-foreground"
              >
                More project controls <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Project controls
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {overflow.map((b) => (
                <DropdownMenuItem key={b.mode} onSelect={() => trigger(b.mode)}>
                  <b.icon className="mr-2 h-3.5 w-3.5" /> {b.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdvanceTimeDialog open={open} mode={mode} onOpenChange={setOpen} />
    </>
  );
}