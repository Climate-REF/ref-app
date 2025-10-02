import type { RowSelectionState } from "@tanstack/react-table";
import { type SetStateAction, useMemo, useState } from "react";
import type {
  MetricValue,
  SeriesValue,
} from "@/components/execution/values/types";

// Generic processed value type (supports MetricValue, SeriesValue, or other
// value shapes that include `dimensions`).
export type ProcessedValue<T> = T & { rowId: string };

export type ProcessedMetricValue = ProcessedValue<MetricValue>;
export type ProcessedSeriesValue = ProcessedValue<SeriesValue>;

export interface Filter {
  id: string;
  facetKey: string;
  values: string[];
}

/**
 * Generic hook props to allow processing of either MetricValue, SeriesValue,
 * or any object that has a `dimensions` map.
 */
interface UseValuesProcessorProps<
  T extends { dimensions: { [key: string]: unknown } },
> {
  initialValues: T[];
  loading: boolean;
  initialFilters?: Filter[];
  onFiltersChange?: (filters: Filter[]) => void;
}

/**
 * useValuesProcessor
 * - Generic hook that can process arrays of values that include a `dimensions` field.
 * - Returns processed values with a generated `rowId`, filtering by facets,
 *   exclusion handling, and row selection state.
 */
export function useValuesProcessor<
  T extends { dimensions: { [key: string]: unknown } },
>({
  initialValues,
  loading,
  initialFilters,
  onFiltersChange,
}: UseValuesProcessorProps<T>) {
  const [filters, setInternalFilters] = useState<Filter[]>(
    initialFilters || [],
  );
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(new Set());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const setFilters = (newFilters: SetStateAction<Filter[]>) => {
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

    // Ensure each value has a unique rowId
    return initialValues.map((v) => ({
      ...v,
      rowId: crypto.randomUUID(),
    })) as ProcessedValue<T>[];
  }, [initialValues]);

  const facetFilteredValues = useMemo(() => {
    if (loading && processedValues.length === 0) return [];

    const itemsToFilter = processedValues;
    if (filters.length === 0) {
      return itemsToFilter;
    }
    return itemsToFilter.filter((value) => {
      return filters.every((filter) => {
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
    return facetFilteredValues.filter(
      (value) => !excludedRowIds.has((value as any).rowId),
    );
  }, [facetFilteredValues, excludedRowIds]);

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
