import type { RowSelectionState } from "@tanstack/react-table";
import { type SetStateAction, useMemo, useState } from "react";
import type {
  ScalarValue,
  SeriesValue,
} from "@/components/execution/values/types";
import type { FacetFilter, MetricFilter } from "@/components/explorer/types";

// Generic processed value type (supports ScalarValue, SeriesValue, or other
// value shapes that include `dimensions`).
export type ProcessedValue<T> = T & { rowId: string };

export type ProcessedScalarValue = ProcessedValue<ScalarValue>;
export type ProcessedSeriesValue = ProcessedValue<SeriesValue>;

// Maintain backwards-compatible exported Filter alias (MetricFilter union)
export type Filter = MetricFilter;

/**
 * Generic hook props to allow processing of either ScalarValue, SeriesValue,
 * or any object that has a `dimensions` map.
 */
interface UseValuesProcessorProps<
  T extends { dimensions: { [key: string]: unknown } },
> {
  initialValues: T[];
  loading: boolean;
  initialFilters?: MetricFilter[]; // now supports facet/isolate/exclude filters
  initialExcludedRowIds?: string[];
  onFiltersChange?: (filters: MetricFilter[]) => void;
}

/**
 * useValuesProcessor
 * - Generic hook that can process arrays of values that include a `dimensions` field.
 * - Returns processed values with a generated `rowId`, filtering by facets.
 * - Note: isolate/exclude filtering is now intended to be handled by the backend
 *   via query parameters; this hook only applies facet (dimension) filters client-side.
 */
export function useValuesProcessor<
  T extends { dimensions: { [key: string]: unknown } },
>({
  initialValues,
  loading,
  initialFilters,
  initialExcludedRowIds,
  onFiltersChange,
}: UseValuesProcessorProps<T>) {
  const [filters, setInternalFilters] = useState<MetricFilter[]>(
    initialFilters || [],
  );
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(
    new Set(initialExcludedRowIds ?? []),
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const setFilters = (newFilters: SetStateAction<MetricFilter[]>) => {
    setInternalFilters(newFilters);
    if (onFiltersChange) {
      const resolvedFilters =
        typeof newFilters === "function" ? newFilters(filters) : newFilters;
      onFiltersChange(resolvedFilters);
    }
  };

  const handleExcludeRowIds = (excluded: SetStateAction<Set<string>>) => {
    // Reset the row selection when excluding rows
    setRowSelection({});

    setExcludedRowIds(excluded);
  };

  const processedValues = useMemo((): ProcessedValue<T>[] => {
    if (!initialValues) return [];

    // Use database ID when available so rowId is stable across fetches.
    // Fall back to crypto.randomUUID() for backward compatibility.
    return initialValues.map((v) => ({
      ...v,
      rowId:
        (v as any).id !== undefined
          ? String((v as any).id)
          : crypto.randomUUID(),
    })) as ProcessedValue<T>[];
  }, [initialValues]);

  const facetFilteredValues = useMemo(() => {
    if (loading && processedValues.length === 0) return [];

    const itemsToFilter = processedValues;
    // Apply only facet (dimension) filters client-side. Isolate/exclude are handled server-side.
    const activeFacetFilters = (filters ?? []).filter(
      (f): f is FacetFilter => (f as any).type === "facet",
    );
    if (activeFacetFilters.length === 0) {
      return itemsToFilter;
    }
    return itemsToFilter.filter((value) => {
      return activeFacetFilters.every((filter) => {
        const dimensionValue = value.dimensions[filter.facetKey];
        if (dimensionValue === undefined || dimensionValue === null)
          return false;

        // Normalize filter values to strings and trim whitespace
        const filterValues = filter.values.map((v) => String(v).trim());
        return filterValues.includes(String(dimensionValue).trim());
      });
    });
  }, [processedValues, filters, loading]);

  const finalDisplayedValues = useMemo(() => {
    // Backend handles isolate/exclude by id. Keep only facet filtering here.
    return facetFilteredValues;
  }, [facetFilteredValues]);

  return {
    filters,
    setFilters,
    finalDisplayedValues,
    excludedRowIds,
    setExcludedRowIds: handleExcludeRowIds,
    rowSelection,
    setRowSelection,
  };
}
