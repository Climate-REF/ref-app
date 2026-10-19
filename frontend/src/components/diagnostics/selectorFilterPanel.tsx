import { X } from "lucide-react";
import { useMemo } from "react";
import type { ExecutionGroup } from "@/client";
import { CheckboxCommandList } from "@/components/app/checkboxCommandList";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";

interface SelectorFacet {
  key: string;
  values: string[];
}

interface SelectorFilterPanelProps {
  executionGroups: ExecutionGroup[];
  filters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
}

/** The selector keys of `groups`, each with its distinct values, both sorted. */
export function extractSelectorFacets(
  groups: ExecutionGroup[],
): SelectorFacet[] {
  const facetMap = new Map<string, Set<string>>();
  for (const group of groups) {
    for (const pairs of Object.values(group.selectors)) {
      for (const [key, value] of pairs) {
        if (!facetMap.has(key)) {
          facetMap.set(key, new Set());
        }
        facetMap.get(key)!.add(value);
      }
    }
  }
  return Array.from(facetMap.entries())
    .map(([key, values]) => ({
      key,
      values: Array.from(values).sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function matchesSelectorFilters(
  selectors: ExecutionGroup["selectors"],
  filters: Record<string, string[]>,
): boolean {
  for (const [filterKey, filterValues] of Object.entries(filters)) {
    if (filterValues.length === 0) continue;
    const groupValues = Object.values(selectors).flatMap((pairs) =>
      pairs.filter(([k]) => k === filterKey).map(([, v]) => v),
    );
    if (!filterValues.some((v) => groupValues.includes(v))) {
      return false;
    }
  }
  return true;
}

function MultiSelectFacet({
  facet,
  selected,
  onSelectionChange,
}: {
  facet: SelectorFacet;
  selected: string[];
  onSelectionChange: (values: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {facet.key}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <CheckboxCommandList
          values={facet.values}
          selected={selected}
          onSelectedChange={onSelectionChange}
          placeholder={`Search ${facet.key}...`}
        />
      </PopoverContent>
    </Popover>
  );
}

export function SelectorFilterPanel({
  executionGroups,
  filters,
  onFiltersChange,
}: SelectorFilterPanelProps) {
  const facets = useMemo(
    () => extractSelectorFacets(executionGroups),
    [executionGroups],
  );

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0);

  if (facets.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Selectors:</span>
        {facets.map((facet) => (
          <MultiSelectFacet
            key={facet.key}
            facet={facet}
            selected={filters[facet.key] ?? []}
            onSelectionChange={(values) =>
              onFiltersChange({ ...filters, [facet.key]: values })
            }
          />
        ))}
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
                {key}: {value}
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
