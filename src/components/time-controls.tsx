import { useState } from "react";
import { Button } from "@/components/ui/button";
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
}> = [
  { mode: "day", label: "Next Day", icon: CalendarDays, variant: "secondary" },
  { mode: "week", label: "Next Week", icon: CalendarRange, variant: "secondary" },
  { mode: "sprint", label: "Begin Sprint", icon: Rocket, variant: "outline" },
  { mode: "steerco", label: "→ Steering Committee", icon: FastForward, variant: "outline" },
  { mode: "golive", label: "→ Go-Live", icon: Flag, variant: "outline" },
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

  const primary = BUTTONS[0];
  const secondary = BUTTONS[1];
  const overflow = BUTTONS.slice(2);

  return (
    <>
      {/* Desktop: full row */}
      <div className="hidden flex-wrap gap-2 lg:flex">
        {BUTTONS.map((b) => (
          <Button
            key={b.mode}
            size={compact ? "sm" : "default"}
            variant={b.variant}
            onClick={() => trigger(b.mode)}
            className="hover-lift"
          >
            <b.icon className="mr-2 h-4 w-4" />
            {b.label}
          </Button>
        ))}
      </div>

      {/* Tablet / mobile: primary + one secondary + More menu */}
      <div className="flex flex-wrap items-center gap-2 lg:hidden">
        <Button
          size={compact ? "sm" : "default"}
          variant={primary.variant}
          onClick={() => trigger(primary.mode)}
          className="hover-lift"
        >
          <primary.icon className="mr-2 h-4 w-4" /> {primary.label}
        </Button>
        <Button
          size={compact ? "sm" : "default"}
          variant={secondary.variant}
          onClick={() => trigger(secondary.mode)}
          className="hover-lift"
        >
          <secondary.icon className="mr-2 h-4 w-4" /> {secondary.label}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={compact ? "sm" : "default"} variant="outline" className="hover-lift">
              More <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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

      <AdvanceTimeDialog open={open} mode={mode} onOpenChange={setOpen} />
    </>
  );
}