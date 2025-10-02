import { Check, PlusCircle } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import type { Facet } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils";

interface FilterAddPopoverProps extends ComponentProps<typeof Button> {
  facets: Facet[];
  onAdd: (facetKey: string, values: string[]) => void;
}

export function FilterAddPopover({
  facets,
  onAdd,
  ...props
}: FilterAddPopoverProps) {
  const [facetKey, setFacetKey] = useState<string | undefined>(facets[0]?.key);
  const [facetValues, setFacetValues] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFacetValues(facets.find((f) => f.key === facetKey)?.values ?? []);
    setSelectedValues([]); // Reset selected values when facet changes
  }, [facets, facetKey]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" {...props}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Dimensions</h4>
            <p className="text-sm text-muted-foreground">
              Apply an additional filter to the data.
            </p>
            <p className="text-sm text-muted-foreground">
              Click outside of the popover to close it.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="width">Facet</Label>
              <Select value={facetKey} onValueChange={setFacetKey}>
                <SelectTrigger id="facetKeySelect" className="bg-background">
                  <SelectValue placeholder="Select facet" />
                </SelectTrigger>
                <SelectContent>
                  {facets.length > 0 ? (
                    facets.map((facet) => (
                      <SelectItem key={facet.key} value={facet.key}>
                        {facet.key}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>
                      No more facets to filter by
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Values (select multiple)</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="justify-between"
                    disabled={!facetKey || facetValues.length === 0}
                  >
                    {selectedValues.length > 0
                      ? `${selectedValues.length} selected`
                      : "Select values..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search values..." />
                    <CommandList>
                      <CommandEmpty>No values found.</CommandEmpty>
                      <CommandGroup>
                        {facetValues.map((value) => {
                          const isSelected = selectedValues.includes(value);
                          return (
                            <CommandItem
                              key={value}
                              value={value}
                              onSelect={() => {
                                setSelectedValues((prev) =>
                                  isSelected
                                    ? prev.filter((v) => v !== value)
                                    : [...prev, value],
                                );
                              }}
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
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="outline"
              disabled={!facetKey || selectedValues.length === 0}
              onClick={() => {
                if (facetKey && selectedValues.length > 0) {
                  onAdd(facetKey, selectedValues);
                  setSelectedValues([]);
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
