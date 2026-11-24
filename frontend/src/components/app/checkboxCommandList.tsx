import { Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command.tsx";
import { cn } from "@/lib/utils";

interface CheckboxCommandListProps {
  values: string[];
  selected: string[];
  /** Called with `selected` after a value is ticked or unticked */
  onSelectedChange: (selected: string[]) => void;
  placeholder: string;
  /** Optional count to show next to each value */
  counts?: Record<string, number>;
  /** The text shown for a value, which is also searched; the value itself by default */
  labelOf?: (value: string) => string;
}

/** A searchable list of values with a checkbox each, for picking several. */
export function CheckboxCommandList({
  values,
  selected,
  onSelectedChange,
  placeholder,
  counts,
  labelOf = (value) => value,
}: CheckboxCommandListProps) {
  return (
    <Command>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No values found.</CommandEmpty>
        <CommandGroup>
          {values.map((value) => {
            const isSelected = selected.includes(value);
            return (
              <CommandItem
                key={value}
                value={value}
                keywords={[labelOf(value)]}
                onSelect={() =>
                  onSelectedChange(
                    isSelected
                      ? selected.filter((v) => v !== value)
                      : [...selected, value],
                  )
                }
              >
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible",
                  )}
                >
                  <Check className="h-4 w-4" />
                </div>
                <span>{labelOf(value)}</span>
                {counts?.[value] !== undefined && (
                  <CommandShortcut>{counts[value]}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
