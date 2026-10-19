import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FailureCount } from "@/lib/failures";
import { MIP_ERAS, type MipEra } from "@/lib/mipEras";
import { cn } from "@/lib/utils";

const countText = ({ groups, diagnostics }: FailureCount) =>
  `${groups} failed in ${diagnostics} ${diagnostics === 1 ? "diagnostic" : "diagnostics"}`;

/**
 * A searchable dropdown picking one value to filter failures by, or all of them
 *
 * Each value shows how many failed groups it has, given the other filters.
 */
function FilterCombobox({
  label,
  allLabel,
  counts,
  selected,
  onSelect,
  labelOf = (key) => key,
  titleOf,
  disabled,
}: {
  label: string;
  allLabel: string;
  counts: FailureCount[];
  selected?: string;
  onSelect: (key: string | undefined) => void;
  labelOf?: (key: string) => string;
  titleOf?: (key: string) => string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // A selection the other filters leave without failures still needs to be listed
  const options =
    selected === undefined || counts.some(({ key }) => key === selected)
      ? counts
      : [{ key: selected, groups: 0, diagnostics: 0 }, ...counts];
  const choose = (key: string | undefined) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "max-w-full justify-between",
            selected && "border-primary",
          )}
        >
          <span className="truncate">
            <span className="text-muted-foreground">{label}:</span>{" "}
            {selected === undefined ? allLabel : labelOf(selected)}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[22rem] max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={allLabel} onSelect={() => choose(undefined)}>
                <Check
                  className={cn(
                    "size-4",
                    selected !== undefined && "invisible",
                  )}
                />
                {allLabel}
              </CommandItem>
              {options.map((count) => (
                <CommandItem
                  key={count.key}
                  value={`${labelOf(count.key)} ${count.key}`}
                  title={titleOf?.(count.key)}
                  onSelect={() => choose(count.key)}
                >
                  <Check
                    className={cn(
                      "size-4",
                      selected !== count.key && "invisible",
                    )}
                  />
                  <span className="flex-1 truncate">{labelOf(count.key)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {countText(count)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface DayRange {
  from: string;
  to: string;
}

/**
 * The filters of the failures page, which narrow everything below them
 *
 * The time range defaults to the days from the oldest to the newest failure.
 */
export function FailureFilterBar({
  mipEra,
  onMipEra,
  reasonCounts,
  reason,
  onReason,
  reasonLabel,
  reasonDescription,
  modelCounts,
  model,
  onModel,
  days,
  allDays,
  onDays,
  onClear,
  summary,
  disabled,
}: {
  mipEra: MipEra;
  onMipEra: (era: MipEra) => void;
  reasonCounts: FailureCount[];
  reason?: string;
  onReason: (reason: string | undefined) => void;
  reasonLabel: (reason: string) => string;
  reasonDescription: (reason: string) => string;
  modelCounts: FailureCount[];
  model?: string;
  onModel: (model: string | undefined) => void;
  /** The selected days, or the full range when none were picked */
  days?: DayRange;
  /** The days from the oldest to the newest failure */
  allDays?: DayRange;
  onDays: (days: Partial<DayRange>) => void;
  onClear?: () => void;
  summary?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mipEra} onValueChange={(era) => onMipEra(era as MipEra)}>
          <TabsList className="h-8">
            {MIP_ERAS.map((era) => (
              <TabsTrigger key={era} value={era} className="px-3 text-xs">
                {era}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FilterCombobox
          label="Failure reason"
          allLabel="All reasons"
          counts={reasonCounts}
          selected={reason}
          onSelect={onReason}
          labelOf={reasonLabel}
          titleOf={reasonDescription}
          disabled={disabled}
        />
        <FilterCombobox
          label="Model"
          allLabel="All models"
          counts={modelCounts}
          selected={model}
          onSelect={onModel}
          disabled={disabled}
        />
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="text-muted-foreground">Failed between</span>
          <Input
            type="date"
            aria-label="Failed on or after"
            className="h-8 w-auto"
            value={days?.from ?? ""}
            min={allDays?.from}
            max={days?.to ?? allDays?.to}
            disabled={disabled || !allDays}
            onChange={(event) =>
              onDays({ from: event.target.value || undefined })
            }
          />
          <span className="text-muted-foreground">and</span>
          <Input
            type="date"
            aria-label="Failed on or before"
            className="h-8 w-auto"
            value={days?.to ?? ""}
            min={days?.from ?? allDays?.from}
            max={allDays?.to}
            disabled={disabled || !allDays}
            onChange={(event) =>
              onDays({ to: event.target.value || undefined })
            }
          />
        </div>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-4" />
            Clear filters
          </Button>
        )}
      </div>
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
    </div>
  );
}
