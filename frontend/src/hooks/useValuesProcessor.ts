import type { RowSelectionState } from "@tanstack/react-table";
import { type SetStateAction, useMemo, useRef, useState } from "react";
import type {
  ScalarValue,
  SeriesValue,
} from "@/components/execution/values/types";
import type { MetricFilter } from "@/components/explorer/types";
import { applyFacetFilters } from "@/lib/metricFilters";

// Generic processed value type (supports ScalarValue, SeriesValue, or other
// value shapes that include `dimensions`).
export type ProcessedValue<T> = T & { rowId: string };

export type ProcessedScalarValue = ProcessedValue<ScalarValue>;
export type ProcessedSeriesValue = ProcessedValue<SeriesValue>;

// Maintain backwards-compatible exported Filter alias (MetricFilter union)
export type Filter = MetricFilter;

/**
 * Generic hook props to allow processing of either ScalarValue, SeriesValue,
 * or any object that has an `id` and a `dimensions` map.
 */
interface UseValuesProcessorProps<
  T extends { id: number; dimensions: { [key: string]: unknown } },
> {
  initialValues: T[];
  initialFilters?: MetricFilter[]; // now supports facet/isolate/exclude filters
  onFiltersChange?: (filters: MetricFilter[]) => void;
}

/**
 * useValuesProcessor
 * - Generic hook that can process arrays of values that include `id` and `dimensions` fields.
 * - Returns the values matching the facet filters, each with a `rowId` from its `id`.
 * - Note: isolate/exclude filtering is now intended to be handled by the backend
 *   via query parameters; this hook only applies facet (dimension) filters client-side.
 */
export function useValuesProcessor<
  T extends { id: number; dimensions: { [key: string]: unknown } },
>({
  initialValues,
  initialFilters,
  onFiltersChange,
}: UseValuesProcessorProps<T>) {
  const [filters, setInternalFilters] = useState<MetricFilter[]>(
    initialFilters || [],
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Latest filters, so updaters called in the same tick build on each other
  const filtersRef = useRef(filters);

  // Run an updater once, so the parent and internal state get the same
  // filters even when the updater generates ids.
  const setFilters = (newFilters: SetStateAction<MetricFilter[]>) => {
    const resolvedFilters =
      typeof newFilters === "function"
        ? newFilters(filtersRef.current)
        : newFilters;
    filtersRef.current = resolvedFilters;
    setInternalFilters(resolvedFilters);
    onFiltersChange?.(resolvedFilters);
  };

  // The database id keeps a row's id stable across fetches
  const displayedValues = useMemo(
    () =>
      applyFacetFilters(initialValues, filters).map((v) => ({
        ...v,
        rowId: String(v.id),
      })),
    [initialValues, filters],
  );

  return {
    filters,
    setFilters,
    displayedValues,
    rowSelection,
    setRowSelection,
  };
}
