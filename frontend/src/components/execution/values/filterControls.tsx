import type { Facet } from "@/client";
import { FilterAddPopover } from "@/components/execution/values/filterAddPopover.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Filter } from "@/hooks/useValuesProcessor";
import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface FilterControlsProps {
  facets: Facet[];
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
}

export function FilterControls({
  facets,
  filters,
  setFilters,
}: FilterControlsProps) {
  const availableFacets = facets.filter(
    (facet) => !filters.some((filter) => filter.facetKey === facet.key),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant="secondary"
            className="flex items-center gap-1"
          >
            <span>
              {facets.find((f) => f.key === filter.facetKey)?.key ||
                filter.facetKey}
              : {filter.value}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setFilters((existing) =>
                  existing.filter((f) => f.id !== filter.id),
                )
              }
              className="ml-1 h-5 w-5"
              aria-label="Remove filter"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}

        <FilterAddPopover
          facets={availableFacets}
          onAdd={(facetKey, value) => {
            setFilters((existing) => [
              ...existing,
              {
                id: crypto.randomUUID(),
                facetKey,
                value,
              },
            ]);
          }}
          disabled={availableFacets.length === 0 && facets.length > 0}
        />
      </div>
    </div>
  );
}
