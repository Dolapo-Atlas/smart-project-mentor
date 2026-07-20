import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRoster, type RosterMember } from "@/lib/roster";

type Props = {
  value?: string | null; // matched by name
  onChange: (name: string, member: RosterMember | null) => void;
  placeholder?: string;
  /** Roles to nudge to the top as contextually relevant. */
  suggestedRoles?: string[];
  disabled?: boolean;
  className?: string;
  /** Optional label shown on the trigger when nothing is selected. */
  emptyLabel?: string;
};

/**
 * Live, searchable stakeholder picker for the active project.
 * Uses `useRoster()` so options always match the current project's cast —
 * IDs and names stay stable so existing task/owner associations survive.
 */
export function StakeholderSelect({
  value,
  onChange,
  placeholder = "Search stakeholders…",
  suggestedRoles = [],
  disabled,
  className,
  emptyLabel = "Select a stakeholder",
}: Props) {
  const [open, setOpen] = useState(false);
  const roster = useRoster();

  const sorted = useMemo(() => {
    if (!suggestedRoles.length) return roster;
    const suggested = suggestedRoles
      .map((r) => roster.find((m) => m.role === r))
      .filter(Boolean) as RosterMember[];
    const rest = roster.filter((m) => !suggested.includes(m));
    return [...suggested, ...rest];
  }, [roster, suggestedRoles]);

  const selected = value ? roster.find((m) => m.name === value) ?? null : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selected ? (
              <>
                <span className="font-medium">{selected.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {selected.title}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{emptyLabel}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No matching stakeholder.</CommandEmpty>
            {suggestedRoles.length > 0 && (
              <CommandGroup heading="Suggested">
                {sorted
                  .filter((m) => suggestedRoles.includes(m.role))
                  .map((m) => (
                    <Row
                      key={`s-${m.name}`}
                      m={m}
                      selected={selected?.name === m.name}
                      onSelect={() => {
                        onChange(m.name, m);
                        setOpen(false);
                      }}
                    />
                  ))}
              </CommandGroup>
            )}
            <CommandGroup heading="All stakeholders">
              {sorted
                .filter((m) => !suggestedRoles.includes(m.role))
                .map((m) => (
                  <Row
                    key={m.name}
                    m={m}
                    selected={selected?.name === m.name}
                    onSelect={() => {
                      onChange(m.name, m);
                      setOpen(false);
                    }}
                  />
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  m,
  selected,
  onSelect,
}: {
  m: RosterMember;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${m.name} ${m.title} ${m.role}`}
      onSelect={onSelect}
      className="flex items-start gap-2"
    >
      <Check className={cn("mt-1 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
      <div className="min-w-0">
        <div className="truncate font-medium">{m.name}</div>
        <div className="truncate text-xs text-muted-foreground">{m.title}</div>
      </div>
    </CommandItem>
  );
}