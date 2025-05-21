import type { MetricValue } from "@/client";
import type { RowSelectionState } from "@tanstack/react-table";
import { type SetStateAction, useMemo, useState } from "react";

// Define types used by the hook
export type ProcessedMetricValue = MetricValue & { rowId: string };

export interface Filter {
  id: string;
  facetKey: string;
  value: string;
}

interface UseValuesProcessorProps {
  initialValues: MetricValue[];
  loading: boolean;
}

export function useValuesProcessor({
  initialValues,
  loading,
}: UseValuesProcessorProps) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(new Set());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const handleExcludeRowIds = (excluded: SetStateAction<Set<string>>) => {
    // Reset the row selection when excluding rows
    setRowSelection({});

    setExcludedRowIds(excluded);
  };

  const processedValues = useMemo((): ProcessedMetricValue[] => {
    if (!initialValues) return [];

    // Ensure each value has a unique rowId
    return initialValues.map((v) => ({
      ...v,
      rowId: crypto.randomUUID(),
    }));
  }, [initialValues]);

  const facetFilteredValues = useMemo(() => {
    // Ensure processedValues is used, and loading check is appropriate
    if (loading && processedValues.length === 0) return [];

    const itemsToFilter = processedValues;
    if (filters.length === 0) {
      return itemsToFilter;
    }
    return itemsToFilter.filter((value) => {
      return filters.every((filter) => {
        const dimensionValue = value.dimensions[filter.facetKey];
        return String(dimensionValue) === filter.value;
      });
    });
  }, [processedValues, filters, loading]);

  const finalDisplayedValues = useMemo(() => {
    return facetFilteredValues.filter(
      (value) => !excludedRowIds.has(value.rowId),
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
