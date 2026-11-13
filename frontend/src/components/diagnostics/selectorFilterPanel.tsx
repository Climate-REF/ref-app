import { X } from "lucide-react";
import { CheckboxCommandList } from "@/components/app/checkboxCommandList";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  type FacetOption,
  withUnavailableSelections,
} from "@/lib/facetedFilter";
import { UNKNOWN_FACET_VALUE } from "./figureGalleryData";

/** The text shown for a facet value, naming the value of figures without one. */
function facetValueLabel(value: string): string {
  return value === UNKNOWN_FACET_VALUE ? "Unknown" : value;
}

interface SelectorFilterPanelProps {
  /** Available options of each selector facet */
  facets: Record<string, FacetOption[]>;
  filters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
}

function MultiSelectFacet({
  facetKey,
  options,
  selected,
  onSelectionChange,
}: {
  facetKey: string;
  options: FacetOption[];
  selected: string[];
  onSelectionChange: (values: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {facetKey}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <CheckboxCommandList
          values={options.map((option) => option.value)}
          counts={Object.fromEntries(
            options.map((option) => [option.value, option.count]),
          )}
          selected={selected}
          onSelectedChange={onSelectionChange}
          placeholder={`Search ${facetKey}...`}
          labelOf={facetValueLabel}
        />
      </PopoverContent>
    </Popover>
  );
}

export function SelectorFilterPanel({
  facets,
  filters,
  onFiltersChange,
}: SelectorFilterPanelProps) {
  const facetKeys = Object.keys(facets).sort((a, b) => a.localeCompare(b));
  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0);

  if (facetKeys.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Filter by:</span>
        {facetKeys.map((key) => {
          const selected = filters[key] ?? [];
          return (
            <MultiSelectFacet
              key={key}
              facetKey={key}
              options={withUnavailableSelections(facets[key] ?? [], selected)}
              selected={selected}
              onSelectionChange={(values) =>
                onFiltersChange({ ...filters, [key]: values })
              }
            />
          );
        })}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onFiltersChange({})}
          >
            Clear all
          </Button>
        )}
      </div>
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(filters).flatMap(([key, values]) =>
            values.map((value) => (
              <Badge
                key={`${key}:${value}`}
                variant="secondary"
                className="gap-1"
              >
                {key}: {facetValueLabel(value)}
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      [key]: values.filter((v) => v !== value),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )),
          )}
        </div>
      )}
    </div>
  );
}
