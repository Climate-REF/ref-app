import { useQuery } from "@tanstack/react-query";
import type { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { diagnosticsListMetricValues } from "@/client";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";
import type {
  MetricValue,
  MetricValueCollection,
  SeriesValue,
} from "@/components/execution/values/types.ts";

interface UseDiagnosticValuesTabOptions {
  providerSlug: string;
  diagnosticSlug: string;
  search: Record<string, any>;
  valueType: "scalar" | "series";
  navigate: ReturnType<typeof useNavigate>;
}

// Parameters that should not be treated as facet filters
const EXCLUDED_FROM_FACET_FILTERS = [
  "tab",
  "groupBy",
  "hue",
  "style",
  "detect_outliers",
  "include_unverified",
  "isolate_ids",
  "exclude_ids",
];

// Parameters that should not be passed to the API query
const EXCLUDED_FROM_API = ["tab", "groupBy", "hue", "style"];

/**
 * Shared hook for diagnostic values tabs (series and scalars).
 * Handles data fetching, filter management, and CSV downloads.
 */
export function useDiagnosticValuesTab({
  providerSlug,
  diagnosticSlug,
  search,
  valueType,
  navigate,
}: UseDiagnosticValuesTabOptions) {
  // Extract search values to prevent unnecessary callback recreation
  const {
    tab: searchTab,
    groupBy: searchGroupBy,
    hue: searchHue,
    style: searchStyle,
    detect_outliers: searchDetectOutliers,
    include_unverified: searchIncludeUnverified,
  } = search;

  // Fetch metric values
  const { data: metricValues, isLoading } = useQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: providerSlug,
        diagnostic_slug: diagnosticSlug,
      },
      query: {
        ...Object.fromEntries(
          Object.entries(search).filter(
            ([key, value]) =>
              value !== undefined && !EXCLUDED_FROM_API.includes(key),
          ),
        ),
        type: valueType,
      },
    }),
  );

  // Extract current filters (excluding UI params and ID filters)
  const currentFilters = useMemo(() => {
    const filtered = Object.fromEntries(
      Object.entries(search).filter(
        ([key, value]) =>
          value !== undefined && !EXCLUDED_FROM_FACET_FILTERS.includes(key),
      ),
    );
    return Object.fromEntries(
      Object.entries(filtered).filter(([, value]) => value !== undefined),
    ) as Record<string, string>;
  }, [search]);

  // State for grouping configuration
  const [currentGroupingConfig, setCurrentGroupingConfig] = useState({
    groupBy: search.groupBy,
    hue: search.hue,
    style: search.style,
  });

  // State for filtered data (used by series tab)
  const [filteredData, setFilteredData] = useState<
    (MetricValue | SeriesValue)[]
  >([]);

  // Build initial filters from URL search params
  const initialFilters = useMemo(() => {
    const facetFilters = Object.entries(search)
      .filter(
        ([key, value]) =>
          value !== undefined && !EXCLUDED_FROM_FACET_FILTERS.includes(key),
      )
      .map(([facetKey, value]) => ({
        type: "facet",
        id: crypto.randomUUID(),
        facetKey,
        values: (value as string)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }));

    const combinedFilters: any[] = [...facetFilters];

    // Parse isolate/exclude id params from URL
    if (search.isolate_ids) {
      const isolateIds = String(search.isolate_ids)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (isolateIds.length > 0) {
        combinedFilters.push({
          type: "isolate",
          id: crypto.randomUUID(),
          ids: new Set(isolateIds),
        });
      }
    }

    if (search.exclude_ids) {
      const excludeIds = String(search.exclude_ids)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (excludeIds.length > 0) {
        combinedFilters.push({
          type: "exclude",
          id: crypto.randomUUID(),
          ids: new Set(excludeIds),
        });
      }
    }

    return combinedFilters;
  }, [search]);

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: any[]) => {
      // Build facet filter params
      const facetFilters = (newFilters ?? []).filter((f) => f.type === "facet");
      const filterParams =
        facetFilters.length > 0
          ? Object.fromEntries(
              facetFilters.map((filter: any) => [
                filter.facetKey,
                filter.values.join(","),
              ]),
            )
          : {};

      // Collect isolate and exclude ids
      const isolateIds = (newFilters ?? [])
        .filter((f) => f.type === "isolate")
        .flatMap((f: any) => Array.from(f.ids ?? []));
      const excludeIds = (newFilters ?? [])
        .filter((f) => f.type === "exclude")
        .flatMap((f: any) => Array.from(f.ids ?? []));

      // Preserve tab, series visualization, and outlier parameters
      const otherParams: Record<string, string> = {
        ...(searchTab ? { tab: String(searchTab) } : {}),
        ...(searchGroupBy ? { groupBy: String(searchGroupBy) } : {}),
        ...(searchHue ? { hue: String(searchHue) } : {}),
        ...(searchStyle ? { style: String(searchStyle) } : {}),
        ...(searchDetectOutliers !== undefined
          ? { detect_outliers: String(searchDetectOutliers) }
          : {}),
        ...(searchIncludeUnverified !== undefined
          ? { include_unverified: String(searchIncludeUnverified) }
          : {}),
      };

      // Add isolate/exclude params if present
      if (isolateIds.length > 0) {
        otherParams.isolate_ids = isolateIds.join(",");
      }
      if (excludeIds.length > 0) {
        otherParams.exclude_ids = excludeIds.join(",");
      }

      navigate({
        search: { ...filterParams, ...otherParams } as any,
        replace: true,
      });
    },
    [
      searchTab,
      searchGroupBy,
      searchHue,
      searchStyle,
      searchDetectOutliers,
      searchIncludeUnverified,
      navigate,
    ],
  );

  // Handle outlier detection changes
  const handleDetectOutliersChange = useCallback(
    (value: string) => {
      navigate({
        search: { ...search, detect_outliers: String(value) } as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle unverified inclusion changes
  const handleIncludeUnverifiedChange = useCallback(
    (value: boolean) => {
      navigate({
        search: { ...search, include_unverified: String(value) } as any,
        replace: true,
      });
    },
    [search, navigate],
  );

  // Handle grouping config changes
  const handleCurrentGroupingChange = useCallback(
    (groupingConfig: { groupBy?: string; hue?: string; style?: string }) => {
      setCurrentGroupingConfig({
        groupBy: groupingConfig.groupBy,
        hue: groupingConfig.hue,
        style: groupingConfig.style,
      });
    },
    [],
  );

  // Handle filtered data changes (for series tab)
  const handleFilteredDataChange = useCallback(
    (data: (MetricValue | SeriesValue)[]) => {
      setFilteredData(data);
    },
    [],
  );

  // Handle CSV download
  const handleDownload = useCallback(async () => {
    const response = await diagnosticsListMetricValues({
      path: {
        provider_slug: providerSlug,
        diagnostic_slug: diagnosticSlug,
      },
      query: {
        format: "csv",
        ...Object.fromEntries(
          Object.entries(search).filter(
            ([key, value]) =>
              value !== undefined && !EXCLUDED_FROM_API.includes(key),
          ),
        ),
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
    a.download = `metric-values-${providerSlug}-${diagnosticSlug}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [providerSlug, diagnosticSlug, search]);

  // Extract isolate/exclude IDs from search params
  const isolateIds = search.isolate_ids
    ? String(search.isolate_ids).split(",").filter(Boolean).join(",")
    : undefined;
  const excludeIds = search.exclude_ids
    ? String(search.exclude_ids).split(",").filter(Boolean).join(",")
    : undefined;

  return {
    metricValues: metricValues as MetricValueCollection | undefined,
    isLoading,
    currentFilters,
    currentGroupingConfig,
    filteredData,
    initialFilters,
    isolateIds,
    excludeIds,
    handlers: {
      onFiltersChange: handleFiltersChange,
      onDetectOutliersChange: handleDetectOutliersChange,
      onIncludeUnverifiedChange: handleIncludeUnverifiedChange,
      onCurrentGroupingChange: handleCurrentGroupingChange,
      onFilteredDataChange: handleFilteredDataChange,
      onDownload: handleDownload,
    },
  };
}
