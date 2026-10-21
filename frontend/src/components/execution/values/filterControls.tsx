import type { RowSelectionState } from "@tanstack/react-table";
import { PlusCircle, X } from "lucide-react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { FilterAddPopover } from "@/components/execution/values/filterAddPopover.tsx";
import type { Facet } from "@/components/execution/values/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Filter } from "@/hooks/useValuesProcessor";
import { mergeIdFilter } from "@/lib/metricFilters";
import { cn } from "@/lib/utils";

interface FilterControlsProps {
  facets: Facet[];
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
  rowSelection: RowSelectionState;
}

export function FilterControls({
  facets,
  filters,
  setFilters,
  rowSelection,
}: FilterControlsProps) {
  const availableFacets = facets
    .filter(
      (facet) =>
        !filters.some(
          (filter) => filter.type === "facet" && filter.facetKey === facet.key,
        ),
    )
    .sort((a, b) => a.key.localeCompare(b.key));

  // If there are active isolate/exclude filters, prefill the ID popover with the first occurrence.
  const idFilter =
    filters.find((filter) => filter.type === "isolate") ??
    filters.find((filter) => filter.type === "exclude");

  const addSelected = (mode: "isolate" | "exclude") =>
    setFilters((existing) =>
      mergeIdFilter(existing, mode, Object.keys(rowSelection)),
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {filters.map((filter) => (
          <FilterBadge
            key={filter.id}
            filter={filter}
            onRemove={() =>
              setFilters((existing) =>
                existing.filter((x) => x.id !== filter.id),
              )
            }
          />
        ))}

        <FilterAddPopover
          facets={availableFacets}
          initialIdMode={idFilter?.type}
          initialIds={idFilter?.ids}
          onAdd={(facetKey, values) => {
            setFilters((existing) => [
              ...existing,
              { type: "facet", id: crypto.randomUUID(), facetKey, values },
            ]);
          }}
          onAddIds={(mode, ids) =>
            setFilters((existing) => mergeIdFilter(existing, mode, ids))
          }
          disabled={availableFacets.length === 0 && facets.length > 0}
        />

        {Object.keys(rowSelection).length ? (
          <>
            <Button variant="outline" onClick={() => addSelected("isolate")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Isolate Selected
            </Button>

            <Button variant="outline" onClick={() => addSelected("exclude")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Exclude Selected
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

interface FilterBadgeLook {
  label: string;
  variant: ComponentProps<typeof Badge>["variant"];
  className?: string;
  removeLabel: string;
}

function filterBadgeLook(filter: Filter): FilterBadgeLook {
  switch (filter.type) {
    case "facet":
      return {
        label: `${filter.facetKey}: ${filter.values.join(", ")}`,
        variant: "secondary",
        removeLabel: "Remove filter",
      };
    case "isolate":
      return {
        label: `Isolating ${filter.ids.size} rows`,
        variant: "outline",
        className: "border-emerald-400 text-emerald-600",
        removeLabel: "Remove isolate filter",
      };
    case "exclude":
      return {
        label: `Excluding ${filter.ids.size} rows`,
        variant: "destructive",
        removeLabel: "Remove exclude filter",
      };
  }
}

function FilterBadge({
  filter,
  onRemove,
}: {
  filter: Filter;
  onRemove: () => void;
}) {
  const { label, variant, className, removeLabel } = filterBadgeLook(filter);
  return (
    <Badge
      variant={variant}
      className={cn("flex items-center gap-1", className)}
    >
      <span>{label}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="ml-1 h-5 w-5"
        aria-label={removeLabel}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}
