import type { RowSelectionState } from "@tanstack/react-table";
import { PlusCircle, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { FilterAddPopover } from "@/components/execution/values/filterAddPopover.tsx";
import type { Facet } from "@/components/execution/values/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Filter } from "@/hooks/useValuesProcessor";

interface FilterControlsProps {
  facets: Facet[];
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
  excludedRowIds: Set<string>;
  setExcludedRowIds: Dispatch<SetStateAction<Set<string>>>;
  rowSelection: RowSelectionState;
}

export function FilterControls({
  facets,
  filters,
  setFilters,
  rowSelection,
  excludedRowIds,
  setExcludedRowIds,
}: FilterControlsProps) {
  const availableFacets = facets
    .filter(
      (facet) =>
        !filters.some(
          (filter) =>
            (filter as any).type === "facet" &&
            (filter as any).facetKey === facet.key,
        ),
    )
    .sort((a, b) => a.key.localeCompare(b.key));

  // If there are active isolate/exclude filters, prefill the ID popover with the first occurrence.
  const firstIsolate = filters.find((f) => (f as any).type === "isolate") as
    | any
    | undefined;
  const firstExclude = filters.find((f) => (f as any).type === "exclude") as
    | any
    | undefined;
  const initialIdMode = firstIsolate
    ? "isolate"
    : firstExclude
      ? "exclude"
      : undefined;
  const initialIds = (
    firstIsolate
      ? firstIsolate.ids
      : firstExclude
        ? firstExclude.ids
        : undefined
  ) as Set<string> | undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {filters.map((filter) => {
          if ((filter as any).type === "facet") {
            const f = filter as any;
            return (
              <Badge
                key={f.id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <span>
                  {facets.find((ff) => ff.key === f.facetKey)?.key ||
                    f.facetKey}
                  : {f.values.length > 1 ? f.values.join(", ") : f.values[0]}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setFilters((existing) =>
                      existing.filter((x) => (x as any).id !== f.id),
                    )
                  }
                  className="ml-1 h-5 w-5"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          }

          if ((filter as any).type === "isolate") {
            const f = filter as any;
            return (
              <Badge
                key={f.id}
                variant="outline"
                className="flex items-center gap-1 border-emerald-400 text-emerald-600"
              >
                <span>Isolating {f.ids ? f.ids.size : 0} rows</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setFilters((existing) =>
                      existing.filter((x) => (x as any).id !== f.id),
                    )
                  }
                  className="ml-1 h-5 w-5"
                  aria-label="Remove isolate filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          }

          if ((filter as any).type === "exclude") {
            const f = filter as any;
            return (
              <Badge
                key={f.id}
                variant="destructive"
                className="flex items-center gap-1"
              >
                <span>Excluding {f.ids ? f.ids.size : 0} rows</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setFilters((existing) =>
                      existing.filter((x) => (x as any).id !== f.id),
                    )
                  }
                  className="ml-1 h-5 w-5"
                  aria-label="Remove exclude filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          }

          return null;
        })}

        {/* Legacy excludedRowIds badge (kept for compatibility, but server now handles excludes) */}
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
          initialIdMode={initialIdMode}
          initialIds={initialIds}
          onAdd={(facetKey, values) => {
            setFilters((existing) => [
              ...existing,
              {
                type: "facet",
                id: crypto.randomUUID(),
                facetKey,
                values,
              } as any,
            ]);
          }}
          onAddIds={(mode, ids) => {
            setFilters((existing) => {
              const idx = existing.findIndex((f) => (f as any).type === mode);
              if (idx >= 0) {
                const existingFilter = existing[idx] as any;
                const existingIds: string[] = existingFilter.ids
                  ? Array.from(existingFilter.ids)
                  : [];
                const mergedIds = new Set<string>([
                  ...existingIds,
                  ...Array.from(ids),
                ]);
                const updatedFilter = {
                  ...existingFilter,
                  ids: mergedIds,
                } as any;
                const newFilters = [...existing];
                newFilters[idx] = updatedFilter;
                return newFilters;
              }
              return [
                ...existing,
                {
                  type: mode,
                  id: crypto.randomUUID(),
                  ids,
                } as any,
              ];
            });
          }}
          disabled={availableFacets.length === 0 && facets.length > 0}
        />

        {Object.keys(rowSelection).length ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                const selectedRowIds = new Set(Object.keys(rowSelection));
                setFilters((existing) => {
                  const mode = "isolate";
                  const idx = existing.findIndex(
                    (f) => (f as any).type === mode,
                  );
                  if (idx >= 0) {
                    const existingFilter = existing[idx] as any;
                    const existingIds: string[] = existingFilter.ids
                      ? Array.from(existingFilter.ids)
                      : [];
                    const mergedIds = new Set<string>([
                      ...existingIds,
                      ...Array.from(selectedRowIds),
                    ]);
                    const updatedFilter = {
                      ...existingFilter,
                      ids: mergedIds,
                    } as any;
                    const newFilters = [...existing];
                    newFilters[idx] = updatedFilter;
                    return newFilters;
                  }
                  return [
                    ...existing,
                    {
                      type: "isolate",
                      id: crypto.randomUUID(),
                      ids: selectedRowIds,
                    } as any,
                  ];
                });
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Isolate Selected
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const selectedRowIds = new Set(Object.keys(rowSelection));
                setFilters((existing) => {
                  const mode = "exclude";
                  const idx = existing.findIndex(
                    (f) => (f as any).type === mode,
                  );
                  if (idx >= 0) {
                    const existingFilter = existing[idx] as any;
                    const existingIds: string[] = existingFilter.ids
                      ? Array.from(existingFilter.ids)
                      : [];
                    const mergedIds = new Set<string>([
                      ...existingIds,
                      ...Array.from(selectedRowIds),
                    ]);
                    const updatedFilter = {
                      ...existingFilter,
                      ids: mergedIds,
                    } as any;
                    const newFilters = [...existing];
                    newFilters[idx] = updatedFilter;
                    return newFilters;
                  }
                  return [
                    ...existing,
                    {
                      type: "exclude",
                      id: crypto.randomUUID(),
                      ids: selectedRowIds,
                    } as any,
                  ];
                });
              }}
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
