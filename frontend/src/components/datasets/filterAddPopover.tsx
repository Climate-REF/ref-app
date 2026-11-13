import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/select";

interface FilterAddPopoverProps {
  facets: Record<string, string[]>;
  onAdd: (facetKey: string, value: string) => void;
  disabled?: boolean;
}

export function FilterAddPopover({
  facets,
  onAdd,
  disabled,
}: FilterAddPopoverProps) {
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  // Only a value the chosen facet currently offers can be added. This keeps a stale
  // selection, such as one left over from another facet, from producing no results.
  const selectedOptions = selectedFacet ? (facets[selectedFacet] ?? []) : [];
  const canAdd =
    selectedFacet !== null &&
    selectedValue !== null &&
    selectedOptions.includes(selectedValue);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Add Filter</h4>
            <p className="text-sm text-muted-foreground">
              Select a facet and value to filter by.
            </p>
          </div>
          <div className="grid gap-2">
            <Select
              value={selectedFacet ?? ""}
              onValueChange={(facet) => {
                setSelectedFacet(facet);
                setSelectedValue(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a facet" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(facets).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFacet && (
              // Controlled, so resetting the value after Add or a facet change also clears
              // what the select shows. An empty value shows the placeholder.
              <Select
                value={selectedValue ?? ""}
                onValueChange={setSelectedValue}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a value" />
                </SelectTrigger>
                <SelectContent>
                  {facets[selectedFacet]?.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            onClick={() => {
              if (selectedFacet && selectedValue && canAdd) {
                onAdd(selectedFacet, selectedValue);
                setSelectedValue(null);
              }
            }}
            disabled={!canAdd}
          >
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
