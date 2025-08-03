import { PlusCircle } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { Facet } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button.tsx";
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

interface FilterAddPopoverProps extends ComponentProps<typeof Button> {
  facets: Facet[];
  onAdd: (facetKey: string, value: string) => void;
}

export function FilterAddPopover({
  facets,
  onAdd,
  ...props
}: FilterAddPopoverProps) {
  const [facetKey, setFacetKey] = useState<string | undefined>(facets[0]?.key);
  const [facetValues, setFacetValues] = useState<string[]>([]);
  const [value, setValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    setFacetValues(facets.find((f) => f.key === facetKey)?.values ?? []);
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
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="width">Value</Label>
              <Select
                value={value}
                onValueChange={setValue}
                disabled={!facetKey || facetValues.length === 0}
              >
                <SelectTrigger
                  id="facetValueSelect"
                  className="bg-background"
                  disabled={!facetKey || facetValues.length === 0}
                >
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {facetValues.length > 0 ? (
                    facetValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>
                      No values for this facet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={!facetKey || !value}
              onClick={() => {
                if (facetKey && value) {
                  onAdd(facetKey, value);
                  setValue(undefined);
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
