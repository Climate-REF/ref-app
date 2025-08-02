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
import { PlusCircle } from "lucide-react";
import { useState } from "react";

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
            <Select onValueChange={setSelectedFacet}>
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
              <Select onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a value" />
                </SelectTrigger>
                <SelectContent>
                  {facets[selectedFacet] &&
                    facets[selectedFacet].map((value) => (
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
              if (selectedFacet && selectedValue) {
                onAdd(selectedFacet, selectedValue);
              }
            }}
            disabled={!selectedFacet || !selectedValue}
          >
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}