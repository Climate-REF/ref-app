import type { RowSelectionState } from "@tanstack/react-table";
import { PlusCircle, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Facet } from "@/components/execution/values/types";
import { FilterAddPopover } from "@/components/execution/values/filterAddPopover.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Filter } from "@/hooks/useValuesProcessor";

interface FilterControlsProps {
  values: { rowId: string }[];
  facets: Facet[];
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
  excludedRowIds: Set<string>;
  setExcludedRowIds: Dispatch<SetStateAction<Set<string>>>;
  rowSelection: RowSelectionState;
}

export function FilterControls({
  values,
  facets,
  filters,
  setFilters,
  rowSelection,
  excludedRowIds,
  setExcludedRowIds,
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

        {excludedRowIds.size > 0 ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <span>Filtered Rows: {excludedRowIds.size}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExcludedRowIds(new Set())}
              className="ml-1 h-5 w-5"
              aria-label="Remove filter"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ) : null}

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

        {Object.keys(rowSelection).length ? (
          <>
            <Button
              variant="outline"
              onClick={() =>
                setExcludedRowIds((existing) => {
                  const selectedRowIds = new Set(Object.keys(rowSelection));

                  // Filter out the selected row IDs from the excludedRowIds
                  const toExclude = values
                    .map((v) => v.rowId)
                    .filter((v) => !selectedRowIds.has(v));

                  return new Set([...existing, ...toExclude]);
                })
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Isolate Selected
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                setExcludedRowIds(
                  (existing) =>
                    new Set([...existing, ...Object.keys(rowSelection)]),
                )
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Exclude Selected
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
