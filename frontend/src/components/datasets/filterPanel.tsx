import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { FilterAddPopover } from "./filterAddPopover";

interface FilterPanelProps {
  facets: Record<string, string[]>;
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onClear: () => void;
}

const sources = ["cmip6", "obs4mips"];

export function FilterPanel({
  facets,
  filters,
  onFilterChange,
  onClear,
}: FilterPanelProps) {
  const handleRemoveFacet = (key: string) => {
    const newFacets = { ...filters.facets };
    delete newFacets[key];
    onFilterChange({ facets: newFacets });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Select
          onValueChange={(e) => {
            onFilterChange({ dataset_type: e });
          }}
          value={filters.dataset_type || ""}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a Source" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by Instance ID..."
          defaultValue={filters.name_contains || ""}
          onChange={(e) => {
            const value = e.target.value;
            const handler = setTimeout(() => {
              onFilterChange({ name_contains: value });
            }, 200);
            return () => clearTimeout(handler);
          }}
          className="max-w-sm"
        />
        <FilterAddPopover
          facets={facets}
          onAdd={(key, value) =>
            onFilterChange({
              facets: { ...(filters.facets || {}), [key]: value },
            })
          }
        />
        <Button onClick={onClear} variant="outline">
          Clear All
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {filters.facets &&
          Object.entries(filters.facets).map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <span>
                {key}: {String(value)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFacet(key)}
                className="ml-1 h-5 w-5"
                aria-label="Remove filter"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
      </div>
    </div>
  );
}
