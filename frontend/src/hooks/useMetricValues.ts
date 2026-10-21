import { useQuery } from "@tanstack/react-query";
import type { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { diagnosticsListMetricValues } from "@/client";
import type { MetricValueCollection } from "@/components/execution/values/types.ts";
import type { MetricFilter } from "@/components/explorer/types";
import {
  DEFAULT_PAGE_SIZE,
  filtersToSearch,
  searchToFilters,
} from "@/lib/valuesSearch";

// Define flexible API function types using any for compatibility
type FetchQueryOptions = (options: any) => any;
type FetchDownloadFunction = (options: any) => Promise<any>;

interface UseValuesTabOptions<
  TPath extends Record<string, any> = Record<string, any>,
> {
  // Path parameters - flexible to support different route patterns
  pathParams: TPath;
  search: Record<string, any>;
  valueType: "scalar" | "series";
  navigate: ReturnType<typeof useNavigate>;

  fetchQueryOptions: FetchQueryOptions;
  fetchDownload: FetchDownloadFunction;

  getDownloadFilename: (pathParams: TPath, valueType: string) => string;
}

// Parameters that should not be passed to the API query
// (offset and limit ARE passed to the API, so they are not excluded here)
const EXCLUDED_FROM_API = ["tab", "groupBy", "hue", "style"];

/** The search params passed on to the API, without the view params and unset params. */
function apiQuery(search: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(search).filter(
      ([key, value]) => value !== undefined && !EXCLUDED_FROM_API.includes(key),
    ),
  );
}

/**
 * Shared hook for values tabs (series and scalars).
 * Handles data fetching, filter management, and CSV downloads.
 */
export function useMetricValues<TPath extends Record<string, any>>({
  pathParams,
  search,
  valueType,
  navigate,
  fetchQueryOptions,
  fetchDownload = diagnosticsListMetricValues,
  getDownloadFilename,
}: UseValuesTabOptions<TPath>) {
  const query = apiQuery(search);

  // Fetch metric values using the provided query options function
  const { data: metricValues, isLoading } = useQuery(
    fetchQueryOptions({
      path: pathParams,
      query: { ...query, value_type: valueType },
    }),
  );

  const initialFilters = useMemo(() => searchToFilters(search), [search]);

  const handleFiltersChange = useCallback(
    (newFilters: MetricFilter[]) => {
      navigate({
        search: filtersToSearch(newFilters, search) as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle outlier detection changes (reset offset since total_count may change)
  const handleDetectOutliersChange = useCallback(
    (value: string) => {
      navigate({
        search: { ...search, detect_outliers: String(value), offset: 0 } as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle unverified inclusion changes (reset offset since total_count may change)
  const handleIncludeUnverifiedChange = useCallback(
    (value: boolean) => {
      navigate({
        search: {
          ...search,
          include_unverified: String(value),
          offset: 0,
        } as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle pagination offset changes
  const handleOffsetChange = useCallback(
    (newOffset: number) => {
      navigate({
        search: { ...search, offset: newOffset } as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle pagination limit changes
  const handleLimitChange = useCallback(
    (newLimit: number) => {
      navigate({
        search: { ...search, limit: newLimit, offset: 0 } as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle CSV download
  const handleDownload = useCallback(async () => {
    const response = await fetchDownload({
      path: pathParams,
      query: {
        format: "csv",
        value_type: valueType,
        ...query,
      },
      meta: {
        responseType: "text",
      },
    });
    const blob = new Blob([response.data as unknown as string], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getDownloadFilename(pathParams, valueType);
    a.click();
    window.URL.revokeObjectURL(url);
  }, [pathParams, valueType, query, fetchDownload, getDownloadFilename]);

  return {
    metricValues: metricValues as MetricValueCollection | undefined,
    isLoading,
    initialFilters,
    pagination: {
      offset: Number(search.offset) || 0,
      limit: Number(search.limit) || DEFAULT_PAGE_SIZE,
      totalCount:
        (metricValues as MetricValueCollection | undefined)?.total_count ?? 0,
      onOffsetChange: handleOffsetChange,
      onLimitChange: handleLimitChange,
    },
    handlers: {
      onFiltersChange: handleFiltersChange,
      onDetectOutliersChange: handleDetectOutliersChange,
      onIncludeUnverifiedChange: handleIncludeUnverifiedChange,
      onDownload: handleDownload,
    },
  };
}
