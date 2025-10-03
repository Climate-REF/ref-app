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
  // Optional: allow creating isolate/exclude filters by providing IDs
  onAddIds?: (mode: "isolate" | "exclude", ids: Set<string>) => void;
  // Optional initial values to prefill the ID mode and textbox when the popover opens
  initialIdMode?: "isolate" | "exclude";
  initialIds?: Set<string>;
}

export function FilterAddPopover({
  facets,
  onAdd,
  onAddIds,
  initialIdMode,
  initialIds,
  ...props
}: FilterAddPopoverProps) {
  const [mode, setMode] = useState<"facet" | "ids">("facet");
  const [facetKey, setFacetKey] = useState<string | undefined>(facets[0]?.key);
  const [facetValues, setFacetValues] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  // For ID mode - initialize from props so the popover is prefilled when opened
  const [idMode, setIdMode] = useState<"isolate" | "exclude">(
    initialIdMode ?? "isolate",
  );
  const [idText, setIdText] = useState<string>(
    initialIds ? Array.from(initialIds).join(",") : "",
  );

  useEffect(() => {
    setFacetValues(facets.find((f) => f.key === facetKey)?.values ?? []);
    setSelectedValues([]); // Reset selected values when facet changes
  }, [facets, facetKey]);

  // Update local id mode/text if parent changes (keeps popover in sync with external filters)
  useEffect(() => {
    if (initialIdMode) setIdMode(initialIdMode);
  }, [initialIdMode]);

  useEffect(() => {
    if (initialIds) {
      setIdText(Array.from(initialIds).join(","));
    }
  }, [initialIds]);

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
            <h4 className="font-medium leading-none">Add Filter</h4>
            <p className="text-sm text-muted-foreground">
              Apply an additional filter to the data.
            </p>
            <p className="text-sm text-muted-foreground">
              Click outside of the popover to close it.
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex gap-2 items-center">
              <Button
                variant={mode === "facet" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("facet")}
              >
                By Facet
              </Button>
              <Button
                variant={mode === "ids" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("ids")}
              >
                By IDs
              </Button>
            </div>

            {mode === "facet" ? (
              <>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="width">Facet</Label>
                  <Select value={facetKey} onValueChange={setFacetKey}>
                    <SelectTrigger
                      id="facetKeySelect"
                      className="bg-background"
                    >
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
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant={idMode === "isolate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIdMode("isolate")}
                  >
                    Isolate
                  </Button>
                  <Button
                    variant={idMode === "exclude" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIdMode("exclude")}
                  >
                    Exclude
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>IDs (comma separated)</Label>
                  <input
                    className="input bg-background p-2 rounded border"
                    value={idText}
                    onChange={(e) => setIdText(e.target.value)}
                    placeholder="e.g. 123,456,789"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={idText.trim().length === 0 || !onAddIds}
                  onClick={() => {
                    const ids = idText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (onAddIds && ids.length > 0) {
                      onAddIds(idMode, new Set(ids));
                      setIdText("");
                    }
                  }}
                >
                  Add
                </Button>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
