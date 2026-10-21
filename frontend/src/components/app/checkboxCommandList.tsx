import { Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import { cn } from "@/lib/utils";

interface CheckboxCommandListProps {
  values: string[];
  selected: string[];
  /** Called with `selected` after a value is ticked or unticked */
  onSelectedChange: (selected: string[]) => void;
  placeholder: string;
}

/** A searchable list of values with a checkbox each, for picking several. */
export function CheckboxCommandList({
  values,
  selected,
  onSelectedChange,
  placeholder,
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
                <span>{value}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
